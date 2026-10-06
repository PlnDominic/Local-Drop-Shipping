-- launch-features.sql part 7 of 10. Run parts in order. Safe to re-run.
-- Admin decision. Approving refunds the order (earnings are taken back from the
-- dropshipper and suppliers); rejecting needs a note for the customer.
create or replace function public.resolve_refund(
  p_request_id       uuid,
  p_approve          boolean,
  p_note             text default null,
  p_include_delivery boolean default true
)
returns public.refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req    public.refund_requests;
  v_order  public.orders;
  v_amount numeric;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can resolve refund requests.';
  end if;

  select * into v_req from public.refund_requests where id = p_request_id for update;
  if v_req is null then
    raise exception 'Request not found';
  end if;
  if v_req.status <> 'requested' then
    raise exception 'This request has already been resolved.';
  end if;

  if not p_approve then
    if nullif(btrim(p_note), '') is null then
      raise exception 'Please give the customer a reason for rejecting.';
    end if;
    update public.refund_requests
    set status = 'rejected', admin_note = btrim(p_note), resolved_by = auth.uid(), resolved_at = now()
    where id = p_request_id
    returning * into v_req;
    return v_req;
  end if;

  select * into v_order from public.orders where id = v_req.order_id for update;
  v_amount := v_order.subtotal + v_order.platform_fee
              + case when p_include_delivery then v_order.delivery_fee else 0 end;

  update public.refund_requests
  set status = 'approved', refund_amount = v_amount, admin_note = nullif(btrim(p_note), ''),
      resolved_by = auth.uid(), resolved_at = now()
  where id = p_request_id
  returning * into v_req;

  perform public.reverse_order_earnings(v_order.id);

  update public.orders
  set status = 'refunded', cancelled_at = now(), updated_at = now()
  where id = v_order.id;

  return v_req;
end;
$$;

grant execute on function public.resolve_refund(uuid, boolean, text, boolean) to authenticated;

-- Admin records that the customer has been paid back (mobile money, etc.).
create or replace function public.complete_refund(p_request_id uuid, p_note text default null)
returns public.refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.refund_requests;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can complete refunds.';
  end if;

  update public.refund_requests
  set status = 'completed',
      customer_refunded_at = now(),
      admin_note = coalesce(nullif(btrim(p_note), ''), admin_note)
  where id = p_request_id and status = 'approved'
  returning * into v_req;

  if v_req is null then
    raise exception 'Only approved requests can be marked as paid back.';
  end if;
  return v_req;
end;
$$;

grant execute on function public.complete_refund(uuid, text) to authenticated;


-- ============================================================================
-- 8. Supplier verification (Ghana Card + business documents)
-- ============================================================================

alter table public.supplier_profiles
  add column if not exists is_verified boolean not null default false;

-- Approval, rating and the Verified badge can only be set by admins.
create or replace function public.guard_supplier_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.app_user_role() = 'admin' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_approved := false;
    new.is_verified := false;
    new.rating := 0;
  else
    new.is_approved := old.is_approved;
    new.is_verified := old.is_verified;
    new.rating := old.rating;
  end if;
  return new;
end;
$$;

create table if not exists public.supplier_verifications (
  supplier_id           uuid primary key references public.supplier_profiles(id) on delete cascade,
  ghana_card_number     text not null check (ghana_card_number ~ '^GHA-[0-9]{9}-[0-9]$'),
  business_reg_number   text,
  ghana_card_front_path text not null,
  ghana_card_back_path  text,
  business_doc_path     text,
  status                text not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
  rejection_reason      text,
  submitted_at          timestamptz not null default now(),
  reviewed_at           timestamptz,
  reviewed_by           uuid references public.users(id) on delete set null
);

alter table public.supplier_verifications enable row level security;

drop policy if exists "supplier reads own verification" on public.supplier_verifications;
create policy "supplier reads own verification" on public.supplier_verifications for select
  using (supplier_id = auth.uid() or public.app_user_role() = 'admin');
