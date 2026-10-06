-- wishlist-invites.sql part 1 of 1. Run parts in order. Safe to re-run.
-- ============================================================================
-- Waitlist invites: track how many invites each signup got and who joined.
-- Paste into the Supabase SQL editor and Run. Safe to re-run. Run after
-- wishlist.sql (schema.sql already contains both, in order).
-- ============================================================================

alter table public.wishlist_signups
  add column if not exists invite_count   integer not null default 0,
  add column if not exists joined_at      timestamptz,
  add column if not exists joined_user_id uuid;

-- Called by the invite route after emails go out (admin only).
create or replace function public.mark_wishlist_invites_sent(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can send invites.';
  end if;
  update public.wishlist_signups
  set invited_at = now(), invite_count = invite_count + 1
  where id = any (p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

grant execute on function public.mark_wishlist_invites_sent(uuid[]) to authenticated;

-- When someone creates an account with a waitlist email, record that they joined.
create or replace function public.wishlist_mark_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wishlist_signups
  set joined_at = now(), joined_user_id = new.id
  where lower(email) = lower(new.email) and joined_at is null;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_wishlist_mark_joined on public.users;
create trigger trg_wishlist_mark_joined
  after insert on public.users
  for each row execute function public.wishlist_mark_joined();

-- Backfill people who already have accounts.
update public.wishlist_signups w
set joined_at = coalesce(u.created_at, now()), joined_user_id = u.id
from public.users u
where lower(u.email) = lower(w.email) and w.joined_at is null;

notify pgrst, 'reload schema';
