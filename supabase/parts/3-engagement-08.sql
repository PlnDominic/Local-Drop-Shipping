-- engagement-features.sql part 8 of 8. Run parts in order. Safe to re-run.
-- Public: counts a visit and says where the link points.
create or replace function public.resolve_share_link(p_code text, p_count boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links;
  v_slug text;
begin
  select * into v_link from public.share_links where code = p_code;
  if v_link.id is null then
    return null;
  end if;

  select store_slug into v_slug from public.dropshipper_profiles where id = v_link.owner_id;
  if v_slug is null then
    return null;
  end if;

  -- Link-preview crawlers (WhatsApp, Facebook...) ask with p_count = false.
  if p_count then
    update public.share_links set clicks = clicks + 1 where id = v_link.id;
    insert into public.share_link_days (link_id, day, clicks) values (v_link.id, current_date, 1)
    on conflict (link_id, day) do update set clicks = public.share_link_days.clicks + 1;
  end if;

  return jsonb_build_object(
    'code', v_link.code, 'ownerId', v_link.owner_id, 'storeSlug', v_slug,
    'productId', v_link.product_id, 'channel', v_link.channel
  );
end;
$$;

grant execute on function public.resolve_share_link(text, boolean) to anon, authenticated;

-- Called right after checkout with the code remembered from the visit.
create or replace function public.attribute_order(p_order_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_link from public.share_links where code = p_code;
  if v_link.id is null then
    return false;
  end if;

  update public.orders
  set share_link_id = v_link.id
  where id = p_order_id
    and customer_id = auth.uid()
    and share_link_id is null
    and dropshipper_id = v_link.owner_id
    and created_at > now() - interval '15 minutes';

  return found;
end;
$$;

grant execute on function public.attribute_order(uuid, text) to authenticated;

-- My links with visits, orders and sales (cancelled and refunded excluded).
create or replace function public.my_share_stats()
returns table (
  code          text,
  channel       text,
  product_id    uuid,
  product_name  text,
  clicks        integer,
  orders        integer,
  sales         numeric,
  last_7_days   integer,
  created_at    timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    l.code, l.channel, l.product_id, p.name, l.clicks,
    coalesce(o.orders, 0)::int,
    coalesce(o.sales, 0),
    coalesce((select sum(d.clicks) from public.share_link_days d
              where d.link_id = l.id and d.day > current_date - 7), 0)::int,
    l.created_at
  from public.share_links l
  left join public.products p on p.id = l.product_id
  left join lateral (
    select count(*) as orders, sum(x.subtotal) as sales
    from public.orders x
    where x.share_link_id = l.id and x.status not in ('cancelled', 'refunded')
  ) o on true
  where l.owner_id = auth.uid()
  order by coalesce(o.sales, 0) desc, l.clicks desc;
$$;

grant execute on function public.my_share_stats() to authenticated;


-- ============================================================================
-- 8. Public bucket for product photos (<user_id>/<file>), compressed in the app
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anyone reads product images" on storage.objects;
create policy "anyone reads product images" on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "owner uploads product images" on storage.objects;
create policy "owner uploads product images" on storage.objects for insert
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owner deletes product images" on storage.objects;
create policy "owner deletes product images" on storage.objects for delete
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
