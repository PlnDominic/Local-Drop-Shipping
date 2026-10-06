-- launch-features.sql part 1 of 10. Run parts in order. Safe to re-run.
-- ============================================================================
-- Launch features: GhanaPost GPS validation, delivery fees, cancellations and
-- refunds, supplier verification, support tickets and receipts.
--
-- Paste this whole file into the Supabase SQL editor and Run. Safe to re-run.
-- Requires the base schema (supabase/schema.sql) to be applied first.
-- Then run supabase/catalog-features.sql, which replaces create_order and
-- update_order_status with variant-aware versions. Never re-run this file on its
-- own afterwards without re-running catalog-features.sql too.
-- ============================================================================


-- ============================================================================
-- 1. GhanaPost GPS addresses (e.g. GA-184-9022)
-- ============================================================================

create or replace function public.is_valid_ghana_post_gps(p text)
returns boolean
language sql
immutable
as $$
  select p is not null
     and upper(regexp_replace(btrim(p), '\s+', '', 'g')) ~ '^[A-Z]{2,3}-?[0-9]{3,4}-?[0-9]{4}$';
$$;

create or replace function public.normalize_ghana_post_gps(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null or btrim(p) = '' then null
    else regexp_replace(
      upper(regexp_replace(btrim(p), '\s+', '', 'g')),
      '^([A-Z]{2,3})-?([0-9]{3,4})-?([0-9]{4})$', '\1-\2-\3')
  end;
$$;


-- ============================================================================
-- 2. Delivery zones: fee and delivery time by region (and optionally city).
--    The fee numbers seeded below are PLACEHOLDERS. Review and edit them in the
--    admin dashboard (Delivery tab) before launch.
-- ============================================================================

create table if not exists public.delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  region     text not null check (char_length(btrim(region)) > 0),
  city       text,
  fee        numeric(10,2) not null check (fee >= 0),
  min_days   integer not null default 1 check (min_days >= 0),
  max_days   integer not null default 3,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_days >= min_days)
);

-- In case the table was created earlier with fewer columns.
alter table public.delivery_zones
  add column if not exists is_active  boolean not null default true,
  add column if not exists city       text,
  add column if not exists updated_at timestamptz not null default now();

-- One row per region, plus at most one per (region, city).
create unique index if not exists idx_delivery_zones_key
  on public.delivery_zones (lower(region), (coalesce(lower(city), '')));

alter table public.delivery_zones enable row level security;

drop policy if exists "active delivery zones are public" on public.delivery_zones;
create policy "active delivery zones are public" on public.delivery_zones for select
  using (is_active or public.app_user_role() = 'admin');

drop policy if exists "admin manages delivery zones" on public.delivery_zones;
create policy "admin manages delivery zones" on public.delivery_zones for all
  using (public.app_user_role() = 'admin')
  with check (public.app_user_role() = 'admin');

insert into public.delivery_zones (region, city, fee, min_days, max_days) values
  ('Greater Accra', null, 25, 1, 2),
  ('Ashanti',       null, 35, 2, 3),
  ('Central',       null, 35, 2, 3),
  ('Eastern',       null, 35, 2, 3),
  ('Western',       null, 40, 3, 4),
  ('Western North', null, 45, 3, 5),
  ('Volta',         null, 40, 3, 4),
  ('Oti',           null, 50, 4, 5),
  ('Bono',          null, 45, 3, 5),
  ('Bono East',     null, 45, 3, 5),
  ('Ahafo',         null, 45, 3, 5),
  ('Northern',      null, 60, 4, 6),
  ('Savannah',      null, 60, 4, 6),
  ('North East',    null, 65, 5, 7),
  ('Upper East',    null, 65, 5, 7),
  ('Upper West',    null, 65, 5, 7)
on conflict (lower(region), (coalesce(lower(city), ''))) do nothing;

-- Best matching active zone: a city rate wins over the region default.
-- Returns null when the region isn't served.
create or replace function public.get_delivery_quote(p_region text, p_city text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(q) from (
    select fee,
           min_days as "minDays",
           max_days as "maxDays",
           (city is not null) as "cityRate"
    from public.delivery_zones
    where is_active
      and lower(region) = lower(btrim(coalesce(p_region, '')))
      and (city is null or lower(city) = lower(btrim(coalesce(p_city, ''))))
    order by (city is not null) desc
    limit 1
  ) q;
$$;

grant execute on function public.get_delivery_quote(text, text) to anon, authenticated;
