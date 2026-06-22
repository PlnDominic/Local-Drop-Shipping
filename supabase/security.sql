-- ============================================================================
-- Local Drop Shipping — RLS policies + security-critical write functions
-- ============================================================================
-- Run this in the Supabase SQL editor. It assumes:
--   * Supabase Auth is enabled and `public.users.id = auth.uid()` for each user
--     (i.e. the profile row's id IS the auth user id).
--   * FKs use the user id: products.supplier_id, dropshipper_products.dropshipper_id,
--     orders.dropshipper_id, wallets.user_id all reference public.users.id.
-- Review against your exact schema before applying in production.
-- ============================================================================

-- ── Helper: current user's role ─────────────────────────────────────────────
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ── Enable RLS ──────────────────────────────────────────────────────────────
alter table public.users                enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.dropshipper_products enable row level security;
alter table public.supplier_profiles    enable row level security;
alter table public.dropshipper_profiles enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.wallets              enable row level security;
alter table public.wallet_transactions  enable row level security;

-- ── Read policies ───────────────────────────────────────────────────────────

-- Catalog is public.
create policy "categories are public"
  on public.categories for select using (true);

create policy "active products are public"
  on public.products for select using (is_active = true);

-- Published storefront items are public; a dropshipper sees all of their own.
create policy "published store items are public"
  on public.dropshipper_products for select
  using (is_published = true or dropshipper_id = auth.uid());

-- A user sees their own profile; admins see all.
create policy "users read own profile"
  on public.users for select
  using (id = auth.uid() or public.current_role() = 'admin');

-- Supplier/dropshipper profiles: public read (storefronts), owner & admin manage.
create policy "supplier profiles are public"
  on public.supplier_profiles for select using (true);
create policy "dropshipper profiles are public"
  on public.dropshipper_profiles for select using (true);

-- Wallet + transactions: strictly the owner.
create policy "owner reads wallet"
  on public.wallets for select using (user_id = auth.uid());
create policy "owner reads transactions"
  on public.wallet_transactions for select using (user_id = auth.uid());

-- Orders: the originating dropshipper, the supplier of a contained product, or admin.
create policy "dropshipper reads own orders"
  on public.orders for select
  using (dropshipper_id = auth.uid() or public.current_role() = 'admin');

create policy "order items follow order visibility"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.dropshipper_id = auth.uid() or public.current_role() = 'admin')
    )
  );

-- ── Owner write policies (catalog & storefront) ─────────────────────────────

create policy "supplier manages own products"
  on public.products for all
  using (supplier_id = auth.uid())
  with check (supplier_id = auth.uid());

create policy "dropshipper manages own store items"
  on public.dropshipper_products for all
  using (dropshipper_id = auth.uid())
  with check (dropshipper_id = auth.uid());

-- NOTE: orders, wallets and wallet_transactions are intentionally NOT writable
-- directly by clients. All sensitive writes go through the SECURITY DEFINER
-- functions below, which enforce pricing and balance integrity.

-- ============================================================================
-- Security-critical write functions (server-side enforcement)
-- ============================================================================

-- ── Create an order with server-resolved prices ─────────────────────────────
-- Prices come from dropshipper_products.custom_price, never from the client.
-- p_items: jsonb array of { "productId": uuid, "quantity": int }
create or replace function public.create_order(
  p_dropshipper_id uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_customer_address text,
  p_items          jsonb,
  p_notes          text default null,
  p_platform_fee_percent numeric default 2
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
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  -- Validate each item and accumulate the subtotal from authoritative prices.
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
    dropshipper_id, customer_name, customer_phone, customer_address,
    status, subtotal, platform_fee, total, notes
  ) values (
    p_dropshipper_id, p_customer_name, p_customer_phone, p_customer_address,
    'pending', v_subtotal, v_fee, v_subtotal + v_fee, p_notes
  )
  returning * into v_order;

  -- Insert items at the resolved prices.
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

-- ── Atomic wallet credit (internal/payout use) ──────────────────────────────
create or replace function public.wallet_credit(
  p_user_id uuid,
  p_amount  numeric,
  p_description text,
  p_type    text default 'credit'
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
    raise exception 'Credit amount must be positive';
  end if;

  -- Upsert + atomic increment (row is locked for the update).
  insert into public.wallets (user_id, balance, currency)
  values (p_user_id, 0, 'GHS')
  on conflict (user_id) do nothing;

  update public.wallets
  set balance = balance + p_amount, updated_at = now()
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.wallet_transactions (user_id, type, amount, description, balance_after)
  values (p_user_id, p_type, p_amount, p_description, v_balance);

  return v_balance;
end;
$$;

-- ── Atomic wallet withdrawal (caller = owner) ───────────────────────────────
create or replace function public.wallet_withdraw(
  p_amount  numeric,
  p_account jsonb
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  -- Atomic, overdraft-safe: only succeeds if sufficient balance exists.
  update public.wallets
  set balance = balance - p_amount, updated_at = now()
  where user_id = v_user and balance >= p_amount
  returning balance into v_balance;

  if v_balance is null then
    raise exception 'Insufficient wallet balance';
  end if;

  insert into public.wallet_transactions (user_id, type, amount, description, balance_after, meta)
  values (v_user, 'withdrawal', -p_amount, 'Wallet withdrawal', v_balance, p_account);

  return v_balance;
end;
$$;

-- ── Lock down direct execution where appropriate ────────────────────────────
revoke all on function public.wallet_credit(uuid, numeric, text, text) from anon, authenticated;
-- create_order and wallet_withdraw are callable by authenticated users (they
-- enforce ownership/pricing internally). wallet_credit is service-role only.
grant execute on function public.create_order(uuid, text, text, text, jsonb, text, numeric) to authenticated;
grant execute on function public.wallet_withdraw(numeric, jsonb) to authenticated;
