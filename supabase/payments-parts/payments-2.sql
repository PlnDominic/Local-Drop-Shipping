-- Payments setup, part 2 of 3. Run the parts in order (1, 2, 3). Safe to re-run.

-- Service role only: called after Paystack confirms a charge. Idempotent.
-- Amount is in pesewas as Paystack reports it.
create or replace function public.mark_payment_paid(p_reference text, p_amount_pesewas bigint, p_currency text, p_channel text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.checkout_payments;
  v_oid uuid;
begin
  select * into v_pay from public.checkout_payments where reference = p_reference for update;
  if v_pay.id is null then
    return 'unknown';
  end if;
  if v_pay.status = 'paid' then
    return 'already_paid';
  end if;

  if p_currency is distinct from v_pay.currency or p_amount_pesewas < round(v_pay.amount * 100) then
    update public.checkout_payments set status = 'mismatch' where id = v_pay.id;
    return 'mismatch';
  end if;

  update public.checkout_payments set status = 'paid', paid_at = now(), channel = p_channel where id = v_pay.id;
  update public.orders set payment_status = 'paid', paid_at = now()
  where id = any (v_pay.order_ids) and payment_status = 'unpaid';

  -- Suppliers hear about an order once it is paid.
  foreach v_oid in array v_pay.order_ids loop
    perform public.notify_order_placed(v_oid);
  end loop;
  return 'paid';
end;
$$;

create or replace function public.mark_payment_failed(p_reference text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.checkout_payments set status = 'failed' where reference = p_reference and status = 'pending';
$$;

-- Cancels unpaid orders after 2 hours so reserved stock is not held forever.
create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if not public.checkout_payments_required() then
    return 0;
  end if;
  update public.orders
  set status = 'cancelled', cancelled_at = now(), updated_at = now(),
      notes = coalesce(notes || E'\n', '') || 'Cancelled automatically: not paid within 2 hours.'
  where payment_status = 'unpaid' and status = 'pending'
    and created_at < now() - interval '2 hours';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.mark_payment_paid(text, bigint, text, text) from public, anon, authenticated;
revoke all on function public.mark_payment_failed(text) from public, anon, authenticated;
revoke all on function public.expire_unpaid_orders() from public, anon, authenticated;
grant execute on function public.mark_payment_paid(text, bigint, text, text) to service_role;
grant execute on function public.mark_payment_failed(text) to service_role;
grant execute on function public.expire_unpaid_orders() to service_role;
