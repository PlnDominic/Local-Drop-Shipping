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

create or replace function public.set_payout_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min    numeric := (p_settings->>'minAmount')::numeric;
  v_max    numeric := (p_settings->>'maxAmount')::numeric;
  v_daily  numeric := (p_settings->>'dailyLimit')::numeric;
  v_flat   numeric := (p_settings->>'feeFlat')::numeric;
  v_pct    numeric := (p_settings->>'feePercent')::numeric;
  v_paused boolean := coalesce((p_settings->>'paused')::boolean, false);
  v_value  jsonb;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can change payout settings.';
  end if;
  if v_min is null or v_max is null or v_daily is null or v_flat is null or v_pct is null then
    raise exception 'Fill in every payout setting.';
  end if;
  if v_min < 1 or v_max < v_min or v_daily < v_max then
    raise exception 'Limits must satisfy: minimum at least GHS 1, maximum per withdrawal at least the minimum, daily limit at least the maximum.';
  end if;
  if v_flat < 0 or v_pct < 0 or v_pct > 20 then
    raise exception 'The fee must be zero or more, and the percentage at most 20%%.';
  end if;
  if v_flat + v_min * v_pct / 100 >= v_min then
    raise exception 'The fee would take the whole minimum withdrawal. Lower the fee or raise the minimum.';
  end if;

  v_value := jsonb_build_object(
    'minAmount', round(v_min, 2), 'maxAmount', round(v_max, 2), 'dailyLimit', round(v_daily, 2),
    'feeFlat', round(v_flat, 2), 'feePercent', round(v_pct, 2), 'paused', v_paused
  );
  insert into public.app_settings (key, value) values ('payout_settings', v_value)
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return v_value;
end;
$$;

revoke all on function public.set_payout_settings(jsonb) from public, anon;
grant execute on function public.set_payout_settings(jsonb) to authenticated;


-- ============================================================================
-- 4. Payout requests
--    pending    → waiting for an admin (the money is already held from the wallet)
--    processing → sent to Paystack, waiting for the result
--    paid       → delivered (or paid by hand: paid_manually)
--    failed     → Paystack could not deliver it; money returned to the wallet
--    rejected   → declined by an admin; money returned to the wallet
--    cancelled  → withdrawn by the owner before review; money returned
-- ============================================================================

create table if not exists public.payout_requests (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,          -- also the Paystack transfer reference (lowercase)
  user_id         uuid not null references public.users(id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),     -- taken from the wallet
  fee             numeric(12,2) not null default 0 check (fee >= 0),
  net_amount      numeric(12,2) not null check (net_amount > 0), -- what reaches the account
  currency        text not null default 'GHS',
  network         text check (network in ('MTN', 'VOD', 'ATL')), -- Paystack codes: MTN, Telecel (VOD), AT (ATL)
  account_number  text,                                          -- local format: 0XXXXXXXXX
  account_name    text not null default '',
  status          text not null default 'pending'
                    check (status in ('pending', 'processing', 'paid', 'failed', 'rejected', 'cancelled')),
  paid_manually   boolean not null default false,
  wallet_tx_id    uuid unique references public.wallet_transactions(id) on delete set null,
  recipient_code  text,
  transfer_code   text,
  transfer_status text,                                          -- Paystack's last word: otp, pending, success, ...
  last_error      text,
  admin_note      text,
  reviewed_by     uuid references public.users(id) on delete set null,
  reviewed_at     timestamptz,
  sent_at         timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_payout_requests_user on public.payout_requests(user_id, created_at desc);
create index if not exists idx_payout_requests_status on public.payout_requests(status, created_at);

alter table public.payout_requests enable row level security;

drop policy if exists "owner or admin reads payout requests" on public.payout_requests;
create policy "owner or admin reads payout requests" on public.payout_requests for select
  using (user_id = auth.uid() or public.app_user_role() = 'admin');

-- Changes only happen through the functions below.
revoke insert, update, delete on public.payout_requests from anon, authenticated;

create or replace function public.payout_network_label(p_network text)
returns text
language sql
immutable
as $$
  select case p_network when 'MTN' then 'MTN MoMo' when 'VOD' then 'Telecel Cash' when 'ATL' then 'AT Money'
              else coalesce(p_network, 'mobile money') end;
$$;

-- Puts the held money back in the wallet (does not count as new earnings). Internal.
create or replace function public.return_payout_funds(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay     public.payout_requests;
  v_balance numeric;
begin
  select * into v_pay from public.payout_requests where id = p_id;
  insert into public.wallets (user_id) values (v_pay.user_id) on conflict (user_id) do nothing;
  update public.wallets set balance = balance + v_pay.amount, updated_at = now()
  where user_id = v_pay.user_id
  returning balance into v_balance;

  insert into public.wallet_transactions (user_id, type, amount, description, balance_after, reference)
  values (v_pay.user_id, 'withdrawal', v_pay.amount,
          'Withdrawal returned to wallet: ' || p_reason, v_balance, v_pay.reference);
end;
$$;

revoke all on function public.return_payout_funds(uuid, text) from public, anon, authenticated;

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

-- Old withdrawals stored the destination as text like "MTN MoMo (+233241234567)".
insert into public.payout_requests (
  reference, user_id, amount, fee, net_amount, network, account_number, account_name,
  status, wallet_tx_id, admin_note, created_at
)
select
  'wdr-legacy-' || replace(t.id::text, '-', ''),
  t.user_id, -t.amount, 0, -t.amount,
  case
    when t.meta->>'details' ilike 'MTN%' then 'MTN'
    when t.meta->>'details' ilike 'Telecel%' or t.meta->>'details' ilike 'Vodafone%' then 'VOD'
    when t.meta->>'details' ilike 'AirtelTigo%' or t.meta->>'details' ilike 'AT %' then 'ATL'
  end,
  '0' || substr(public.normalize_gh_phone(substring(t.meta->>'details' from '\(([^)]*)\)')), 5),
  coalesce(u.full_name, ''),
  'pending', t.id,
  'Requested before automatic payouts (' || coalesce(t.meta->>'details', 'no details') || ')',
  t.created_at
from public.wallet_transactions t
join public.users u on u.id = t.user_id
where t.type = 'withdrawal' and t.amount < 0
  and not exists (select 1 from public.payout_requests pr where pr.wallet_tx_id = t.id)
on conflict do nothing;

notify pgrst, 'reload schema';
