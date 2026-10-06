-- Payments setup, part 3 of 3. Run the parts in order (1, 2, 3). Safe to re-run.

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
     and public.checkout_payments_required()
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
  if not public.checkout_payments_required() then
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
