-- engagement-features.sql part 2 of 8. Run parts in order. Safe to re-run.
-- Save my own preferences (phone is validated and normalised).
create or replace function public.save_notification_prefs(
  p_email    boolean,
  p_sms      boolean,
  p_whatsapp boolean,
  p_phone    text
)
returns public.notification_prefs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_row   public.notification_prefs;
begin
  if auth.uid() is null then
    raise exception 'Please sign in.';
  end if;

  v_phone := public.normalize_gh_phone(p_phone);
  if nullif(btrim(coalesce(p_phone, '')), '') is not null and v_phone is null then
    raise exception 'Enter a valid Ghana phone number, like 024 123 4567.';
  end if;
  if (p_sms or p_whatsapp) and v_phone is null then
    raise exception 'Add a phone number to receive SMS or WhatsApp alerts.';
  end if;

  insert into public.notification_prefs (user_id, email_enabled, sms_enabled, whatsapp_enabled, phone)
  values (auth.uid(), p_email, p_sms, p_whatsapp, v_phone)
  on conflict (user_id) do update
    set email_enabled = excluded.email_enabled,
        sms_enabled = excluded.sms_enabled,
        whatsapp_enabled = excluded.whatsapp_enabled,
        phone = excluded.phone,
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.save_notification_prefs(boolean, boolean, boolean, text) from public, anon;
grant execute on function public.save_notification_prefs(boolean, boolean, boolean, text) to authenticated;

-- Queues one message per enabled channel. Internal: never raises.
-- SMS is reserved for the events people act on right away.
create or replace function public.enqueue_notification(
  p_user_id    uuid,
  p_event      text,
  p_subject    text,
  p_body       text,
  p_data       jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_phone      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text;
  v_prefs    public.notification_prefs;
  v_phone    text;
  v_email_on boolean := true;
  v_sms_on   boolean := true;
  v_wa_on    boolean := false;
  v_sms_events constant text[] := array['order_placed', 'order_shipped', 'order_delivered', 'order_cancelled'];
begin
  begin
    if p_user_id is not null then
      select email into v_email from public.users where id = p_user_id;
      select * into v_prefs from public.notification_prefs where user_id = p_user_id;
      if v_prefs.user_id is not null then
        v_email_on := v_prefs.email_enabled;
        v_sms_on := v_prefs.sms_enabled;
        v_wa_on := v_prefs.whatsapp_enabled;
      end if;
    end if;

    v_phone := coalesce(public.normalize_gh_phone(v_prefs.phone), public.normalize_gh_phone(p_phone));

    if v_email_on and nullif(v_email, '') is not null then
      insert into public.notification_outbox (user_id, event, channel, to_address, subject, body, data, dedupe_key)
      values (p_user_id, p_event, 'email', v_email, p_subject, p_body, p_data, p_dedupe_key)
      on conflict do nothing;
    end if;

    if v_sms_on and v_phone is not null and p_event = any (v_sms_events) then
      insert into public.notification_outbox (user_id, event, channel, to_address, subject, body, data, dedupe_key)
      values (p_user_id, p_event, 'sms', v_phone, '', p_body, p_data, p_dedupe_key)
      on conflict do nothing;
    end if;

    if v_wa_on and v_phone is not null then
      insert into public.notification_outbox (user_id, event, channel, to_address, subject, body, data, dedupe_key)
      values (p_user_id, p_event, 'whatsapp', v_phone, p_subject, p_body, p_data, p_dedupe_key)
      on conflict do nothing;
    end if;
  exception when others then
    -- Never let a notification problem break the action that triggered it.
    null;
  end;
end;
$$;

revoke all on function public.enqueue_notification(uuid, text, text, text, jsonb, text, text) from public, anon, authenticated;

-- Used by the sending route (service role key only).
create or replace function public.claim_notifications(p_limit integer default 25)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A row stuck in 'sending' for 10 minutes means the sender crashed: retry it.
  update public.notification_outbox
  set status = 'pending'
  where status = 'sending' and next_attempt_at < now() - interval '10 minutes';

  return query
  with due as (
    select id from public.notification_outbox
    where status = 'pending' and next_attempt_at <= now()
    order by created_at
    limit greatest(1, least(coalesce(p_limit, 25), 100))
    for update skip locked
  )
  update public.notification_outbox o
  set status = 'sending', attempts = o.attempts + 1, next_attempt_at = now()
  from due
  where o.id = due.id
  returning o.*;
end;
$$;
