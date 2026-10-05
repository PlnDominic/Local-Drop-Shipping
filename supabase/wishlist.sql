-- ============================================================================
-- Pre-launch wishlist only. Paste this whole file into the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query -> Run) for the project the site uses.
-- Safe to run more than once. Requires the base schema (public.users and
-- public.app_user_role()) from supabase/schema.sql to already be applied.
-- ============================================================================

-- ============================================================================
-- Pre-launch wishlist: prospective dropshippers and suppliers leave their
-- email so they can be invited to create an account at launch. Emails are
-- admin-only; the public can only sign up (via join_wishlist) and see totals.
-- ============================================================================

create table if not exists public.wishlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  role       text not null check (role in ('dropshipper','supplier')),
  full_name  text not null default '' check (char_length(full_name) <= 80),
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, role)
);

alter table public.wishlist_signups enable row level security;

drop policy if exists "admin manages wishlist signups" on public.wishlist_signups;
create policy "admin manages wishlist signups" on public.wishlist_signups for all
  using (public.app_user_role() = 'admin')
  with check (public.app_user_role() = 'admin');

-- Returns true for a new signup, false if this email already joined for that role.
create or replace function public.join_wishlist(
  p_email text,
  p_role  text,
  p_name  text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.wishlist_signups (email, role, full_name)
  values (lower(btrim(p_email)), p_role, coalesce(btrim(p_name), ''))
  on conflict (email, role) do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;

-- Public social-proof counts; never exposes emails.
create or replace function public.wishlist_counts()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'dropshipper', count(*) filter (where role = 'dropshipper'),
    'supplier',    count(*) filter (where role = 'supplier')
  )
  from public.wishlist_signups;
$$;

grant execute on function public.join_wishlist(text, text, text) to anon, authenticated;
grant execute on function public.wishlist_counts() to anon, authenticated;
