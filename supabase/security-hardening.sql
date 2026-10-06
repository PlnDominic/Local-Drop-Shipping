-- ============================================================================
-- Security hardening: stop users from granting themselves privileges.
-- Paste this whole file into the Supabase SQL editor and Run. Safe to re-run.
--
-- Closes three holes:
--  1. Sign-up trusted the role sent by the browser, so anyone could register
--     as 'admin'. New accounts can now only be customer/dropshipper/supplier.
--  2. Users could update their own public.users row, including `role`
--     (-> admin) and `is_verified`. Now only the normal customer ->
--     dropshipper/supplier upgrade is allowed; everything else needs an admin.
--  3. Suppliers could set is_approved = true on their own profile, skipping
--     admin approval. Only admins can change approval/rating now.
--
-- Changes made from the SQL editor or with the service-role key (no signed-in
-- user, auth.uid() is null) are still allowed, so you can always fix data.
-- ============================================================================

-- 1. Only allow self-selectable roles at sign-up; anything else becomes 'customer'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'customer');
begin
  if v_role not in ('customer', 'dropshipper', 'supplier') then
    v_role := 'customer';
  end if;

  insert into public.users (id, full_name, email, phone, role, is_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    v_role,
    false
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 2. Guard role / is_verified on public.users.
create or replace function public.guard_user_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No signed-in user (SQL editor, service role) or an admin: allow.
  if auth.uid() is null or public.app_user_role() = 'admin' then
    return new;
  end if;

  if new.role is distinct from old.role then
    if not (old.role = 'customer' and new.role in ('dropshipper', 'supplier')) then
      raise exception 'You are not allowed to change your role.';
    end if;
  end if;

  -- Verification is granted by admins only; quietly ignore attempts.
  new.is_verified := old.is_verified;
  return new;
end;
$$;

drop trigger if exists guard_user_privileged_columns on public.users;
create trigger guard_user_privileged_columns
  before update on public.users
  for each row execute function public.guard_user_privileged_columns();

-- 3. Guard supplier approval / rating on public.supplier_profiles.
-- (is_verified is the supplier "Verified" badge granted by admins; see launch-features.sql)
alter table public.supplier_profiles
  add column if not exists is_verified boolean not null default false;

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

drop trigger if exists guard_supplier_privileged_columns on public.supplier_profiles;
create trigger guard_supplier_privileged_columns
  before insert or update on public.supplier_profiles
  for each row execute function public.guard_supplier_privileged_columns();

-- Keep these helpers off the public API surface.
revoke all on function public.guard_user_privileged_columns() from public, anon, authenticated;
revoke all on function public.guard_supplier_privileged_columns() from public, anon, authenticated;
