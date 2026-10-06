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
  if not public.payments_required() then
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

-- Fulfilment needs payment (admins can still override for support cases).
create or replace function public.require_payment_before_fulfilment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('confirmed', 'processing', 'shipped', 'delivered')
     and new.payment_status <> 'paid'
     and public.payments_required()
     and coalesce(public.app_user_role(), '') <> 'admin'
     and auth.uid() is not null then
    raise exception 'This order has not been paid for yet.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_require_payment on public.orders;
create trigger trg_require_payment
  before update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.require_payment_before_fulfilment();

-- While payments are required, "new order" alerts wait until the order is paid.
create or replace function public.trg_order_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.payments_required() then
    perform public.notify_order_placed(new.id);
  end if;
  return null;
end;
$$;

-- Customers must not be able to mark their own order paid.
create or replace function public.guard_order_payment_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(public.app_user_role(), '') <> 'admin' then
    if tg_op = 'UPDATE' then
      new.payment_status := old.payment_status;
      new.paid_at := old.paid_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_order_payment on public.orders;
create trigger trg_guard_order_payment
  before update on public.orders
  for each row execute function public.guard_order_payment_columns();

notify pgrst, 'reload schema';
