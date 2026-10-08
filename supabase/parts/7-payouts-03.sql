-- payouts.sql part 3 of 7. Run parts in order. Safe to re-run.

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
