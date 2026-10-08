-- payouts.sql part 5 of 7. Run parts in order. Safe to re-run.

-- The owner can take back a request that has not been reviewed yet.
create or replace function public.cancel_payout(p_id uuid)
returns public.payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_requests;
begin
  update public.payout_requests
  set status = 'cancelled', completed_at = now(), updated_at = now()
  where id = p_id and user_id = auth.uid() and status = 'pending'
  returning * into v_row;
  if v_row.id is null then
    raise exception 'Only withdrawals that are still waiting for review can be cancelled.';
  end if;

  perform public.return_payout_funds(v_row.id, 'cancelled by you');
  perform public.log_audit('payout.cancelled', 'payout', v_row.id::text,
    'Cancelled by the owner (GHS ' || v_row.amount || ' returned)', jsonb_build_object('reference', v_row.reference));
  return v_row;
end;
$$;

revoke all on function public.cancel_payout(uuid) from public, anon;
grant execute on function public.cancel_payout(uuid) to authenticated;

-- ============================================================================
-- 5. Admin review, and recording what Paystack says
-- ============================================================================

-- Admin declines a request; the money goes back to the wallet.
create or replace function public.reject_payout(p_id uuid, p_note text)
returns public.payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_requests;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can review withdrawals.';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'Add a short reason for the owner.';
  end if;

  update public.payout_requests
  set status = 'rejected', admin_note = btrim(p_note), reviewed_by = auth.uid(), reviewed_at = now(),
      completed_at = now(), updated_at = now()
  where id = p_id and status = 'pending'
  returning * into v_row;
  if v_row.id is null then
    raise exception 'Only withdrawals waiting for review can be rejected.';
  end if;

  perform public.return_payout_funds(v_row.id, btrim(p_note));
  perform public.notify_payout(v_row.id);
  perform public.log_audit('payout.rejected', 'payout', v_row.id::text,
    'Rejected GHS ' || v_row.amount || ': ' || btrim(p_note), jsonb_build_object('reference', v_row.reference));
  return v_row;
end;
$$;

revoke all on function public.reject_payout(uuid, text) from public, anon;
grant execute on function public.reject_payout(uuid, text) to authenticated;

-- Admin already paid this outside the app (for example by hand from the MoMo merchant account).
create or replace function public.mark_payout_paid_manually(p_id uuid, p_note text)
returns public.payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_requests;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can review withdrawals.';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'Say how it was paid (for example the MoMo transaction ID).';
  end if;

  update public.payout_requests
  set status = 'paid', paid_manually = true, admin_note = btrim(p_note),
      reviewed_by = auth.uid(), reviewed_at = now(), completed_at = now(), updated_at = now()
  where id = p_id and status = 'pending'
  returning * into v_row;
  if v_row.id is null then
    raise exception 'Only withdrawals waiting for review can be marked as paid.';
  end if;

  perform public.notify_payout(v_row.id);
  perform public.log_audit('payout.paid_manually', 'payout', v_row.id::text,
    'Marked GHS ' || v_row.net_amount || ' as paid by hand: ' || btrim(p_note), jsonb_build_object('reference', v_row.reference));
  return v_row;
end;
$$;

revoke all on function public.mark_payout_paid_manually(uuid, text) from public, anon;
grant execute on function public.mark_payout_paid_manually(uuid, text) to authenticated;

-- Admin approves: claims the request for sending so a double click cannot pay twice.
-- The server then calls Paystack and records the result with the functions below.
create or replace function public.begin_payout(p_id uuid)
returns public.payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_requests;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can send withdrawals.';
  end if;

  select * into v_row from public.payout_requests where id = p_id for update;
  if v_row.id is null or v_row.status <> 'pending' then
    raise exception 'Only withdrawals waiting for review can be sent.';
  end if;
  if v_row.network is null or coalesce(v_row.account_number, '') !~ '^0[0-9]{9}$' or char_length(v_row.account_name) < 2 then
    raise exception 'This request has no usable mobile money details. Reject it (the money returns to the wallet) or mark it paid by hand.';
  end if;

  update public.payout_requests
  set status = 'processing', reviewed_by = auth.uid(), reviewed_at = now(), sent_at = now(),
      last_error = null, updated_at = now()
  where id = p_id
  returning * into v_row;

  perform public.log_audit('payout.approved', 'payout', v_row.id::text,
    'Approved and sending GHS ' || v_row.net_amount || ' to ' || public.payout_network_label(v_row.network) || ' ' || v_row.account_number,
    jsonb_build_object('reference', v_row.reference));
  return v_row;
end;
$$;

revoke all on function public.begin_payout(uuid) from public, anon;
grant execute on function public.begin_payout(uuid) to authenticated;
