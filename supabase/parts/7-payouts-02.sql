-- payouts.sql part 2 of 7. Run parts in order. Safe to re-run.

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
      left join public.products p on p.id = oi.product_id
      where oi.order_id = v_before.id and coalesce(oi.supplier_id, p.supplier_id) = v_uid
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
    -- Lines created before unit_cost existed fall back to the product's cost.
    select coalesce(sum((oi.unit_price - coalesce(oi.unit_cost, p.cost_price + oi.variant_adjustment)) * oi.quantity), 0)
    into v_commission
    from public.order_items oi
    left join public.products p on p.id = oi.product_id
    where oi.order_id = v_order.id;

    if v_commission > 0 then
      perform public.wallet_credit(
        v_order.dropshipper_id, v_commission,
        'Commission for order ' || coalesce(v_order.order_number, left(v_order.id::text, 8)),
        'commission'
      );
    end if;

    for v_payout_row in
      select coalesce(oi.supplier_id, p.supplier_id) as supplier_id,
             sum(coalesce(oi.unit_cost, p.cost_price + oi.variant_adjustment) * oi.quantity) as payout
      from public.order_items oi
      left join public.products p on p.id = oi.product_id
      where oi.order_id = v_order.id
        and coalesce(oi.supplier_id, p.supplier_id) is not null
      group by coalesce(oi.supplier_id, p.supplier_id)
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
-- 3. Payout settings (Admin > Payouts): limits and the payout fee
-- ============================================================================

insert into public.app_settings (key, value) values (
  'payout_settings',
  '{"minAmount": 10, "maxAmount": 5000, "dailyLimit": 10000, "feeFlat": 0, "feePercent": 0, "paused": false}'::jsonb
)
on conflict (key) do nothing;

-- Anyone signed in can read the limits and fee (the wallet shows them before you withdraw).
create or replace function public.payout_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select '{"minAmount": 10, "maxAmount": 5000, "dailyLimit": 10000, "feeFlat": 0, "feePercent": 0, "paused": false}'::jsonb
         || coalesce((select value from public.app_settings where key = 'payout_settings'), '{}'::jsonb);
$$;

revoke all on function public.payout_settings() from public, anon;
grant execute on function public.payout_settings() to authenticated;
