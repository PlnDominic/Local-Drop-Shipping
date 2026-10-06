-- catalog-features.sql part 4 of 5. Run parts in order. Safe to re-run.
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
