-- launch-features.sql part 6 of 10. Run parts in order. Safe to re-run.
-- ============================================================================
-- 7. Customer cancellations and refund requests
-- ============================================================================

-- Customers cancel their own order for free until it starts processing.
create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'Please sign in.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null or v_order.customer_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;
  if v_order.status not in ('pending', 'confirmed') then
    raise exception 'This order can no longer be cancelled here. Open a support ticket and we will help.';
  end if;

  update public.orders
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now(),
      notes = case
        when nullif(btrim(p_reason), '') is null then notes
        else coalesce(notes || E'\n', '') || 'Cancelled by customer: ' || left(btrim(p_reason), 300)
      end
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.cancel_order(uuid, text) to authenticated;

create table if not exists public.refund_requests (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders(id) on delete cascade,
  requested_by         uuid references public.users(id) on delete set null,
  kind                 text not null check (kind in ('return', 'not_received')),
  reason               text not null check (char_length(reason) between 10 and 1000),
  status               text not null default 'requested'
                         check (status in ('requested', 'approved', 'rejected', 'completed')),
  refund_amount        numeric(12,2),
  admin_note           text,
  resolved_by          uuid references public.users(id) on delete set null,
  resolved_at          timestamptz,
  customer_refunded_at timestamptz,
  created_at           timestamptz not null default now()
);

-- At most one open request per order.
create unique index if not exists idx_refund_one_open
  on public.refund_requests(order_id) where status in ('requested', 'approved');
create index if not exists idx_refund_status on public.refund_requests(status, created_at desc);

alter table public.refund_requests enable row level security;

drop policy if exists "refund requests visible to participants" on public.refund_requests;
create policy "refund requests visible to participants" on public.refund_requests for select
  using (
    requested_by = auth.uid()
    or public.app_user_role() = 'admin'
    or exists (select 1 from public.orders o where o.id = refund_requests.order_id and o.dropshipper_id = auth.uid())
  );

-- The return window (7 days after delivery) matches POLICY.returnWindowDays in lib/site.ts.
create or replace function public.request_refund(p_order_id uuid, p_kind text, p_reason text)
returns public.refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_req   public.refund_requests;
begin
  if auth.uid() is null then
    raise exception 'Please sign in.';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order is null or v_order.customer_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;

  if p_kind not in ('return', 'not_received') then
    raise exception 'Invalid request type';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'Please describe the problem (at least 10 characters).';
  end if;
  if v_order.status not in ('shipped', 'delivered') then
    raise exception 'Refunds can be requested after an order has shipped. Pending orders can be cancelled instead.';
  end if;
  if p_kind = 'not_received' and v_order.status <> 'shipped' then
    raise exception '"Not received" only applies to orders that are still marked shipped.';
  end if;
  if p_kind = 'return' and v_order.status <> 'delivered' then
    raise exception 'Returns can be requested once the order is marked delivered.';
  end if;
  if v_order.status = 'delivered'
     and now() > coalesce(v_order.delivered_at, v_order.updated_at) + interval '7 days' then
    raise exception 'The 7-day return window for this order has passed. Please open a support ticket.';
  end if;

  begin
    insert into public.refund_requests (order_id, requested_by, kind, reason, refund_amount)
    values (p_order_id, auth.uid(), p_kind, btrim(p_reason), v_order.total)
    returning * into v_req;
  exception when unique_violation then
    raise exception 'There is already an open request for this order.';
  end;

  return v_req;
end;
$$;

grant execute on function public.request_refund(uuid, text, text) to authenticated;
