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

create or replace function public.finish_notification(
  p_id     uuid,
  p_status text,
  p_error  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'Invalid status';
  end if;

  select attempts into v_attempts from public.notification_outbox where id = p_id;

  if p_status = 'failed' and v_attempts < 3 then
    -- Retry with a growing delay.
    update public.notification_outbox
    set status = 'pending', last_error = left(p_error, 500),
        next_attempt_at = now() + (v_attempts * interval '5 minutes')
    where id = p_id;
  else
    update public.notification_outbox
    set status = p_status, last_error = left(p_error, 500),
        sent_at = case when p_status = 'sent' then now() else sent_at end
    where id = p_id;
  end if;
end;
$$;

revoke all on function public.claim_notifications(integer) from public, anon, authenticated;
revoke all on function public.finish_notification(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
grant execute on function public.finish_notification(uuid, text, text) to service_role;

-- Admin overview of what has been sent.
create or replace function public.notification_summary()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select case when public.app_user_role() = 'admin' then
    coalesce((
      select jsonb_object_agg(k, c) from (
        select channel || ':' || status as k, count(*) as c
        from public.notification_outbox group by 1
      ) s
    ), '{}'::jsonb)
  else null end;
$$;

grant execute on function public.notification_summary() to authenticated;


-- ============================================================================
-- 4. Stock reservation, restore and low-stock alerts
-- ============================================================================

-- Tell a supplier a product (or option) is running low or sold out.
create or replace function public.notify_low_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_old        integer,
  p_new        integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name      text;
  v_supplier  uuid;
  v_threshold integer;
  v_label     text;
  v_what      text;
begin
  select name, supplier_id, low_stock_threshold into v_name, v_supplier, v_threshold
  from public.products where id = p_product_id;
  if v_supplier is null then
    return;
  end if;

  if p_variant_id is not null then
    select label into v_label from public.product_variants where id = p_variant_id;
  end if;
  v_what := v_name || coalesce(' (' || v_label || ')', '');

  if p_new = 0 then
    perform public.enqueue_notification(
      v_supplier, 'out_of_stock',
      v_what || ' is out of stock',
      v_what || ' just sold out. Restock it so customers can keep ordering.',
      jsonb_build_object('productId', p_product_id, 'variantId', p_variant_id),
      'oos:' || p_product_id || ':' || coalesce(p_variant_id::text, '-') || ':' || to_char(now(), 'YYYYMMDDHH24')
    );
  elsif p_new <= v_threshold and p_old > v_threshold then
    perform public.enqueue_notification(
      v_supplier, 'low_stock',
      v_what || ' is running low',
      'Only ' || p_new || ' left of ' || v_what || '. Restock soon to avoid missed orders.',
      jsonb_build_object('productId', p_product_id, 'variantId', p_variant_id, 'stock', p_new),
      'low:' || p_product_id || ':' || coalesce(p_variant_id::text, '-') || ':' || to_char(now(), 'YYYYMMDD')
    );
  end if;
exception when others then
  null;
end;
$$;

revoke all on function public.notify_low_stock(uuid, uuid, integer, integer) from public, anon, authenticated;

create or replace function public.reserve_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old    integer;
  v_new    integer;
  v_name   text;
  v_stock  integer;
begin
  if new.variant_id is not null then
    update public.product_variants
    set stock_qty = stock_qty - new.quantity, updated_at = now()
    where id = new.variant_id and stock_qty >= new.quantity
    returning stock_qty + new.quantity, stock_qty into v_old, v_new;

    if v_old is null then
      select stock_qty into v_stock from public.product_variants where id = new.variant_id;
      raise exception '% is out of stock%', coalesce(new.variant_label, 'That option'),
        case when coalesce(v_stock, 0) > 0 then ' (only ' || v_stock || ' left)' else '' end;
    end if;
  else
    update public.products
    set stock_qty = stock_qty - new.quantity, updated_at = now()
    where id = new.product_id and stock_qty >= new.quantity
    returning stock_qty + new.quantity, stock_qty into v_old, v_new;

    if v_old is null then
      select name, stock_qty into v_name, v_stock from public.products where id = new.product_id;
      raise exception '% is out of stock%', coalesce(v_name, 'This product'),
        case when coalesce(v_stock, 0) > 0 then ' (only ' || v_stock || ' left)' else '' end;
    end if;
  end if;

  perform public.notify_low_stock(new.product_id, new.variant_id, v_old, v_new);
  return new;
end;
$$;

drop trigger if exists trg_reserve_item_stock on public.order_items;
create trigger trg_reserve_item_stock
  before insert on public.order_items
  for each row execute function public.reserve_item_stock();

-- Cancelled or refunded before it shipped: the goods are still with the supplier.
create or replace function public.restore_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  if new.status not in ('cancelled', 'refunded')
     or new.stock_restored
     or new.earnings_credited
     or new.shipped_at is not null then
    return new;
  end if;

  for v_item in select * from public.order_items where order_id = new.id loop
    if v_item.variant_id is not null then
      update public.product_variants
      set stock_qty = stock_qty + v_item.quantity, updated_at = now()
      where id = v_item.variant_id;
    elsif v_item.variant_label is null then
      update public.products
      set stock_qty = stock_qty + v_item.quantity, updated_at = now()
      where id = v_item.product_id;
    end if;
  end loop;

  new.stock_restored := true;
  return new;
end;
$$;

drop trigger if exists trg_restore_order_stock on public.orders;
create trigger trg_restore_order_stock
  before update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.restore_order_stock();


-- ============================================================================
-- 5. Order notifications
-- ============================================================================

create or replace function public.order_label(p_order public.orders)
returns text
language sql
immutable
as $$
  select coalesce(p_order.order_number, left(p_order.id::text, 8));
$$;

-- New order: confirm to the customer, alert the dropshipper and each supplier.
create or replace function public.notify_order_placed(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_label text;
  v_sup   record;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    return;
  end if;
  v_label := public.order_label(v_order);

  if v_order.customer_id is not null then
    perform public.enqueue_notification(
      v_order.customer_id, 'order_placed',
      'We got your order ' || v_label,
      'Thanks! Order ' || v_label || ' (GHS ' || to_char(v_order.total, 'FM999999990.00') || ') is confirmed. We will update you when it ships.',
      jsonb_build_object('orderId', v_order.id, 'audience', 'customer'),
      'placed:' || v_order.id || ':customer', v_order.customer_phone
    );
  end if;

  perform public.enqueue_notification(
    v_order.dropshipper_id, 'order_placed',
    'New order ' || v_label,
    'New order ' || v_label || ' from ' || v_order.customer_name || ' (GHS ' || to_char(v_order.total, 'FM999999990.00') || ').',
    jsonb_build_object('orderId', v_order.id, 'audience', 'dropshipper'),
    'placed:' || v_order.id || ':dropshipper'
  );

  for v_sup in
    select p.supplier_id, sum(oi.quantity) as units
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order.id
    group by p.supplier_id
  loop
    perform public.enqueue_notification(
      v_sup.supplier_id, 'order_placed',
      'New order to fulfil: ' || v_label,
      'Order ' || v_label || ' needs ' || v_sup.units || ' item(s) from you. Please confirm and prepare it for dispatch.',
      jsonb_build_object('orderId', v_order.id, 'audience', 'supplier'),
      'placed:' || v_order.id || ':' || v_sup.supplier_id
    );
  end loop;
exception when others then
  null;
end;
$$;

revoke all on function public.notify_order_placed(uuid) from public, anon, authenticated;

create or replace function public.trg_order_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Deferred to commit, when the order's items exist.
  perform public.notify_order_placed(new.id);
  return null;
end;
$$;

drop trigger if exists trg_order_inserted on public.orders;
create constraint trigger trg_order_inserted
  after insert on public.orders
  deferrable initially deferred
  for each row execute function public.trg_order_inserted();

-- Status changes: tell the customer, and the dropshipper/suppliers where relevant.
create or replace function public.trg_order_status_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := public.order_label(new);
  v_text  text;
  v_event text;
  v_sup   record;
begin
  begin
    v_event := case new.status
      when 'shipped' then 'order_shipped'
      when 'delivered' then 'order_delivered'
      when 'cancelled' then 'order_cancelled'
      when 'refunded' then 'order_cancelled'
      when 'confirmed' then 'order_confirmed'
      when 'processing' then 'order_processing'
    end;
    if v_event is null then
      return new;
    end if;

    v_text := case new.status
      when 'confirmed' then 'Order ' || v_label || ' has been confirmed and is being prepared.'
      when 'processing' then 'Order ' || v_label || ' is being packed.'
      when 'shipped' then 'Order ' || v_label || ' is on its way to ' || new.customer_city || '.'
      when 'delivered' then 'Order ' || v_label || ' was delivered. Enjoy! You can now rate your items.'
      when 'cancelled' then 'Order ' || v_label || ' was cancelled.'
      when 'refunded' then 'Order ' || v_label || ' was refunded.'
    end;

    if new.customer_id is not null then
      perform public.enqueue_notification(
        new.customer_id, v_event, 'Order ' || v_label || ' is ' || new.status, v_text,
        jsonb_build_object('orderId', new.id, 'audience', 'customer'),
        'status:' || new.id || ':' || new.status || ':customer', new.customer_phone
      );
    end if;

    perform public.enqueue_notification(
      new.dropshipper_id, v_event, 'Order ' || v_label || ' is ' || new.status, v_text,
      jsonb_build_object('orderId', new.id, 'audience', 'dropshipper'),
      'status:' || new.id || ':' || new.status || ':dropshipper'
    );

    if new.status in ('cancelled', 'refunded') then
      for v_sup in
        select distinct p.supplier_id
        from public.order_items oi join public.products p on p.id = oi.product_id
        where oi.order_id = new.id
      loop
        perform public.enqueue_notification(
          v_sup.supplier_id, v_event, 'Order ' || v_label || ' is ' || new.status,
          v_text || ' Do not dispatch it.',
          jsonb_build_object('orderId', new.id, 'audience', 'supplier'),
          'status:' || new.id || ':' || new.status || ':' || v_sup.supplier_id
        );
      end loop;
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_order_status_notify on public.orders;
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
