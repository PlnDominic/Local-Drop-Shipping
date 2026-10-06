-- engagement-features.sql part 1 of 8. Run parts in order. Safe to re-run.
-- ============================================================================
-- Engagement features: stock control + low-stock alerts, order notifications
-- (email / SMS / WhatsApp outbox), verified-buyer reviews, trackable share
-- links, and a public bucket for product photos.
--
-- Paste this whole file into the Supabase SQL editor and Run. Safe to re-run.
-- Run it AFTER launch-features.sql and catalog-features.sql (schema.sql already
-- contains all of them in order).
--
-- Design notes
--  * Stock is reserved by a trigger on order_items, so create_order does not
--    need to change. The decrement is one atomic UPDATE ... WHERE stock >= qty,
--    so two buyers can never take the last unit.
--  * Stock comes back (trigger on orders) when an order is cancelled or
--    refunded before it shipped.
--  * Notifications go into an outbox. A server route (service role only) sends
--    them. Anything that fails here is swallowed so an order is never lost
--    because a message could not be queued.
-- ============================================================================


-- ============================================================================
-- 1. Phone helper (Ghana numbers -> +233XXXXXXXXX)
-- ============================================================================

create or replace function public.normalize_gh_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  v text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if v ~ '^0[0-9]{9}$' then
    return '+233' || substr(v, 2);
  elsif v ~ '^233[0-9]{9}$' then
    return '+' || v;
  elsif v ~ '^[0-9]{9}$' then
    return '+233' || v;
  end if;
  return null;
end;
$$;


-- ============================================================================
-- 2. Stock: threshold, reserve on order, restore on cancel
-- ============================================================================

alter table public.products
  add column if not exists low_stock_threshold integer not null default 5
    check (low_stock_threshold >= 0);

alter table public.orders
  add column if not exists stock_restored boolean not null default false;


-- ============================================================================
-- 3. Notification preferences and outbox
-- ============================================================================

create table if not exists public.notification_prefs (
  user_id          uuid primary key references public.users(id) on delete cascade,
  email_enabled    boolean not null default true,
  sms_enabled      boolean not null default true,
  whatsapp_enabled boolean not null default false,
  phone            text,
  updated_at       timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "owner reads own prefs" on public.notification_prefs;
create policy "owner reads own prefs" on public.notification_prefs for select
  using (user_id = auth.uid() or public.app_user_role() = 'admin');

create table if not exists public.notification_outbox (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete set null,
  event           text not null,
  channel         text not null check (channel in ('email', 'sms', 'whatsapp')),
  to_address      text not null,
  subject         text not null default '',
  body            text not null,
  data            jsonb not null default '{}'::jsonb,
  dedupe_key      text,
  status          text not null default 'pending'
                    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts        integer not null default 0,
  last_error      text,
  next_attempt_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);

create unique index if not exists idx_outbox_dedupe
  on public.notification_outbox(dedupe_key, channel) where dedupe_key is not null;
create index if not exists idx_outbox_due
  on public.notification_outbox(status, next_attempt_at);

alter table public.notification_outbox enable row level security;

drop policy if exists "admin reads outbox" on public.notification_outbox;
create policy "admin reads outbox" on public.notification_outbox for select
  using (public.app_user_role() = 'admin');
