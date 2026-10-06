-- ============================================================================
-- Catalog features: product variants and specs, variant-aware orders, and
-- customer saved items.
--
-- Paste this whole file into the Supabase SQL editor and Run. Safe to re-run.
-- Run it AFTER supabase/launch-features.sql: it replaces create_order and
-- update_order_status with versions that understand variants, so always keep
-- that order (supabase/schema.sql already contains both, in order).
-- ============================================================================


-- ============================================================================
-- 1. Product specs and variants
-- ============================================================================

-- Specs are a list of {label, value} rows shown on the product page.
alter table public.products
  add column if not exists specs jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_specs_is_array') then
    alter table public.products
      add constraint products_specs_is_array check (jsonb_typeof(specs) = 'array');
  end if;
end $$;

create table if not exists public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,
  label            text not null check (char_length(btrim(label)) between 1 and 80),
  sku_suffix       text not null default '',
  price_adjustment numeric(12,2) not null default 0,
  stock_qty        integer not null default 0 check (stock_qty >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (product_id, label)
);

create index if not exists idx_product_variants_product on public.product_variants(product_id);

alter table public.product_variants enable row level security;

-- Visible wherever the product is visible (the products policy still applies
-- inside this check); suppliers also see their own inactive options.
drop policy if exists "variants follow product visibility" on public.product_variants;
create policy "variants follow product visibility" on public.product_variants for select
  using (
    exists (select 1 from public.products p where p.id = product_variants.product_id)
    and (
      is_active
      or exists (select 1 from public.products p
                 where p.id = product_variants.product_id and p.supplier_id = auth.uid())
    )
  );

drop policy if exists "supplier manages own variants" on public.product_variants;
create policy "supplier manages own variants" on public.product_variants for all
  using (exists (select 1 from public.products p
                 where p.id = product_variants.product_id and p.supplier_id = auth.uid()))
  with check (exists (select 1 from public.products p
                      where p.id = product_variants.product_id and p.supplier_id = auth.uid()));


-- ============================================================================
-- 2. Order items remember which option was bought and its price adjustment, so
--    commission and supplier payout stay exact even if the option changes later.
-- ============================================================================

alter table public.order_items
  add column if not exists variant_id         uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_label      text,
  add column if not exists variant_adjustment numeric(12,2) not null default 0;


-- ============================================================================
-- 3. create_order with variants. Items look like
--    {"productId": "...", "quantity": 2, "variantId": "..."} (variantId optional).
-- ============================================================================

