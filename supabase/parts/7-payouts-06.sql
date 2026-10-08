-- payouts.sql part 6 of 7. Run parts in order. Safe to re-run.

-- Server only: remember what Paystack returned while a payout is being sent.
create or replace function public.payout_record_transfer(
  p_id              uuid,
  p_recipient_code  text,
  p_transfer_code   text,
  p_transfer_status text,
  p_error           text default null,
  p_actor           uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.payout_requests;
begin
  select * into v_before from public.payout_requests where id = p_id for update;
  if v_before.id is null or v_before.status <> 'processing' then
    return;
  end if;

  update public.payout_requests
  set recipient_code  = coalesce(p_recipient_code, recipient_code),
      transfer_code   = coalesce(p_transfer_code, transfer_code),
      transfer_status = coalesce(p_transfer_status, transfer_status),
      last_error      = p_error,
      updated_at      = now()
  where id = p_id;

  if v_before.transfer_code is null and p_transfer_code is not null then
    perform public.log_audit('payout.sent', 'payout', p_id::text,
      'Sent to Paystack (' || coalesce(p_transfer_status, 'pending') || ')',
      jsonb_build_object('reference', v_before.reference, 'transferCode', p_transfer_code), p_actor);
  end if;
end;
$$;

-- Server only: Paystack refused before any transfer existed, so it is safe to try again later.
create or replace function public.payout_send_failed(p_id uuid, p_error text, p_actor uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_requests;
begin
  update public.payout_requests
  set status = 'pending', last_error = left(coalesce(p_error, 'Paystack did not accept the transfer.'), 500),
      sent_at = null, updated_at = now()
  where id = p_id and status = 'processing' and transfer_code is null
  returning * into v_row;

  if v_row.id is not null then
    perform public.log_audit('payout.send_failed', 'payout', p_id::text,
      'Not sent, back in the queue: ' || v_row.last_error, jsonb_build_object('reference', v_row.reference), p_actor);
  end if;
end;
$$;

-- Server only: the final result from Paystack (checked with Paystack, never taken
-- from a webhook body alone). Safe to call more than once.
create or replace function public.settle_payout(
  p_reference text,
  p_outcome   text,              -- 'success' | 'failed' | 'reversed'
  p_reason    text default null,
  p_actor     uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_requests;
begin
  select * into v_row from public.payout_requests where reference = p_reference for update;
  if v_row.id is null then
    return 'unknown';
  end if;

  if p_outcome = 'success' then
    if v_row.status = 'paid' then
      return 'already_paid';
    end if;
    if v_row.status not in ('pending', 'processing') then
      -- The money was already returned to the wallet, yet Paystack delivered it.
      perform public.log_audit('payout.conflict', 'payout', v_row.id::text,
        'Paystack reports this transfer succeeded, but it is marked ' || v_row.status || '. Check it by hand.',
        jsonb_build_object('reference', v_row.reference), p_actor);
      return 'conflict';
    end if;
    update public.payout_requests
    set status = 'paid', transfer_status = 'success', last_error = null, completed_at = now(), updated_at = now()
    where id = v_row.id;
    perform public.notify_payout(v_row.id);
    perform public.log_audit('payout.paid', 'payout', v_row.id::text,
      'Delivered GHS ' || v_row.net_amount || ' to ' || public.payout_network_label(v_row.network) || ' ' || coalesce(v_row.account_number, ''),
      jsonb_build_object('reference', v_row.reference), p_actor);
    return 'paid';
  end if;

  if p_outcome in ('failed', 'reversed') then
    if v_row.status = 'failed' then
      return 'already_failed';
    end if;
    if not (v_row.status = 'processing' or (v_row.status = 'paid' and p_outcome = 'reversed' and not v_row.paid_manually)) then
      return 'ignored';
    end if;
    update public.payout_requests
    set status = 'failed', transfer_status = p_outcome,
        last_error = left(coalesce(nullif(p_reason, ''), 'Paystack could not deliver this transfer.'), 500),
        completed_at = now(), updated_at = now()
    where id = v_row.id;
    perform public.return_payout_funds(v_row.id, 'the transfer ' || p_outcome);
    perform public.notify_payout(v_row.id);
    perform public.log_audit('payout.' || p_outcome, 'payout', v_row.id::text,
      'Transfer ' || p_outcome || '; GHS ' || v_row.amount || ' returned to the wallet',
      jsonb_build_object('reference', v_row.reference, 'reason', p_reason), p_actor);
    return 'failed';
  end if;

  raise exception 'Unknown outcome %', p_outcome;
end;
$$;

revoke all on function public.payout_record_transfer(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.payout_send_failed(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.settle_payout(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.payout_record_transfer(uuid, text, text, text, text, uuid) to service_role;
grant execute on function public.payout_send_failed(uuid, text, uuid) to service_role;
grant execute on function public.settle_payout(text, text, text, uuid) to service_role;

-- ============================================================================
-- 6. Retire the old instant "withdrawal" and queue what it left behind
-- ============================================================================

-- It took money out of wallets without sending it anywhere.
revoke all on function public.wallet_withdraw(numeric, jsonb) from public, anon, authenticated;
