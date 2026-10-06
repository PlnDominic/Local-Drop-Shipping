-- ============================================================================
-- Launch features: GhanaPost GPS validation, delivery fees, cancellations and
-- refunds, supplier verification, support tickets and receipts.
--
-- Paste this whole file into the Supabase SQL editor and Run. Safe to re-run.
-- Requires the base schema (supabase/schema.sql) to be applied first.
-- ============================================================================


-- ============================================================================
-- 1. GhanaPost GPS addresses (e.g. GA-184-9022)
-- ============================================================================

create or replace function public.is_valid_ghana_post_gps(p text)
returns boolean
language sql
immutable
as $$
  select p is not null
     and upper(regexp_replace(btrim(p), '\s+', '', 'g')) ~ '^[A-Z]{2,3}-?[0-9]{3,4}-?[0-9]{4}$';
$$;

create or replace function public.normalize_ghana_post_gps(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null or btrim(p) = '' then null
    else regexp_replace(
      upper(regexp_replace(btrim(p), '\s+', '', 'g')),
      '^([A-Z]{2,3})-?([0-9]{3,4})-?([0-9]{4})$', '\1-\2-\3')
  end;
$$;


-- ============================================================================
-- 2. Delivery zones: fee and delivery time by region (and optionally city).
--    The fee numbers seeded below are PLACEHOLDERS. Review and edit them in the
--    admin dashboard (Delivery tab) before launch.
-- ============================================================================

create table if not exists public.delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  region     text not null check (char_length(btrim(region)) > 0),
  city       text,
  fee        numeric(10,2) not null check (fee >= 0),
  min_days   integer not null default 1 check (min_days >= 0),
  max_days   integer not null default 3,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_days >= min_days)
);

-- One row per region, plus at most one per (region, city).
create unique index if not exists idx_delivery_zones_key
  on public.delivery_zones (lower(region), (coalesce(lower(city), '')));

alter table public.delivery_zones enable row level security;

drop policy if exists "active delivery zones are public" on public.delivery_zones;
create policy "active delivery zones are public" on public.delivery_zones for select
  using (is_active or public.app_user_role() = 'admin');

drop policy if exists "admin manages delivery zones" on public.delivery_zones;
create policy "admin manages delivery zones" on public.delivery_zones for all
  using (public.app_user_role() = 'admin')
  with check (public.app_user_role() = 'admin');

insert into public.delivery_zones (region, city, fee, min_days, max_days) values
  ('Greater Accra', null, 25, 1, 2),
  ('Ashanti',       null, 35, 2, 3),
  ('Central',       null, 35, 2, 3),
  ('Eastern',       null, 35, 2, 3),
  ('Western',       null, 40, 3, 4),
  ('Western North', null, 45, 3, 5),
  ('Volta',         null, 40, 3, 4),
  ('Oti',           null, 50, 4, 5),
  ('Bono',          null, 45, 3, 5),
  ('Bono East',     null, 45, 3, 5),
  ('Ahafo',         null, 45, 3, 5),
  ('Northern',      null, 60, 4, 6),
  ('Savannah',      null, 60, 4, 6),
  ('North East',    null, 65, 5, 7),
  ('Upper East',    null, 65, 5, 7),
  ('Upper West',    null, 65, 5, 7)
on conflict (lower(region), (coalesce(lower(city), ''))) do nothing;