-- Resolves one cart line to its server-side price. Internal helper.
create or replace function public.resolve_order_line(
  p_dropshipper_id uuid,
  p_product_id     uuid,
  p_variant_id     uuid,
  p_qty            int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price   numeric;
  v_var     public.product_variants;
  v_adj     numeric := 0;
  v_label   text;
  v_unit    numeric;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'Invalid quantity for product %', p_product_id;
  end if;

  select custom_price into v_price
  from public.dropshipper_products
  where dropshipper_id = p_dropshipper_id and product_id = p_product_id and is_published;

  if v_price is null or v_price <= 0 then
    raise exception 'Product % is not available in this store', p_product_id;
  end if;

  if p_variant_id is not null then
    select * into v_var from public.product_variants where id = p_variant_id;
    if v_var.id is null or v_var.product_id <> p_product_id then
      raise exception 'That option is no longer available.';
    end if;
    if not v_var.is_active or v_var.stock_qty < p_qty then
      raise exception '% is out of stock.', v_var.label;
    end if;
    v_adj := v_var.price_adjustment;
    v_label := v_var.label;
  elsif exists (select 1 from public.product_variants where product_id = p_product_id and is_active) then
    raise exception 'Please choose an option (size, colour, etc.) for this product.';
  end if;

  v_unit := v_price + v_adj;
  if v_unit <= 0 then
    raise exception 'Product % is not available in this store', p_product_id;
  end if;

  return jsonb_build_object(
    'unitPrice', v_unit,
    'adjustment', v_adj,
    'variantId', p_variant_id,
    'variantLabel', v_label
  );
end;
$$;

revoke all on function public.resolve_order_line(uuid, uuid, uuid, int) from public, anon, authenticated;

create or replace function public.create_order(
  p_dropshipper_id          uuid,
  p_customer_name           text,
  p_customer_phone          text,
  p_customer_region         text,
  p_customer_city           text,
  p_customer_ghana_post_gps text,
  p_items                   jsonb,
  p_notes                   text default null,
  p_platform_fee_percent    numeric default 2
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order      public.orders;
  v_item       jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_qty        int;
  v_line       jsonb;
  v_subtotal   numeric := 0;
  v_fee        numeric;
  v_quote      jsonb;
  v_delivery   numeric;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to place an order.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if not public.is_valid_ghana_post_gps(p_customer_ghana_post_gps) then
    raise exception 'Enter a valid GhanaPost GPS address, like GA-184-9022.';
  end if;

  v_quote := public.get_delivery_quote(p_customer_region, p_customer_city);
  if v_quote is null then
    raise exception 'Delivery is not available to that region yet. Please choose another region.';
  end if;
  v_delivery := (v_quote->>'fee')::numeric;

  -- Validate every line and total it using server-side prices.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_variant_id := nullif(v_item->>'variantId', '')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_line := public.resolve_order_line(p_dropshipper_id, v_product_id, v_variant_id, v_qty);
    v_subtotal := v_subtotal + (v_line->>'unitPrice')::numeric * v_qty;
  end loop;

  v_fee := round(v_subtotal * p_platform_fee_percent / 100, 2);

  insert into public.orders (
    dropshipper_id, customer_id, customer_name, customer_phone,
    customer_region, customer_city, customer_ghana_post_gps,
    status, subtotal, platform_fee, delivery_fee,
    delivery_min_days, delivery_max_days, total, notes, order_number
  ) values (
    p_dropshipper_id, auth.uid(), btrim(p_customer_name), btrim(p_customer_phone),
    btrim(p_customer_region), btrim(p_customer_city),
    public.normalize_ghana_post_gps(p_customer_ghana_post_gps),
    'pending', v_subtotal, v_fee, v_delivery,
    (v_quote->>'minDays')::int, (v_quote->>'maxDays')::int,
    v_subtotal + v_fee + v_delivery, p_notes,
    'LDK-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0')
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_variant_id := nullif(v_item->>'variantId', '')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_line := public.resolve_order_line(p_dropshipper_id, v_product_id, v_variant_id, v_qty);

    insert into public.order_items (
      order_id, product_id, quantity, unit_price, subtotal,
      variant_id, variant_label, variant_adjustment
    ) values (
      v_order.id, v_product_id, v_qty,
      (v_line->>'unitPrice')::numeric,
      round((v_line->>'unitPrice')::numeric * v_qty, 2),
      v_variant_id, v_line->>'variantLabel', (v_line->>'adjustment')::numeric
    );
  end loop;

  return v_order;
end;
$$;

revoke all on function public.create_order(uuid, text, text, text, text, text, jsonb, text, numeric) from public, anon;
grant execute on function public.create_order(uuid, text, text, text, text, text, jsonb, text, numeric) to authenticated;


-- ============================================================================
-- 4. update_order_status: commission and supplier payout include the option's
--    price adjustment (the supplier's cost for that option is cost + adjustment).
--    Otherwise identical to the launch-features version.
-- ============================================================================

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status   text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_before         public.orders;
  v_order          public.orders;
  v_is_admin       boolean;
  v_is_participant boolean;
  v_commission     numeric;
  v_payout_row     record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_status not in ('confirmed','processing','shipped','delivered','cancelled','refunded') then
    raise exception 'Invalid status %', p_status;
  end if;

  select * into v_before from public.orders where id = p_order_id for update;
  if v_before is null then
    raise exception 'Order not found';
  end if;

  v_is_admin := public.app_user_role() = 'admin';

  select
    v_before.dropshipper_id = v_uid
    or v_is_admin
    or exists (
      select 1 from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = v_before.id and p.supplier_id = v_uid
    )
  into v_is_participant;

  if not v_is_participant then
    raise exception 'Not authorized to update this order';
  end if;

  if v_before.status in ('cancelled', 'refunded') then
    raise exception 'This order is already closed.';
  end if;
  if p_status = 'refunded' and not v_is_admin then
    raise exception 'Refunds are issued by an administrator. Ask the customer to request one, or open a support ticket.';
  end if;
  if p_status = 'cancelled' and v_before.earnings_credited and not v_is_admin then
    raise exception 'This order has already shipped and can only be cancelled by an administrator.';
  end if;

  update public.orders
  set status       = p_status,
      updated_at   = now(),
      shipped_at   = case when p_status in ('shipped', 'delivered') and shipped_at is null then now() else shipped_at end,
      delivered_at = case when p_status = 'delivered' and delivered_at is null then now() else delivered_at end,
      cancelled_at = case when p_status in ('cancelled', 'refunded') then now() else cancelled_at end
  where id = p_order_id
  returning * into v_order;

  if p_status in ('shipped', 'delivered') and not v_before.earnings_credited then
    select coalesce(sum((oi.unit_price - p.cost_price - oi.variant_adjustment) * oi.quantity), 0)
    into v_commission
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order.id;

    if v_commission > 0 then
      perform public.wallet_credit(
        v_order.dropshipper_id, v_commission,
        'Commission for order ' || coalesce(v_order.order_number, left(v_order.id::text, 8)),
        'commission'
      );
    end if;

    for v_payout_row in
      select p.supplier_id as supplier_id, sum((p.cost_price + oi.variant_adjustment) * oi.quantity) as payout
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = v_order.id
      group by p.supplier_id
    loop
      if v_payout_row.payout > 0 then
        perform public.wallet_credit(
          v_payout_row.supplier_id, v_payout_row.payout,
          'Payout for order ' || coalesce(v_order.order_number, left(v_order.id::text, 8)),
          'credit'
        );
      end if;
    end loop;

    update public.orders set earnings_credited = true where id = v_order.id
    returning * into v_order;
  end if;

  if p_status in ('cancelled', 'refunded') and v_before.earnings_credited then
    perform public.reverse_order_earnings(v_order.id);
    select * into v_order from public.orders where id = v_order.id;
  end if;

  return v_order;
end;
$$;

grant execute on function public.update_order_status(uuid, text) to authenticated;


-- ============================================================================
-- 5. Saved items (a customer's own "save for later" list)
-- ============================================================================

create table if not exists public.saved_items (
  user_id              uuid not null references public.users(id) on delete cascade,
  dropshipper_product_id uuid not null references public.dropshipper_products(id) on delete cascade,
  created_at           timestamptz not null default now(),
  primary key (user_id, dropshipper_product_id)
);

create index if not exists idx_saved_items_user on public.saved_items(user_id, created_at desc);

alter table public.saved_items enable row level security;

drop policy if exists "owner manages saved items" on public.saved_items;
create policy "owner manages saved items" on public.saved_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Keep one person's list to a sensible size.
create or replace function public.limit_saved_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.saved_items where user_id = new.user_id) >= 200 then
    raise exception 'You can save up to 200 items. Remove some to save more.';
  end if;
  return new;
end;
$$;

revoke all on function public.limit_saved_items() from public, anon, authenticated;

drop trigger if exists limit_saved_items on public.saved_items;
create trigger limit_saved_items
  before insert on public.saved_items
  for each row execute function public.limit_saved_items();

notify pgrst, 'reload schema';
