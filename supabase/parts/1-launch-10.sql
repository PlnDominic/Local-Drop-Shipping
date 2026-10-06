-- launch-features.sql part 10 of 10. Run parts in order. Safe to re-run.
create or replace function public.post_ticket_message(
  p_ticket_id uuid,
  p_body      text,
  p_internal  boolean default false
)
returns public.ticket_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_is_admin boolean;
  v_role     text;
  v_name     text;
  v_ticket   public.support_tickets;
  v_msg      public.ticket_messages;
begin
  if v_uid is null then
    raise exception 'Please sign in.';
  end if;
  if not public.can_access_ticket(p_ticket_id) then
    raise exception 'Ticket not found';
  end if;

  v_is_admin := public.app_user_role() = 'admin';
  if p_internal and not v_is_admin then
    raise exception 'Only the support team can add internal notes.';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if v_ticket.status = 'closed' and not v_is_admin then
    raise exception 'This ticket is closed. Open a new ticket or ask to reopen it.';
  end if;

  select role, coalesce(nullif(full_name, ''), split_part(email, '@', 1))
  into v_role, v_name from public.users where id = v_uid;

  insert into public.ticket_messages (ticket_id, author_id, author_name, author_role, body, is_internal)
  values (p_ticket_id, v_uid, case when v_is_admin then 'Support team' else v_name end,
          v_role, btrim(p_body), p_internal)
  returning * into v_msg;

  if not p_internal then
    update public.support_tickets
    set last_message_at = now(),
        updated_at = now(),
        status = case
          when v_is_admin and status in ('open', 'in_progress') then 'waiting'
          when not v_is_admin and status in ('waiting', 'resolved') then 'open'
          else status
        end
    where id = p_ticket_id;
  end if;

  return v_msg;
end;
$$;

grant execute on function public.post_ticket_message(uuid, text, boolean) to authenticated;

-- Admins set any status; the person who opened the ticket can close or reopen it.
create or replace function public.set_ticket_status(p_ticket_id uuid, p_status text)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.support_tickets;
  v_is_admin boolean := public.app_user_role() = 'admin';
begin
  if auth.uid() is null then
    raise exception 'Please sign in.';
  end if;
  if p_status not in ('open', 'in_progress', 'waiting', 'resolved', 'closed') then
    raise exception 'Invalid status';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id;
  if v_ticket is null or not public.can_access_ticket(p_ticket_id) then
    raise exception 'Ticket not found';
  end if;
  if not v_is_admin and not (v_ticket.created_by = auth.uid() and p_status in ('open', 'closed')) then
    raise exception 'You can only close or reopen your own tickets.';
  end if;

  update public.support_tickets set status = p_status, updated_at = now()
  where id = p_ticket_id returning * into v_ticket;
  return v_ticket;
end;
$$;

grant execute on function public.set_ticket_status(uuid, text) to authenticated;


-- ============================================================================
-- 10. Receipts: remember that the receipt email went out
-- ============================================================================

create or replace function public.mark_receipt_emailed(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_done boolean;
begin
  update public.orders
  set receipt_emailed_at = now()
  where id = p_order_id
    and receipt_emailed_at is null
    and (customer_id = auth.uid() or public.app_user_role() = 'admin')
  returning true into v_done;
  return coalesce(v_done, false);
end;
$$;

grant execute on function public.mark_receipt_emailed(uuid) to authenticated;

-- Make the API pick up the new functions straight away.
notify pgrst, 'reload schema';
