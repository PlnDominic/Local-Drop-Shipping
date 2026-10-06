-- payments.sql part 1 of 3. Run parts in order. Safe to re-run.

-- ============================================================================
-- Real checkout payments (Paystack: MTN/Telecel/AirtelTigo mobile money and cards).
--
-- Paste into the Supabase SQL editor and Run. Safe to re-run. Run it AFTER
-- engagement-features.sql (schema.sql already contains everything, in order).
--
-- Payments start OFF so nothing changes until you are ready: an admin switches
-- "payments required" on (Admin > Payments) once PAYSTACK_SECRET_KEY is set.
-- When on, an order can only be confirmed, packed, shipped or delivered after
-- it has been paid, and unpaid orders are cancelled after 2 hours (stock is
-- released automatically).
-- ============================================================================

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "admin reads settings" on public.app_settings;
create policy "admin reads settings" on public.app_settings for select
  using (public.app_user_role() = 'admin');

insert into public.app_settings (key, value) values ('payments_required', 'false'::jsonb)
on conflict (key) do nothing;

-- Public: the checkout asks whether it must collect payment.
create or replace function public.payments_required()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value)::text = 'true' from public.app_settings where key = 'payments_required'), false);
$$;

grant execute on function public.payments_required() to anon, authenticated;

create or replace function public.set_payments_required(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can change this.';
  end if;
  insert into public.app_settings (key, value) values ('payments_required', to_jsonb(p_on))
  on conflict (key) do update set value = to_jsonb(p_on), updated_at = now();
  return p_on;
end;
$$;

grant execute on function public.set_payments_required(boolean) to authenticated;

-- Orders remember whether they are paid.
alter table public.orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid')),
  add column if not exists paid_at timestamptz;

-- Orders placed before payments existed count as paid so nothing already in flight stalls.
update public.orders set payment_status = 'paid', paid_at = coalesce(paid_at, created_at)
where payment_status = 'unpaid' and created_at < now() and paid_at is null
  and not exists (select 1 from public.app_settings where key = 'payments_required' and (value)::text = 'true');

create table if not exists public.checkout_payments (
  id         uuid primary key default gen_random_uuid(),
  reference  text not null unique,
  user_id    uuid not null references public.users(id) on delete cascade,
  order_ids  uuid[] not null,
  amount     numeric(12,2) not null check (amount > 0),
  currency   text not null default 'GHS',
  provider   text not null default 'paystack',
  channel    text,
  status     text not null default 'pending'
               check (status in ('pending', 'paid', 'failed', 'mismatch')),
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);

create index if not exists idx_checkout_payments_user on public.checkout_payments(user_id, created_at desc);

alter table public.checkout_payments enable row level security;

drop policy if exists "owner or admin reads checkout payments" on public.checkout_payments;
create policy "owner or admin reads checkout payments" on public.checkout_payments for select
  using (user_id = auth.uid() or public.app_user_role() = 'admin');

-- The payment total is computed here from the real orders, never trusted from the browser.
-- Called by the server on behalf of the signed-in customer.
create or replace function public.create_payment(p_order_ids uuid[], p_reference text)
returns public.checkout_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_count int;
  v_row   public.checkout_payments;
begin
  if auth.uid() is null then
    raise exception 'Please sign in.';
  end if;
  if p_order_ids is null or array_length(p_order_ids, 1) is null or array_length(p_order_ids, 1) > 10 then
    raise exception 'Invalid orders.';
  end if;

  select coalesce(sum(total), 0), count(*) into v_total, v_count
  from public.orders
  where id = any (p_order_ids)
    and customer_id = auth.uid()
    and payment_status = 'unpaid'
    and status = 'pending';

  if v_count <> array_length(p_order_ids, 1) or v_total <= 0 then
    raise exception 'These orders cannot be paid for (already paid, cancelled or not yours).';
  end if;

  insert into public.checkout_payments (reference, user_id, order_ids, amount)
  values (p_reference, auth.uid(), p_order_ids, v_total)
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.create_payment(uuid[], text) from public, anon;
grant execute on function public.create_payment(uuid[], text) to authenticated;
