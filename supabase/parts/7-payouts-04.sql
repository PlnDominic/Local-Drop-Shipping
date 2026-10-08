-- payouts.sql part 4 of 7. Run parts in order. Safe to re-run.

-- Tells the owner what happened (email, and SMS/WhatsApp if they turned those on).
create or replace function public.notify_payout(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay  public.payout_requests;
  v_subj text;
  v_body text;
begin
  select * into v_pay from public.payout_requests where id = p_id;
  if v_pay.status = 'paid' then
    v_subj := 'Your withdrawal of GHS ' || v_pay.net_amount || ' has been sent';
    v_body := 'GHS ' || v_pay.net_amount || ' has been sent to your ' || public.payout_network_label(v_pay.network)
              || ' account ' || coalesce(v_pay.account_number, '') || '. Reference: ' || v_pay.reference || '.';
  elsif v_pay.status in ('failed', 'rejected') then
    v_subj := 'Your withdrawal could not be completed';
    v_body := 'Your withdrawal of GHS ' || v_pay.amount || ' (reference ' || v_pay.reference
              || ') was not sent and the money is back in your wallet.'
              || coalesce(' Reason: ' || nullif(coalesce(v_pay.admin_note, v_pay.last_error), '') || '.', '');
  else
    return;
  end if;
  perform public.enqueue_notification(v_pay.user_id, 'payout_' || v_pay.status, v_subj, v_body,
    jsonb_build_object('payoutId', v_pay.id, 'reference', v_pay.reference),
    'payout:' || v_pay.id || ':' || v_pay.status);
end;
$$;

revoke all on function public.notify_payout(uuid) from public, anon, authenticated;

-- Store owners and suppliers ask for a withdrawal. The money is held at once so
-- it cannot be spent twice; an admin then sends or rejects it.
create or replace function public.request_payout(
  p_amount         numeric,
  p_network        text,
  p_account_number text,
  p_account_name   text
)
returns public.payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_set     jsonb := public.payout_settings();
  v_amount  numeric := round(p_amount, 2);
  v_network text := upper(btrim(coalesce(p_network, '')));
  v_name    text := btrim(coalesce(p_account_name, ''));
  v_phone   text := public.normalize_gh_phone(p_account_number);
  v_local   text;
  v_balance numeric;
  v_today   numeric;
  v_fee     numeric;
  v_ref     text;
  v_tx      uuid;
  v_row     public.payout_requests;
begin
  if v_uid is null then
    raise exception 'Please sign in.';
  end if;
  if coalesce(public.app_user_role(), '') not in ('dropshipper', 'supplier') then
    raise exception 'Only store owners and suppliers can withdraw.';
  end if;
  if (v_set->>'paused')::boolean then
    raise exception 'Withdrawals are paused for a short while. Your balance is safe; please try again later.';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'Enter the amount you want to withdraw.';
  end if;
  if v_amount < (v_set->>'minAmount')::numeric then
    raise exception 'The minimum withdrawal is GHS %.', v_set->>'minAmount';
  end if;
  if v_amount > (v_set->>'maxAmount')::numeric then
    raise exception 'The most you can withdraw at once is GHS %.', v_set->>'maxAmount';
  end if;
  if v_network not in ('MTN', 'VOD', 'ATL') then
    raise exception 'Choose your mobile money network.';
  end if;
  if v_phone is null then
    raise exception 'Enter a valid Ghana mobile money number, like 024 123 4567.';
  end if;
  v_local := '0' || substr(v_phone, 5);
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Enter the name registered on the mobile money account.';
  end if;

  -- Lock the wallet so two requests cannot both pass the checks below.
  select balance into v_balance from public.wallets where user_id = v_uid for update;
  if v_balance is null or v_balance < v_amount then
    raise exception 'You do not have enough in your wallet for this withdrawal.';
  end if;

  if (select count(*) from public.payout_requests where user_id = v_uid and status = 'pending') >= 3 then
    raise exception 'You already have 3 withdrawals waiting for review. Please wait for those first.';
  end if;

  select coalesce(sum(amount), 0) into v_today
  from public.payout_requests
  where user_id = v_uid
    and created_at > now() - interval '24 hours'
    and status in ('pending', 'processing', 'paid');
  if v_today + v_amount > (v_set->>'dailyLimit')::numeric then
    raise exception 'You can withdraw up to GHS % in 24 hours. You can still withdraw GHS % today.',
      v_set->>'dailyLimit', greatest((v_set->>'dailyLimit')::numeric - v_today, 0);
  end if;

  v_fee := round((v_set->>'feeFlat')::numeric + v_amount * (v_set->>'feePercent')::numeric / 100, 2);
  if v_amount - v_fee <= 0 then
    raise exception 'This amount does not cover the GHS % payout fee.', v_fee;
  end if;

  -- Lowercase letters, digits and dashes only, as Paystack requires for transfer references.
  v_ref := 'wdr-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(gen_random_uuid()::text), 1, 12);

  update public.wallets set balance = balance - v_amount, updated_at = now()
  where user_id = v_uid
  returning balance into v_balance;

  insert into public.wallet_transactions (user_id, type, amount, description, balance_after, reference, meta)
  values (v_uid, 'withdrawal', -v_amount,
          'Withdrawal to ' || public.payout_network_label(v_network) || ' ' || v_local,
          v_balance, v_ref, jsonb_build_object('network', v_network, 'account', v_local))
  returning id into v_tx;

  insert into public.payout_requests (
    reference, user_id, amount, fee, net_amount, network, account_number, account_name, wallet_tx_id
  ) values (
    v_ref, v_uid, v_amount, v_fee, v_amount - v_fee, v_network, v_local, v_name, v_tx
  )
  returning * into v_row;

  perform public.log_audit('payout.requested', 'payout', v_row.id::text,
    'Requested GHS ' || v_amount || ' to ' || public.payout_network_label(v_network) || ' ' || v_local,
    jsonb_build_object('reference', v_ref, 'amount', v_amount, 'fee', v_fee));
  return v_row;
end;
$$;

revoke all on function public.request_payout(numeric, text, text, text) from public, anon;
grant execute on function public.request_payout(numeric, text, text, text) to authenticated;
