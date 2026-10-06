-- launch-features.sql part 2 of 10. Run parts in order. Safe to re-run.
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
