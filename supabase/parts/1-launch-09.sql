-- launch-features.sql part 9 of 10. Run parts in order. Safe to re-run.
-- ============================================================================
-- 9. Support and dispute tickets
-- ============================================================================

create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  ticket_number   text not null unique,
  created_by      uuid not null references public.users(id) on delete cascade,
  order_id        uuid references public.orders(id) on delete set null,
  category        text not null default 'other'
                    check (category in ('order', 'delivery', 'payment', 'refund', 'product', 'account', 'other')),
  subject         text not null check (char_length(btrim(subject)) between 3 and 120),
  status          text not null default 'open'
                    check (status in ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  author_id   uuid references public.users(id) on delete set null,
  author_name text not null default '',
  author_role text not null default 'customer',
  body        text not null check (char_length(btrim(body)) between 1 and 4000),
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_tickets_creator on public.support_tickets(created_by, last_message_at desc);
create index if not exists idx_tickets_order on public.support_tickets(order_id);
create index if not exists idx_tickets_status on public.support_tickets(status, last_message_at desc);
create index if not exists idx_ticket_messages_ticket on public.ticket_messages(ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;

-- Creator, admin, or anyone taking part in the linked order.
create or replace function public.can_access_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = p_ticket_id
      and (
        t.created_by = auth.uid()
        or public.app_user_role() = 'admin'
        or (t.order_id is not null and public.is_order_participant(t.order_id))
      )
  );
$$;

revoke all on function public.can_access_ticket(uuid) from public, anon;
grant execute on function public.can_access_ticket(uuid) to authenticated;

drop policy if exists "ticket participants read tickets" on public.support_tickets;
create policy "ticket participants read tickets" on public.support_tickets for select
  using (public.can_access_ticket(id));

drop policy if exists "ticket participants read messages" on public.ticket_messages;
create policy "ticket participants read messages" on public.ticket_messages for select
  using (
    public.can_access_ticket(ticket_id)
    and (is_internal = false or public.app_user_role() = 'admin')
  );

create or replace function public.create_ticket(
  p_category text,
  p_subject  text,
  p_body     text,
  p_order_id uuid default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    text;
  v_name    text;
  v_ticket  public.support_tickets;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'Please sign in.';
  end if;

  select role, coalesce(nullif(full_name, ''), split_part(email, '@', 1))
  into v_role, v_name from public.users where id = v_uid;

  if (select count(*) from public.support_tickets
      where created_by = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have opened a lot of tickets today. Please add to an existing ticket.';
  end if;
  if p_order_id is not null and not public.is_order_participant(p_order_id) then
    raise exception 'Order not found';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.support_tickets (ticket_number, created_by, order_id, category, subject)
      values (
        'TKT-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0'),
        v_uid, p_order_id, coalesce(nullif(p_category, ''), 'other'), btrim(p_subject)
      )
      returning * into v_ticket;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  insert into public.ticket_messages (ticket_id, author_id, author_name, author_role, body)
  values (v_ticket.id, v_uid, case when v_role = 'admin' then 'Support team' else v_name end, v_role, btrim(p_body));

  return v_ticket;
end;
$$;

grant execute on function public.create_ticket(text, text, text, uuid) to authenticated;
