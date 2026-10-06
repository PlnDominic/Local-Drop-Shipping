-- engagement-features.sql part 6 of 8. Run parts in order. Safe to re-run.
create trigger trg_order_status_notify
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.trg_order_status_notify();


-- ============================================================================
-- 6. Reviews and ratings (delivered buyers only)
-- ============================================================================

create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  rating        integer not null check (rating between 1 and 5),
  title         text not null default '' check (char_length(title) <= 120),
  body          text not null default '' check (char_length(body) <= 2000),
  reviewer_name text not null default 'Verified buyer',
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists idx_reviews_product on public.reviews(product_id, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "reviews are public unless hidden" on public.reviews;
create policy "reviews are public unless hidden" on public.reviews for select
  using (not is_hidden or user_id = auth.uid() or public.app_user_role() = 'admin');

-- The delivered order that lets this user review this product, if any.
create or replace function public.reviewable_order(p_product_id uuid, p_user_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select o.id
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.customer_id = p_user_id
    and o.status = 'delivered'
    and oi.product_id = p_product_id
  order by o.delivered_at desc nulls last
  limit 1;
$$;

revoke all on function public.reviewable_order(uuid, uuid) from public, anon, authenticated;

create or replace function public.can_review_product(p_product_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() is not null and public.reviewable_order(p_product_id, auth.uid()) is not null;
$$;

grant execute on function public.can_review_product(uuid) to authenticated;

create or replace function public.submit_review(
  p_product_id uuid,
  p_rating     integer,
  p_title      text,
  p_body       text
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order  uuid;
  v_name   text;
  v_parts  text[];
  v_row    public.reviews;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to leave a review.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5 stars.';
  end if;

  v_order := public.reviewable_order(p_product_id, auth.uid());
  if v_order is null then
    raise exception 'Only customers whose order was delivered can review this product.';
  end if;

  -- "Kofi A." style name: first name plus the initial of the last.
  select full_name into v_name from public.users where id = auth.uid();
  v_parts := regexp_split_to_array(btrim(coalesce(v_name, '')), '\s+');
  v_name := case
    when coalesce(v_parts[1], '') = '' then 'Verified buyer'
    when array_length(v_parts, 1) > 1 then v_parts[1] || ' ' || upper(left(v_parts[array_length(v_parts, 1)], 1)) || '.'
    else v_parts[1]
  end;

  insert into public.reviews (product_id, user_id, order_id, rating, title, body, reviewer_name)
  values (p_product_id, auth.uid(), v_order, p_rating, left(btrim(coalesce(p_title, '')), 120),
          left(btrim(coalesce(p_body, '')), 2000), v_name)
  on conflict (product_id, user_id) do update
    set rating = excluded.rating, title = excluded.title, body = excluded.body,
        order_id = excluded.order_id, reviewer_name = excluded.reviewer_name, updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.submit_review(uuid, integer, text, text) from public, anon;
grant execute on function public.submit_review(uuid, integer, text, text) to authenticated;

create or replace function public.set_review_hidden(p_review_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can moderate reviews.';
  end if;
  update public.reviews set is_hidden = p_hidden where id = p_review_id;
end;
$$;

grant execute on function public.set_review_hidden(uuid, boolean) to authenticated;

-- Aggregates are public; they only count visible reviews.
create or replace view public.product_rating_stats as
  select product_id,
         round(avg(rating)::numeric, 2) as average,
         count(*)::int as review_count
  from public.reviews
  where not is_hidden
  group by product_id;
