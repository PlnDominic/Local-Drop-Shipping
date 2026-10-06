-- engagement-features.sql part 7 of 8. Run parts in order. Safe to re-run.
create or replace view public.supplier_rating_stats as
  select p.supplier_id,
         round(avg(r.rating)::numeric, 2) as average,
         count(*)::int as review_count
  from public.reviews r
  join public.products p on p.id = r.product_id
  where not r.is_hidden
  group by p.supplier_id;

grant select on public.product_rating_stats to anon, authenticated;
grant select on public.supplier_rating_stats to anon, authenticated;


-- ============================================================================
-- 7. Share links with tracking
-- ============================================================================

create table if not exists public.share_links (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  owner_id   uuid not null references public.dropshipper_profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  channel    text not null check (channel in ('whatsapp', 'facebook', 'instagram', 'other')),
  clicks     integer not null default 0,
  created_at timestamptz not null default now()
);

-- One stable link per (owner, product-or-store, channel).
create unique index if not exists idx_share_links_target
  on public.share_links(owner_id, coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid), channel);

alter table public.share_links enable row level security;

drop policy if exists "owner reads share links" on public.share_links;
create policy "owner reads share links" on public.share_links for select
  using (owner_id = auth.uid() or public.app_user_role() = 'admin');

create table if not exists public.share_link_days (
  link_id uuid not null references public.share_links(id) on delete cascade,
  day     date not null default current_date,
  clicks  integer not null default 0,
  primary key (link_id, day)
);

alter table public.share_link_days enable row level security;

drop policy if exists "owner reads share link days" on public.share_link_days;
create policy "owner reads share link days" on public.share_link_days for select
  using (exists (select 1 from public.share_links l
                 where l.id = share_link_days.link_id
                   and (l.owner_id = auth.uid() or public.app_user_role() = 'admin')));

alter table public.orders
  add column if not exists share_link_id uuid references public.share_links(id) on delete set null;

create or replace function public.get_or_create_share_link(p_product_id uuid, p_channel text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_try  int := 0;
begin
  if auth.uid() is null or not exists (select 1 from public.dropshipper_profiles where id = auth.uid()) then
    raise exception 'Only dropshippers with a store can create share links.';
  end if;
  if p_channel not in ('whatsapp', 'facebook', 'instagram', 'other') then
    raise exception 'Unknown channel';
  end if;
  if p_product_id is not null and not exists (
    select 1 from public.dropshipper_products
    where dropshipper_id = auth.uid() and product_id = p_product_id and is_published
  ) then
    raise exception 'That product is not in your store.';
  end if;

  select code into v_code from public.share_links
  where owner_id = auth.uid()
    and coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(p_product_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and channel = p_channel;
  if v_code is not null then
    return v_code;
  end if;

  loop
    v_code := substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 8);
    begin
      insert into public.share_links (code, owner_id, product_id, channel)
      values (v_code, auth.uid(), p_product_id, p_channel);
      return v_code;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then
        -- Probably lost a race for the same target: return the winner's code.
        select code into v_code from public.share_links
        where owner_id = auth.uid()
          and coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid)
              = coalesce(p_product_id, '00000000-0000-0000-0000-000000000000'::uuid)
          and channel = p_channel;
        if v_code is not null then
          return v_code;
        end if;
        raise;
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.get_or_create_share_link(uuid, text) from public, anon;
grant execute on function public.get_or_create_share_link(uuid, text) to authenticated;
