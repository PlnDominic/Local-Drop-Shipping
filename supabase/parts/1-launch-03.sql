-- launch-features.sql part 3 of 10. Run parts in order. Safe to re-run.
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
