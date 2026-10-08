-- payouts.sql part 1 of 7. Run parts in order. Safe to re-run.

-- ============================================================================
-- Earnings and payouts:
--   1. Each order line remembers the supplier's cost and the supplier at the
--      moment of purchase, so a later price change or a deleted product can no
--      longer change (or lose) anyone's commission or payout.
--   2. Withdrawals become real: a request holds the money, an admin reviews it,
--      and approved requests are sent to mobile money with Paystack Transfers.
--      Suppliers can withdraw too.
--
-- Paste into the Supabase SQL editor and Run. Safe to re-run. Run it AFTER
-- audit-log.sql (schema.sql already contains everything, in order).
--
-- Withdrawals made before this update were taken from wallets but never sent.
-- Section 6 puts them in the admin queue (Admin > Payouts) so each one can be
-- sent, returned to the wallet, or marked as already paid by hand.
-- ============================================================================

-- ============================================================================
-- 1. Order lines remember the supplier's cost and the supplier
-- ============================================================================

alter table public.order_items
  add column if not exists unit_cost   numeric(12,2),
  add column if not exists supplier_id uuid references public.users(id) on delete set null;

-- Existing lines: best available value is today's cost (what they would have used anyway).
update public.order_items oi
set unit_cost   = round(p.cost_price + coalesce(oi.variant_adjustment, 0), 2),
    supplier_id = p.supplier_id
from public.products p
where p.id = oi.product_id
  and oi.unit_cost is null;

create index if not exists idx_order_items_supplier on public.order_items(supplier_id);

-- unit_cost is the supplier's price for one unit of the chosen option
-- (cost_price + the option's price adjustment). It is always taken from the
-- product when the line is created, never from the caller, and only the
-- system (no signed-in user) can change it afterwards.
create or replace function public.snapshot_order_line_cost()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost     numeric;
  v_supplier uuid;
begin
  if tg_op = 'UPDATE' then
    if auth.uid() is not null then
      new.unit_cost := old.unit_cost;
      new.supplier_id := old.supplier_id;
    end if;
    return new;
  end if;

  select cost_price, supplier_id into v_cost, v_supplier
  from public.products where id = new.product_id;

  new.unit_cost := case when v_cost is null then null
                        else round(v_cost + coalesce(new.variant_adjustment, 0), 2) end;
  new.supplier_id := v_supplier;
  return new;
end;
$$;

revoke all on function public.snapshot_order_line_cost() from public, anon, authenticated;

drop trigger if exists trg_snapshot_order_line_cost on public.order_items;
create trigger trg_snapshot_order_line_cost
  before insert or update on public.order_items
  for each row execute function public.snapshot_order_line_cost();

-- ============================================================================
-- 2. update_order_status pays from the remembered cost and supplier.
--    Otherwise identical to the catalog-features version.
-- ============================================================================