-- Best matching active zone: a city rate wins over the region default.
-- Returns null when the region isn't served.
create or replace function public.get_delivery_quote(p_region text, p_city text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(q) from (
    select fee,
           min_days as "minDays",
           max_days as "maxDays",
           (city is not null) as "cityRate"
    from public.delivery_zones
    where is_active
      and lower(region) = lower(btrim(coalesce(p_region, '')))
      and (city is null or lower(city) = lower(btrim(coalesce(p_city, ''))))
    order by (city is not null) desc
    limit 1
  ) q;
$$;

grant execute on function public.get_delivery_quote(text, text) to anon, authenticated;


-- ============================================================================
-- 3. Orders: customer link, delivery fee, lifecycle timestamps
-- ============================================================================

alter table public.orders
  add column if not exists customer_id        uuid references public.users(id) on delete set null,
  add column if not exists delivery_fee       numeric(12,2) not null default 0,
  add column if not exists delivery_min_days  integer,
  add column if not exists delivery_max_days  integer,
  add column if not exists shipped_at         timestamptz,
  add column if not exists delivered_at       timestamptz,
  add column if not exists cancelled_at       timestamptz,
  add column if not exists earnings_credited  boolean not null default false,
  add column if not exists receipt_emailed_at timestamptz;

create index if not exists idx_orders_customer on public.orders(customer_id);

-- Orders that already shipped had their commission/payouts credited.
update public.orders set earnings_credited = true
where status in ('shipped', 'delivered') and not earnings_credited;

-- Fix: the original orders and order_items policies referred to each other,
-- which makes Postgres fail every normal read with "infinite recursion detected
-- in policy". These SECURITY DEFINER helpers look rows up without re-entering
-- row-level security, which breaks the loop.
create or replace function public.order_belongs_to_user(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (o.dropshipper_id = auth.uid()
           or o.customer_id = auth.uid()
           or public.app_user_role() = 'admin')
  );
$$;

create or replace function public.supplier_has_item_in_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id and p.supplier_id = auth.uid()
  );
$$;

revoke all on function public.order_belongs_to_user(uuid) from public, anon;
revoke all on function public.supplier_has_item_in_order(uuid) from public, anon;
grant execute on function public.order_belongs_to_user(uuid) to authenticated;
grant execute on function public.supplier_has_item_in_order(uuid) to authenticated;

-- Customers see their own orders; stores and admins keep their existing access.
drop policy if exists "customer reads own orders" on public.orders;
create policy "customer reads own orders" on public.orders for select
  using (customer_id = auth.uid());

drop policy if exists "supplier reads orders with their products" on public.orders;
create policy "supplier reads orders with their products" on public.orders for select
  using (public.supplier_has_item_in_order(id));

-- Items follow the visibility of their order (customer, store, admin).
drop policy if exists "order items follow order visibility" on public.order_items;
create policy "order items follow order visibility" on public.order_items for select
  using (public.order_belongs_to_user(order_id));

drop policy if exists "customer reads own order items" on public.order_items;

