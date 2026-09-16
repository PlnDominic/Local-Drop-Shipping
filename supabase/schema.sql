-- ============================================================================
-- Local Drop Shipping — corrected full Supabase setup
-- Schema + RLS + security functions
-- ============================================================================
-- Assumes Supabase Auth.
-- public.users.id == auth.users.id == auth.uid().
--
-- DEVELOPMENT VERSION:
-- Dropshippers are automatically approved.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null,
  phone       text not null default '',
  role        text not null default 'customer'
              check (role in ('customer','dropshipper','supplier','admin')),
  avatar_url  text,
  is_verified boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  icon       text not null default 'Package',
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_profiles (
  id                  uuid primary key references public.users(id) on delete cascade,
  business_name       text not null default '',
  business_reg_number text,
  region              text,
  description         text,
  logo_url            text,
  location            text,
  is_approved         boolean not null default false,
  rating              numeric(3,2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.dropshipper_profiles (
  id              uuid primary key references public.users(id) on delete cascade,
  business_name   text not null default '',
  store_name      text,
  store_slug      text unique,
  is_approved     boolean not null default true,
  description     text,
  logo_url        text,
  location        text,
  commission_rate numeric(5,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================================
-- EXISTING DATABASE COMPATIBILITY
-- ============================================================================

alter table public.dropshipper_profiles
  add column if not exists is_approved boolean;

-- Make sure NULL values are fixed before applying NOT NULL.
update public.dropshipper_profiles
set is_approved = true
where is_approved is null;

alter table public.dropshipper_profiles
  alter column is_approved set default true;

alter table public.dropshipper_profiles
  alter column is_approved set not null;

-- ============================================================================
-- DEVELOPMENT: APPROVE ALL EXISTING DROPSHIPPERS
-- ============================================================================

update public.dropshipper_profiles
set is_approved = true
where is_approved is distinct from true;

-- ============================================================================
-- STOREFRONT CUSTOMIZATION
-- ============================================================================

alter table public.dropshipper_profiles
  add column if not exists theme_color text not null default '#f04438';

alter table public.dropshipper_profiles
  add column if not exists banner_url text;

alter table public.dropshipper_profiles
  add column if not exists tagline text;

alter table public.dropshipper_profiles
  add column if not exists announcement text;

alter table public.dropshipper_profiles
  add column if not exists whatsapp text;

alter table public.dropshipper_profiles
  add column if not exists social_links jsonb not null default '{}';

alter table public.dropshipper_profiles
  add column if not exists featured_product_ids uuid[] not null default '{}';

-- ============================================================================
-- PRODUCTS
-- ============================================================================

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  supplier_id     uuid not null references public.supplier_profiles(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  name            text not null,
  description     text not null default '',
  images          text[] not null default '{}',
  cost_price      numeric(12,2) not null default 0,
  suggested_price numeric(12,2) not null default 0,
  stock_qty       integer not null default 0,
  sku             text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================================
-- DROPSHIPPER PRODUCTS
-- ============================================================================

create table if not exists public.dropshipper_products (
  id                 uuid primary key default gen_random_uuid(),
  dropshipper_id     uuid not null references public.dropshipper_profiles(id) on delete cascade,
  product_id         uuid not null references public.products(id) on delete cascade,
  custom_price       numeric(12,2) not null default 0,
  custom_description text,
  is_published       boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (dropshipper_id, product_id)
);

-- ============================================================================
-- ORDERS
-- ============================================================================

create table if not exists public.orders (
  id                       uuid primary key default gen_random_uuid(),
  dropshipper_id           uuid not null references public.dropshipper_profiles(id) on delete cascade,
  customer_name            text not null default '',
  customer_phone           text not null default '',
  customer_address         text not null default '',
  customer_region          text not null default '',
  customer_city            text not null default '',
  customer_ghana_post_gps  text not null default '',
  status                   text not null default 'pending'
                           check (
                             status in (
                               'pending',
                               'confirmed',
                               'processing',
                               'shipped',
                               'delivered',
                               'cancelled',
                               'refunded'
                             )
                           ),
  subtotal                 numeric(12,2) not null default 0,
  platform_fee             numeric(12,2) not null default 0,
  total                    numeric(12,2) not null default 0,
  estimated_delivery      text,
  estimated_delivery_date date,
  payment_reference        text,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  order_number             text not null unique
);

-- Existing database compatibility
alter table public.orders
  add column if not exists order_number text;

alter table public.orders
  add column if not exists customer_region text;

alter table public.orders
  add column if not exists customer_city text;

alter table public.orders
  add column if not exists customer_ghana_post_gps text;

alter table public.orders
  add column if not exists estimated_delivery text;

alter table public.orders
  add column if not exists estimated_delivery_date date;

-- Fix NULL values for newly added required address fields
update public.orders
set customer_region = ''
where customer_region is null;

update public.orders
set customer_city = ''
where customer_city is null;

update public.orders
set customer_ghana_post_gps = ''
where customer_ghana_post_gps is null;

alter table public.orders
  alter column customer_region set default '';

alter table public.orders
  alter column customer_city set default '';

alter table public.orders
  alter column customer_ghana_post_gps set default '';

alter table public.orders
  alter column customer_region set not null;

alter table public.orders
  alter column customer_city set not null;

alter table public.orders
  alter column customer_ghana_post_gps set not null;

-- Generate order numbers for any existing orders that do not have one
update public.orders
set order_number =
  concat(
    'ORD-',
    to_char(created_at, 'YYYYMMDDHH24MISS'),
    '-',
    substr(gen_random_uuid()::text, 1, 8)
  )
where order_number is null
   or trim(order_number) = '';

-- Make order_number required
alter table public.orders
  alter column order_number set not null;

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity   integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  subtotal   numeric(12,2) not null default 0
);

-- ============================================================================
-- WALLETS
-- ============================================================================

create table if not exists public.wallets (
  user_id      uuid primary key references public.users(id) on delete cascade,
  balance      numeric(12,2) not null default 0,
  total_earned numeric(12,2) not null default 0,
  currency     text not null default 'GHS',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  type          text not null
                check (
                  type in (
                    'credit',
                    'debit',
                    'withdrawal',
                    'refund',
                    'commission'
                  )
                ),
  amount        numeric(12,2) not null,
  description   text not null default '',
  balance_after numeric(12,2),
  reference     text,
  meta          jsonb,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  channel    text not null,
  reference  text not null,
  amount     numeric(12,2) not null default 0,
  status     text not null default 'pending'
             check (status in ('pending','success','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- PRODUCT VARIANTS
-- ============================================================================

create table if not exists public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,
  label            text not null,
  sku_suffix       text not null default '',
  price_adjustment numeric(12,2) not null default 0,
  stock_qty        integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================================
-- PRODUCT REVIEWS
-- ============================================================================

create table if not exists public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid references public.users(id) on delete set null,
  author_name text not null default 'Anonymous',
  rating      integer not null check (rating between 1 and 5),
  comment     text not null default '',
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index if not exists idx_products_supplier
  on public.products(supplier_id);

create index if not exists idx_products_active
  on public.products(is_active);

create index if not exists idx_dp_products_pub
  on public.dropshipper_products(is_published);

create index if not exists idx_orders_dropshipper
  on public.orders(dropshipper_id);

create index if not exists idx_orders_delivery_date
  on public.orders(estimated_delivery_date);

create index if not exists idx_wallet_tx_user
  on public.wallet_transactions(user_id);

create index if not exists idx_product_variants_product
  on public.product_variants(product_id);

create index if not exists idx_product_reviews_product
  on public.product_reviews(product_id);

-- ============================================================================
-- AUTH -> PROFILE PROVISIONING
-- ============================================================================

create or replace function public.generate_store_slug(base_name text)
returns text
language plpgsql
set search_path = public
as $$
declare
  base text;
  slug text;
  counter int := 0;
begin
  base := lower(
    regexp_replace(
      coalesce(base_name, 'store'),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  );

  base := trim(both '-' from base);

  if length(base) < 3 then
    base := base || '-store';
  end if;

  slug := base;

  loop
    if not exists (
      select 1
      from public.dropshipper_profiles
      where store_slug = slug
    ) then
      return slug;
    end if;

    counter := counter + 1;
    slug := base || '-' || counter;
  end loop;
end;
$$;

-- ============================================================================
-- NEW USER TRIGGER
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role  text := coalesce(new.raw_user_meta_data->>'role', 'customer');
  v_name  text := coalesce(new.raw_user_meta_data->>'full_name', '');
  v_phone text := coalesce(new.raw_user_meta_data->>'phone', '');
  v_slug  text;
begin

  if v_role not in (
    'customer',
    'dropshipper',
    'supplier',
    'admin'
  ) then
    v_role := 'customer';
  end if;

  -- Create/update public profile
  insert into public.users (
    id,
    full_name,
    email,
    phone,
    role,
    is_verified
  )
  values (
    new.id,
    v_name,
    coalesce(new.email, ''),
    v_phone,
    v_role,
    false
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        phone = excluded.phone,
        role = excluded.role,
        updated_at = now();

  -- Create wallet
  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Create dropshipper profile
  if v_role = 'dropshipper' then

    v_slug := public.generate_store_slug(v_name);

    insert into public.dropshipper_profiles (
      id,
      business_name,
      store_name,
      store_slug,
      is_approved
    )
    values (
      new.id,
      case
        when v_name = '' then 'My Store'
        else v_name || ' Store'
      end,
      case
        when v_name = '' then 'My Store'
        else v_name || ' Store'
      end,
      v_slug,
      true
    )
    on conflict (id) do nothing;

  end if;

  -- Create supplier profile
  if v_role = 'supplier' then

    insert into public.supplier_profiles (
      id,
      business_name,
      is_approved
    )
    values (
      new.id,
      v_name,
      false
    )
    on conflict (id) do nothing;

  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================================
-- CURRENT USER ROLE
-- ============================================================================

create or replace function public.app_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid();
$$;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.dropshipper_products enable row level security;
alter table public.supplier_profiles enable row level security;
alter table public.dropshipper_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_reviews enable row level security;
alter table public.payments enable row level security;

-- ============================================================================
-- READ POLICIES
-- ============================================================================

drop policy if exists "categories are public"
on public.categories;

create policy "categories are public"
on public.categories
for select
using (true);

drop policy if exists "active products are public"
on public.products;

create policy "active products are public"
on public.products
for select
using (
  is_active = true
  or supplier_id = auth.uid()
);

drop policy if exists "variants are public"
on public.product_variants;

create policy "variants are public"
on public.product_variants
for select
using (true);

drop policy if exists "reviews are public"
on public.product_reviews;

create policy "reviews are public"
on public.product_reviews
for select
using (true);

drop policy if exists "published store items are public"
on public.dropshipper_products;

create policy "published store items are public"
on public.dropshipper_products
for select
using (
  is_published = true
  or dropshipper_id = auth.uid()
);

drop policy if exists "users read own profile"
on public.users;

create policy "users read own profile"
on public.users
for select
using (
  id = auth.uid()
  or public.app_user_role() = 'admin'
);

drop policy if exists "supplier profiles are public"
on public.supplier_profiles;

create policy "supplier profiles are public"
on public.supplier_profiles
for select
using (true);

drop policy if exists "dropshipper profiles are public"
on public.dropshipper_profiles;

create policy "dropshipper profiles are public"
on public.dropshipper_profiles
for select
using (true);

drop policy if exists "owner reads wallet"
on public.wallets;

create policy "owner reads wallet"
on public.wallets
for select
using (user_id = auth.uid());

drop policy if exists "owner reads transactions"
on public.wallet_transactions;

create policy "owner reads transactions"
on public.wallet_transactions
for select
using (user_id = auth.uid());

drop policy if exists "dropshipper reads own orders"
on public.orders;

create policy "dropshipper reads own orders"
on public.orders
for select
using (
  dropshipper_id = auth.uid()
  or public.app_user_role() = 'admin'
);

drop policy if exists "order items follow order visibility"
on public.order_items;

create policy "order items follow order visibility"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.dropshipper_id = auth.uid()
        or public.app_user_role() = 'admin'
      )
  )
);

drop policy if exists "order payments visibility"
on public.payments;

create policy "order payments visibility"
on public.payments
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and (
        o.dropshipper_id = auth.uid()
        or public.app_user_role() = 'admin'
      )
  )
);

-- ============================================================================
-- OWNER WRITE POLICIES
-- ============================================================================

drop policy if exists "user updates own profile"
on public.users;

create policy "user updates own profile"
on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "owner manages supplier profile"
on public.supplier_profiles;

create policy "owner manages supplier profile"
on public.supplier_profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "owner manages dropshipper profile"
on public.dropshipper_profiles;

create policy "owner manages dropshipper profile"
on public.dropshipper_profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "supplier manages own products"
on public.products;

create policy "supplier manages own products"
on public.products
for all
using (supplier_id = auth.uid())
with check (supplier_id = auth.uid());

drop policy if exists "dropshipper manages own store items"
on public.dropshipper_products;

create policy "dropshipper manages own store items"
on public.dropshipper_products
for all
using (dropshipper_id = auth.uid())
with check (dropshipper_id = auth.uid());

drop policy if exists "supplier manages own product variants"
on public.product_variants;

create policy "supplier manages own product variants"
on public.product_variants
for all
using (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and p.supplier_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and p.supplier_id = auth.uid()
  )
);

drop policy if exists "authenticated users write own review"
on public.product_reviews;

create policy "authenticated users write own review"
on public.product_reviews
for insert
with check (
  user_id = auth.uid()
);

drop policy if exists "users manage own review"
on public.product_reviews;

create policy "users manage own review"
on public.product_reviews
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users delete own review"
on public.product_reviews;

create policy "users delete own review"
on public.product_reviews
for delete
using (user_id = auth.uid());

-- ============================================================================
-- CREATE ORDER
-- ============================================================================

create or replace function public.create_order(
  p_dropshipper_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_region text default null,
  p_customer_city text default null,
  p_customer_ghana_post_gps text default null,
  p_items jsonb default '[]'::jsonb,
  p_notes text default null,
  p_platform_fee_percent numeric default 2
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_price numeric;
  v_subtotal numeric := 0;
  v_fee numeric;
  v_delivery_date date;
  v_delivery_text text;
begin

  if p_customer_name is null
     or trim(p_customer_name) = '' then
    raise exception 'Customer name is required';
  end if;

  if p_customer_phone is null
     or trim(p_customer_phone) = '' then
    raise exception 'Customer phone is required';
  end if;

  if not exists (
    select 1
    from public.dropshipper_profiles
    where id = p_dropshipper_id
      and is_approved = true
  ) then
    raise exception 'Dropshipper is not approved or does not exist';
  end if;

  if p_customer_ghana_post_gps is not null
     and trim(p_customer_ghana_post_gps) <> '' then

    if not trim(p_customer_ghana_post_gps)
       ~ '^GA-[0-9]{3}-[0-9]{4}$' then

      raise exception
        'Invalid GhanaPost GPS format. Expected format: GA-XXX-XXXX (e.g. GA-184-9022)';

    end if;
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then

    raise exception 'Order must contain at least one item';

  end if;

  for v_item in
    select *
    from jsonb_array_elements(p_items)
  loop

    begin
      v_product_id := (v_item->>'productId')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Invalid product ID';
    end;

    begin
      v_qty := (v_item->>'quantity')::int;
    exception
      when invalid_text_representation then
        raise exception 'Invalid quantity for product %', v_product_id;
    end;

    if v_product_id is null then
      raise exception 'Product ID is required';
    end if;

    if v_qty is null or v_qty < 1 then
      raise exception
        'Invalid quantity for product %',
        v_product_id;
    end if;

    select dp.custom_price
    into v_price
    from public.dropshipper_products dp
    join public.products p
      on p.id = dp.product_id
    where dp.dropshipper_id = p_dropshipper_id
      and dp.product_id = v_product_id
      and dp.is_published = true
      and p.is_active = true;

    if v_price is null or v_price <= 0 then
      raise exception
        'Product % is not available in this store',
        v_product_id;
    end if;

    v_subtotal :=
      v_subtotal + (v_price * v_qty);

  end loop;

  if p_platform_fee_percent is null
     or p_platform_fee_percent < 0
     or p_platform_fee_percent > 100 then

    raise exception
      'Platform fee percentage must be between 0 and 100';

  end if;

  v_fee :=
    round(
      v_subtotal * p_platform_fee_percent / 100,
      2
    );

  v_delivery_date :=
    current_date + 5;

  v_delivery_text :=
    to_char(current_date + 3, 'DD Mon YYYY')
    || ' - '
    || to_char(current_date + 5, 'DD Mon YYYY');

  insert into public.orders (
    dropshipper_id,
    customer_name,
    customer_phone,
    customer_address,
    customer_region,
    customer_city,
    customer_ghana_post_gps,
    status,
    subtotal,
    platform_fee,
    total,
    estimated_delivery,
    estimated_delivery_date,
    notes,
    order_number
  )
  values (
    p_dropshipper_id,
    trim(p_customer_name),
    trim(p_customer_phone),
    coalesce(trim(p_customer_address), ''),
    coalesce(trim(p_customer_region), ''),
    coalesce(trim(p_customer_city), ''),
    coalesce(trim(p_customer_ghana_post_gps), ''),
    'pending',
    v_subtotal,
    v_fee,
    v_subtotal + v_fee,
    v_delivery_text,
    v_delivery_date,
    p_notes,
    concat(
      'ORD-',
      to_char(current_timestamp, 'YYYYMMDDHH24MISS'),
      '-',
      substr(gen_random_uuid()::text, 1, 8)
    )
  )
  returning *
  into v_order;

  for v_item in
    select *
    from jsonb_array_elements(p_items)
  loop

    v_product_id := (v_item->>'productId')::uuid;
    v_qty := (v_item->>'quantity')::int;

    select dp.custom_price
    into v_price
    from public.dropshipper_products dp
    join public.products p
      on p.id = dp.product_id
    where dp.dropshipper_id = p_dropshipper_id
      and dp.product_id = v_product_id
      and dp.is_published = true
      and p.is_active = true;

    insert into public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      subtotal
    )
    values (
      v_order.id,
      v_product_id,
      v_qty,
      v_price,
      round(v_price * v_qty, 2)
    );

  end loop;

  return v_order;

end;
$$;

-- ============================================================================
-- WALLET CREDIT
-- ============================================================================

create or replace function public.wallet_credit(
  p_user_id uuid,
  p_amount numeric,
  p_description text,
  p_type text default 'credit'
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin

  if p_amount is null or p_amount <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  if p_type not in (
    'credit',
    'debit',
    'withdrawal',
    'refund',
    'commission'
  ) then
    raise exception 'Invalid wallet transaction type';
  end if;

  if not exists (
    select 1
    from public.users
    where id = p_user_id
  ) then
    raise exception 'User does not exist';
  end if;

  insert into public.wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.wallets
  set balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning balance
  into v_balance;

  insert into public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    balance_after
  )
  values (
    p_user_id,
    p_type,
    p_amount,
    p_description,
    v_balance
  );

  return v_balance;

end;
$$;

-- ============================================================================
-- WALLET WITHDRAWAL
-- ============================================================================

create or replace function public.wallet_withdraw(
  p_amount numeric,
  p_account jsonb default '{}'::jsonb
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
begin

  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  update public.wallets
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = v_user
    and balance >= p_amount
  returning balance
  into v_balance;

  if v_balance is null then
    raise exception 'Insufficient wallet balance';
  end if;

  insert into public.wallet_transactions (
    user_id,
    type,
    amount,
    description,
    balance_after,
    meta
  )
  values (
    v_user,
    'withdrawal',
    -p_amount,
    'Wallet withdrawal',
    v_balance,
    p_account
  );

  return v_balance;

end;
$$;

-- ============================================================================
-- FUNCTION PRIVILEGES
-- ============================================================================

revoke all
on function public.wallet_credit(uuid, numeric, text, text)
from anon, authenticated;

grant execute
on function public.create_order(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  numeric
)
to authenticated;

grant execute
on function public.wallet_withdraw(numeric, jsonb)
to authenticated;

grant execute
on function public.generate_store_slug(text)
to authenticated;

grant execute
on function public.handle_new_user()
to service_role;

-- ============================================================================
-- SEED DATA
-- ============================================================================

insert into public.categories (
  id,
  name,
  slug,
  icon
)
values
  (
    'a1111111-1111-1111-1111-111111111111',
    'Electronics',
    'electronics',
    'Zap'
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    'Fashion',
    'fashion',
    'Heart'
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    'Home & Living',
    'home',
    'Package'
  ),
  (
    'a4444444-4444-4444-4444-444444444444',
    'Health',
    'health',
    'Gift'
  )
on conflict (slug) do nothing;

-- ============================================================================
-- IMPORTANT
-- ============================================================================
-- Demo supplier/dropshipper users are intentionally NOT inserted here.
--
-- public.users.id references auth.users(id), so users must first be created
-- through Supabase Auth.
--
-- The handle_new_user() trigger automatically creates:
--   1. public.users
--   2. wallets
--   3. dropshipper_profiles (for dropshippers)
--   4. supplier_profiles (for suppliers)
--
-- DEVELOPMENT:
-- All dropshippers are automatically approved.
-- ============================================================================

-- Final verification
select
  id,
  business_name,
  store_name,
  store_slug,
  is_approved,
  created_at
from public.dropshipper_profiles
order by created_at desc;