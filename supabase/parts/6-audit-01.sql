-- audit-log.sql part 1 of 2. Run parts in order. Safe to re-run.

-- ============================================================================
-- Audit log: an append-only record of admin and money-related actions
-- (supplier approvals, role changes, refunds, order cancellations, earnings,
-- settings, delivery rates, hidden reviews and every withdrawal step).
--
-- Paste into the Supabase SQL editor and Run. Safe to re-run. Run it AFTER
-- payments.sql and BEFORE payouts.sql (schema.sql already contains
-- everything, in order).
--
-- Only admins can read it (Admin > Audit log). Nobody can edit or delete an
-- entry, not even with the service-role key.
-- ============================================================================

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  -- No foreign key on purpose: entries must outlive the accounts they mention.
  actor_id    uuid,
  actor_role  text not null default 'system', -- 'admin', 'supplier', ... or 'system' (webhooks, jobs, SQL editor)
  action      text not null,                  -- e.g. 'payout.approved', 'supplier.updated'
  entity_type text not null,
  entity_id   text,
  summary     text not null default '',
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_created on public.audit_log(created_at desc);
create index if not exists idx_audit_log_entity on public.audit_log(entity_type, entity_id, created_at desc);
create index if not exists idx_audit_log_actor on public.audit_log(actor_id, created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "admin reads audit log" on public.audit_log;
create policy "admin reads audit log" on public.audit_log for select
  using (public.app_user_role() = 'admin');

-- Entries are only ever written by the functions below.
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

create or replace function public.audit_log_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'The audit log cannot be changed or deleted.';
end;
$$;

drop trigger if exists audit_log_no_update on public.audit_log;
create trigger audit_log_no_update
  before update or delete on public.audit_log
  for each row execute function public.audit_log_is_append_only();

drop trigger if exists audit_log_no_truncate on public.audit_log;
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.audit_log_is_append_only();

-- Writes one entry. The actor is the signed-in user, or p_actor when the server
-- acts for an admin with the service-role key. Internal: not callable from the app.
create or replace function public.log_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_summary     text,
  p_details     jsonb default '{}'::jsonb,
  p_actor       uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(p_actor, auth.uid());
begin
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, summary, details)
  values (
    v_actor,
    case when v_actor is null then 'system'
         else coalesce((select role from public.users where id = v_actor), 'unknown') end,
    p_action, p_entity_type, p_entity_id,
    coalesce(p_summary, ''), coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_audit(text, text, text, text, jsonb, uuid) from public, anon, authenticated;

-- ── Change triggers ─────────────────────────────────────────────────────────
-- Generic: records changes to the listed columns of a row.
-- Trigger arguments: entity type, id column, then the columns to watch.
create or replace function public.trg_audit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old     jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new     jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row     jsonb := coalesce(v_new, v_old);
  v_details jsonb := '{}'::jsonb;
  v_parts   text[] := '{}';
  v_col     text;
  i         int;
begin
  for i in 2 .. tg_nargs - 1 loop
    v_col := tg_argv[i];
    if tg_op = 'UPDATE' then
      if (v_old -> v_col) is distinct from (v_new -> v_col) then
        v_details := v_details || jsonb_build_object(v_col, jsonb_build_object('from', v_old -> v_col, 'to', v_new -> v_col));
        v_parts := v_parts || (v_col || ': ' || coalesce(v_old ->> v_col, '—') || ' → ' || coalesce(v_new ->> v_col, '—'));
      end if;
    else
      v_details := v_details || jsonb_build_object(v_col, v_row -> v_col);
      v_parts := v_parts || (v_col || ': ' || coalesce(v_row ->> v_col, '—'));
    end if;
  end loop;

  if tg_op = 'UPDATE' and v_details = '{}'::jsonb then
    return null;
  end if;

  perform public.log_audit(
    tg_argv[0] || '.' || case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    tg_argv[0],
    v_row ->> tg_argv[1],
    array_to_string(v_parts, '; '),
    v_details
  );
  return null;
end;
$$;

revoke all on function public.trg_audit_changes() from public, anon, authenticated;

-- Roles can only be changed by an administrator (see guard_user_privileged_columns).
drop trigger if exists trg_audit_user_role on public.users;
create trigger trg_audit_user_role
  after update of role on public.users
  for each row execute function public.trg_audit_changes('user', 'id', 'role', 'email');

drop trigger if exists trg_audit_supplier on public.supplier_profiles;
create trigger trg_audit_supplier
  after update of is_approved, is_verified, rating on public.supplier_profiles
  for each row execute function public.trg_audit_changes('supplier', 'id', 'is_approved', 'is_verified', 'rating', 'business_name');