-- True when the signed-in user is the customer, the store owner or a supplier
-- of an item on the order (or an admin).
create or replace function public.is_order_participant(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (
        o.customer_id = auth.uid()
        or o.dropshipper_id = auth.uid()
        or public.app_user_role() = 'admin'
        or exists (
          select 1 from public.order_items oi
          join public.products p on p.id = oi.product_id
          where oi.order_id = o.id and p.supplier_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.is_order_participant(uuid) from public, anon;
grant execute on function public.is_order_participant(uuid) to authenticated;


-- ============================================================================
-- 4. Wallet debit used to reverse earnings (balance may go negative so a
--    refund after a withdrawal is recovered from future earnings).
-- ============================================================================

create or replace function public.wallet_debit(
  p_user_id uuid,
  p_amount  numeric,
  p_description text,
  p_type    text default 'refund'
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Debit amount must be positive';
  end if;

  insert into public.wallets (user_id) values (p_user_id) on conflict (user_id) do nothing;

  update public.wallets
  set balance = balance - p_amount,
      total_earned = greatest(total_earned - p_amount, 0),
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.wallet_transactions (user_id, type, amount, description, balance_after)
  values (p_user_id, p_type, -p_amount, p_description, v_balance);

  return v_balance;
end;
$$;

revoke all on function public.wallet_debit(uuid, numeric, text, text) from public, anon, authenticated;

-- Takes back exactly what was credited for this order (commission + payouts).
create or replace function public.reverse_order_earnings(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_label text;
  r       record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null or not v_order.earnings_credited then
    return;
  end if;

  v_label := coalesce(v_order.order_number, left(v_order.id::text, 8));

  for r in
    select user_id, sum(amount) as amt
    from public.wallet_transactions
    where description in ('Commission for order ' || v_label, 'Payout for order ' || v_label)
      and type in ('commission', 'credit')
    group by user_id
  loop
    if r.amt > 0 then
      perform public.wallet_debit(r.user_id, r.amt, 'Reversal for order ' || v_label, 'refund');
    end if;
  end loop;

  update public.orders set earnings_credited = false where id = p_order_id;
end;
$$;

revoke all on function public.reverse_order_earnings(uuid) from public, anon, authenticated;


-- ============================================================================
-- 5. create_order: validates the GhanaPost GPS address, charges the delivery
--    fee for the customer's region/city, and links the order to the customer.
-- ============================================================================

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
  v_qty        int;
  v_price      numeric;
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

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select custom_price into v_price
    from public.dropshipper_products
    where dropshipper_id = p_dropshipper_id and product_id = v_product_id;

    if v_price is null or v_price <= 0 then
      raise exception 'Product % is not available in this store', v_product_id;
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
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
    v_qty        := (v_item->>'quantity')::int;
    select custom_price into v_price
    from public.dropshipper_products
    where dropshipper_id = p_dropshipper_id and product_id = v_product_id;

    insert into public.order_items (order_id, product_id, quantity, unit_price, subtotal)
    values (v_order.id, v_product_id, v_qty, v_price, round(v_price * v_qty, 2));
  end loop;

  return v_order;
end;
$$;

revoke all on function public.create_order(uuid, text, text, text, text, text, jsonb, text, numeric) from public, anon;
grant execute on function public.create_order(uuid, text, text, text, text, text, jsonb, text, numeric) to authenticated;


-- ============================================================================
-- 6. update_order_status: records shipped/delivered times, credits earnings
--    once, blocks changes to closed orders, and reverses earnings on
--    cancellation/refund. Only admins can refund or cancel a shipped order.
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

  -- Credit the dropshipper's commission and each supplier's payout exactly once.
  if p_status in ('shipped', 'delivered') and not v_before.earnings_credited then
    select coalesce(sum((oi.unit_price - p.cost_price) * oi.quantity), 0)
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
      select p.supplier_id as supplier_id, sum(p.cost_price * oi.quantity) as payout
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

  -- Cancelling or refunding a shipped order takes the earnings back.
  if p_status in ('cancelled', 'refunded') and v_before.earnings_credited then
    perform public.reverse_order_earnings(v_order.id);
    select * into v_order from public.orders where id = v_order.id;
  end if;

  return v_order;
end;
$$;

grant execute on function public.update_order_status(uuid, text) to authenticated;


-- ============================================================================
-- 7. Customer cancellations and refund requests
-- ============================================================================

-- Customers cancel their own order for free until it starts processing.
create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'Please sign in.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null or v_order.customer_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;
  if v_order.status not in ('pending', 'confirmed') then
    raise exception 'This order can no longer be cancelled here. Open a support ticket and we will help.';
  end if;

  update public.orders
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now(),
      notes = case
        when nullif(btrim(p_reason), '') is null then notes
        else coalesce(notes || E'\n', '') || 'Cancelled by customer: ' || left(btrim(p_reason), 300)
      end
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.cancel_order(uuid, text) to authenticated;

create table if not exists public.refund_requests (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders(id) on delete cascade,
  requested_by         uuid references public.users(id) on delete set null,
  kind                 text not null check (kind in ('return', 'not_received')),
  reason               text not null check (char_length(reason) between 10 and 1000),
  status               text not null default 'requested'
                         check (status in ('requested', 'approved', 'rejected', 'completed')),
  refund_amount        numeric(12,2),
  admin_note           text,
  resolved_by          uuid references public.users(id) on delete set null,
  resolved_at          timestamptz,
  customer_refunded_at timestamptz,
  created_at           timestamptz not null default now()
);

-- At most one open request per order.
create unique index if not exists idx_refund_one_open
  on public.refund_requests(order_id) where status in ('requested', 'approved');
create index if not exists idx_refund_status on public.refund_requests(status, created_at desc);

alter table public.refund_requests enable row level security;

drop policy if exists "refund requests visible to participants" on public.refund_requests;
create policy "refund requests visible to participants" on public.refund_requests for select
  using (
    requested_by = auth.uid()
    or public.app_user_role() = 'admin'
    or exists (select 1 from public.orders o where o.id = refund_requests.order_id and o.dropshipper_id = auth.uid())
  );

-- The return window (7 days after delivery) matches POLICY.returnWindowDays in lib/site.ts.
create or replace function public.request_refund(p_order_id uuid, p_kind text, p_reason text)
returns public.refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_req   public.refund_requests;
begin
  if auth.uid() is null then
    raise exception 'Please sign in.';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order is null or v_order.customer_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;

  if p_kind not in ('return', 'not_received') then
    raise exception 'Invalid request type';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'Please describe the problem (at least 10 characters).';
  end if;
  if v_order.status not in ('shipped', 'delivered') then
    raise exception 'Refunds can be requested after an order has shipped. Pending orders can be cancelled instead.';
  end if;
  if p_kind = 'not_received' and v_order.status <> 'shipped' then
    raise exception '"Not received" only applies to orders that are still marked shipped.';
  end if;
  if p_kind = 'return' and v_order.status <> 'delivered' then
    raise exception 'Returns can be requested once the order is marked delivered.';
  end if;
  if v_order.status = 'delivered'
     and now() > coalesce(v_order.delivered_at, v_order.updated_at) + interval '7 days' then
    raise exception 'The 7-day return window for this order has passed. Please open a support ticket.';
  end if;

  begin
    insert into public.refund_requests (order_id, requested_by, kind, reason, refund_amount)
    values (p_order_id, auth.uid(), p_kind, btrim(p_reason), v_order.total)
    returning * into v_req;
  exception when unique_violation then
    raise exception 'There is already an open request for this order.';
  end;

  return v_req;
end;
$$;

grant execute on function public.request_refund(uuid, text, text) to authenticated;

-- Admin decision. Approving refunds the order (earnings are taken back from the
-- dropshipper and suppliers); rejecting needs a note for the customer.
create or replace function public.resolve_refund(
  p_request_id       uuid,
  p_approve          boolean,
  p_note             text default null,
  p_include_delivery boolean default true
)
returns public.refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req    public.refund_requests;
  v_order  public.orders;
  v_amount numeric;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can resolve refund requests.';
  end if;

  select * into v_req from public.refund_requests where id = p_request_id for update;
  if v_req is null then
    raise exception 'Request not found';
  end if;
  if v_req.status <> 'requested' then
    raise exception 'This request has already been resolved.';
  end if;

  if not p_approve then
    if nullif(btrim(p_note), '') is null then
      raise exception 'Please give the customer a reason for rejecting.';
    end if;
    update public.refund_requests
    set status = 'rejected', admin_note = btrim(p_note), resolved_by = auth.uid(), resolved_at = now()
    where id = p_request_id
    returning * into v_req;
    return v_req;
  end if;

  select * into v_order from public.orders where id = v_req.order_id for update;
  v_amount := v_order.subtotal + v_order.platform_fee
              + case when p_include_delivery then v_order.delivery_fee else 0 end;

  update public.refund_requests
  set status = 'approved', refund_amount = v_amount, admin_note = nullif(btrim(p_note), ''),
      resolved_by = auth.uid(), resolved_at = now()
  where id = p_request_id
  returning * into v_req;

  perform public.reverse_order_earnings(v_order.id);

  update public.orders
  set status = 'refunded', cancelled_at = now(), updated_at = now()
  where id = v_order.id;

  return v_req;
end;
$$;

grant execute on function public.resolve_refund(uuid, boolean, text, boolean) to authenticated;

-- Admin records that the customer has been paid back (mobile money, etc.).
create or replace function public.complete_refund(p_request_id uuid, p_note text default null)
returns public.refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.refund_requests;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can complete refunds.';
  end if;

  update public.refund_requests
  set status = 'completed',
      customer_refunded_at = now(),
      admin_note = coalesce(nullif(btrim(p_note), ''), admin_note)
  where id = p_request_id and status = 'approved'
  returning * into v_req;

  if v_req is null then
    raise exception 'Only approved requests can be marked as paid back.';
  end if;
  return v_req;
end;
$$;

grant execute on function public.complete_refund(uuid, text) to authenticated;


-- ============================================================================
-- 8. Supplier verification (Ghana Card + business documents)
-- ============================================================================

alter table public.supplier_profiles
  add column if not exists is_verified boolean not null default false;

-- Approval, rating and the Verified badge can only be set by admins.
create or replace function public.guard_supplier_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.app_user_role() = 'admin' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_approved := false;
    new.is_verified := false;
    new.rating := 0;
  else
    new.is_approved := old.is_approved;
    new.is_verified := old.is_verified;
    new.rating := old.rating;
  end if;
  return new;
end;
$$;

create table if not exists public.supplier_verifications (
  supplier_id           uuid primary key references public.supplier_profiles(id) on delete cascade,
  ghana_card_number     text not null check (ghana_card_number ~ '^GHA-[0-9]{9}-[0-9]$'),
  business_reg_number   text,
  ghana_card_front_path text not null,
  ghana_card_back_path  text,
  business_doc_path     text,
  status                text not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
  rejection_reason      text,
  submitted_at          timestamptz not null default now(),
  reviewed_at           timestamptz,
  reviewed_by           uuid references public.users(id) on delete set null
);

alter table public.supplier_verifications enable row level security;

drop policy if exists "supplier reads own verification" on public.supplier_verifications;
create policy "supplier reads own verification" on public.supplier_verifications for select
  using (supplier_id = auth.uid() or public.app_user_role() = 'admin');

-- Private bucket for the documents: <user_id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-documents', 'supplier-documents', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owner or admin reads supplier documents" on storage.objects;
create policy "owner or admin reads supplier documents" on storage.objects for select
  using (
    bucket_id = 'supplier-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.app_user_role() = 'admin')
  );

drop policy if exists "owner uploads supplier documents" on storage.objects;
create policy "owner uploads supplier documents" on storage.objects for insert
  with check (bucket_id = 'supplier-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owner deletes supplier documents" on storage.objects;
create policy "owner deletes supplier documents" on storage.objects for delete
  using (bucket_id = 'supplier-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.submit_supplier_verification(
  p_ghana_card_number   text,
  p_business_reg_number text,
  p_front_path          text,
  p_back_path           text default null,
  p_business_doc_path   text default null
)
returns public.supplier_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_card text := upper(regexp_replace(btrim(coalesce(p_ghana_card_number, '')), '\s+', '', 'g'));
  v_row  public.supplier_verifications;
begin
  if v_uid is null then
    raise exception 'Please sign in.';
  end if;
  if not exists (select 1 from public.supplier_profiles where id = v_uid) then
    raise exception 'Create your supplier profile first.';
  end if;
  if v_card !~ '^GHA-[0-9]{9}-[0-9]$' then
    raise exception 'Enter your Ghana Card number like GHA-123456789-0.';
  end if;
  if p_front_path is null or p_front_path not like v_uid::text || '/%' then
    raise exception 'Please upload a photo of the front of your Ghana Card.';
  end if;
  if (p_back_path is not null and p_back_path not like v_uid::text || '/%')
     or (p_business_doc_path is not null and p_business_doc_path not like v_uid::text || '/%') then
    raise exception 'Invalid document upload.';
  end if;
  if exists (select 1 from public.supplier_verifications where supplier_id = v_uid and status = 'approved') then
    raise exception 'You are already verified.';
  end if;

  insert into public.supplier_verifications (
    supplier_id, ghana_card_number, business_reg_number,
    ghana_card_front_path, ghana_card_back_path, business_doc_path,
    status, rejection_reason, submitted_at, reviewed_at, reviewed_by
  ) values (
    v_uid, v_card, nullif(btrim(p_business_reg_number), ''),
    p_front_path, p_back_path, p_business_doc_path,
    'pending', null, now(), null, null
  )
  on conflict (supplier_id) do update set
    ghana_card_number = excluded.ghana_card_number,
    business_reg_number = excluded.business_reg_number,
    ghana_card_front_path = excluded.ghana_card_front_path,
    ghana_card_back_path = excluded.ghana_card_back_path,
    business_doc_path = excluded.business_doc_path,
    status = 'pending',
    rejection_reason = null,
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.submit_supplier_verification(text, text, text, text, text) to authenticated;

create or replace function public.review_supplier_verification(
  p_supplier_id uuid,
  p_approve     boolean,
  p_reason      text default null
)
returns public.supplier_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.supplier_verifications;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can review verifications.';
  end if;
  if not p_approve and nullif(btrim(p_reason), '') is null then
    raise exception 'Please tell the supplier what to fix.';
  end if;

  update public.supplier_verifications
  set status = case when p_approve then 'approved' else 'rejected' end,
      rejection_reason = case when p_approve then null else btrim(p_reason) end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where supplier_id = p_supplier_id and status = 'pending'
  returning * into v_row;

  if v_row is null then
    raise exception 'No pending verification found for this supplier.';
  end if;

  update public.supplier_profiles
  set is_verified = p_approve, updated_at = now()
  where id = p_supplier_id;

  return v_row;
end;
$$;

grant execute on function public.review_supplier_verification(uuid, boolean, text) to authenticated;


-- ============================================================================
-- 9. Support and dispute tickets
-- ============================================================================

create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  ticket_number   text not null unique,
  created_by      uuid not null references public.users(id) on delete cascade,
  order_id        uuid references public.orders(id) on delete set null,
  category        text not null default 'other'
                    check (category in ('order', 'delivery', 'payment', 'refund', 'product', 'account', 'other')),
  subject         text not null check (char_length(btrim(subject)) between 3 and 120),
  status          text not null default 'open'
                    check (status in ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  author_id   uuid references public.users(id) on delete set null,
  author_name text not null default '',
  author_role text not null default 'customer',
  body        text not null check (char_length(btrim(body)) between 1 and 4000),
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_tickets_creator on public.support_tickets(created_by, last_message_at desc);
create index if not exists idx_tickets_order on public.support_tickets(order_id);
create index if not exists idx_tickets_status on public.support_tickets(status, last_message_at desc);
create index if not exists idx_ticket_messages_ticket on public.ticket_messages(ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;

-- Creator, admin, or anyone taking part in the linked order.
create or replace function public.can_access_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = p_ticket_id
      and (
        t.created_by = auth.uid()
        or public.app_user_role() = 'admin'
        or (t.order_id is not null and public.is_order_participant(t.order_id))
      )
  );
$$;

revoke all on function public.can_access_ticket(uuid) from public, anon;
grant execute on function public.can_access_ticket(uuid) to authenticated;

drop policy if exists "ticket participants read tickets" on public.support_tickets;
create policy "ticket participants read tickets" on public.support_tickets for select
  using (public.can_access_ticket(id));

drop policy if exists "ticket participants read messages" on public.ticket_messages;
create policy "ticket participants read messages" on public.ticket_messages for select
  using (
    public.can_access_ticket(ticket_id)
    and (is_internal = false or public.app_user_role() = 'admin')
  );

create or replace function public.create_ticket(
  p_category text,
  p_subject  text,
  p_body     text,
  p_order_id uuid default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    text;
  v_name    text;
  v_ticket  public.support_tickets;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'Please sign in.';
  end if;

  select role, coalesce(nullif(full_name, ''), split_part(email, '@', 1))
  into v_role, v_name from public.users where id = v_uid;

  if (select count(*) from public.support_tickets
      where created_by = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have opened a lot of tickets today. Please add to an existing ticket.';
  end if;
  if p_order_id is not null and not public.is_order_participant(p_order_id) then
    raise exception 'Order not found';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.support_tickets (ticket_number, created_by, order_id, category, subject)
      values (
        'TKT-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0'),
        v_uid, p_order_id, coalesce(nullif(p_category, ''), 'other'), btrim(p_subject)
      )
      returning * into v_ticket;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  insert into public.ticket_messages (ticket_id, author_id, author_name, author_role, body)
  values (v_ticket.id, v_uid, case when v_role = 'admin' then 'Support team' else v_name end, v_role, btrim(p_body));

  return v_ticket;
end;
$$;

grant execute on function public.create_ticket(text, text, text, uuid) to authenticated;

create or replace function public.post_ticket_message(
  p_ticket_id uuid,
  p_body      text,
  p_internal  boolean default false
)
returns public.ticket_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_is_admin boolean;
  v_role     text;
  v_name     text;
  v_ticket   public.support_tickets;
  v_msg      public.ticket_messages;
begin
  if v_uid is null then
    raise exception 'Please sign in.';
  end if;
  if not public.can_access_ticket(p_ticket_id) then
    raise exception 'Ticket not found';
  end if;

  v_is_admin := public.app_user_role() = 'admin';
  if p_internal and not v_is_admin then
    raise exception 'Only the support team can add internal notes.';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if v_ticket.status = 'closed' and not v_is_admin then
    raise exception 'This ticket is closed. Open a new ticket or ask to reopen it.';
  end if;

  select role, coalesce(nullif(full_name, ''), split_part(email, '@', 1))
  into v_role, v_name from public.users where id = v_uid;

  insert into public.ticket_messages (ticket_id, author_id, author_name, author_role, body, is_internal)
  values (p_ticket_id, v_uid, case when v_is_admin then 'Support team' else v_name end,
          v_role, btrim(p_body), p_internal)
  returning * into v_msg;

  if not p_internal then
    update public.support_tickets
    set last_message_at = now(),
        updated_at = now(),
        status = case
          when v_is_admin and status in ('open', 'in_progress') then 'waiting'
          when not v_is_admin and status in ('waiting', 'resolved') then 'open'
          else status
        end
    where id = p_ticket_id;
  end if;

  return v_msg;
end;
$$;

grant execute on function public.post_ticket_message(uuid, text, boolean) to authenticated;

-- Admins set any status; the person who opened the ticket can close or reopen it.
create or replace function public.set_ticket_status(p_ticket_id uuid, p_status text)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets;
  v_is_admin boolean := public.app_user_role() = 'admin';
begin
  if auth.uid() is null then
    raise exception 'Please sign in.';
  end if;
  if p_status not in ('open', 'in_progress', 'waiting', 'resolved', 'closed') then
    raise exception 'Invalid status';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id;
  if v_ticket is null or not public.can_access_ticket(p_ticket_id) then
    raise exception 'Ticket not found';
  end if;
  if not v_is_admin and not (v_ticket.created_by = auth.uid() and p_status in ('open', 'closed')) then
    raise exception 'You can only close or reopen your own tickets.';
  end if;

  update public.support_tickets set status = p_status, updated_at = now()
  where id = p_ticket_id returning * into v_ticket;
  return v_ticket;
end;
$$;

grant execute on function public.set_ticket_status(uuid, text) to authenticated;


-- ============================================================================
-- 10. Receipts: remember that the receipt email went out
-- ============================================================================

create or replace function public.mark_receipt_emailed(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_done boolean;
begin
  update public.orders
  set receipt_emailed_at = now()
  where id = p_order_id
    and receipt_emailed_at is null
    and (customer_id = auth.uid() or public.app_user_role() = 'admin')
  returning true into v_done;
  return coalesce(v_done, false);
end;
$$;

grant execute on function public.mark_receipt_emailed(uuid) to authenticated;

-- Make the API pick up the new functions straight away.
notify pgrst, 'reload schema';
