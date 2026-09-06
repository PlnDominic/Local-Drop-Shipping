-- ============================================================================
-- Local Drop Shipping — full Supabase setup (schema + RLS + security functions)
-- ============================================================================
-- Idempotent: safe to run multiple times. Run in the Supabase SQL editor.
-- Assumes Supabase Auth; public.users.id == auth.users.id == auth.uid().
-- Existing tables are preserved (create table if not exists). If a table
-- already exists with different columns, reconcile it before running.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────────

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
  description     text,
  logo_url        text,
  location        text,
  commission_rate numeric(5,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references public.supplier_profiles(id) on delete cascade,
  category_id    uuid references public.categories(id) on delete set null,
  name           text not null,
  description    text not null default '',
  images         text[] not null default '{}',
  cost_price     numeric(12,2) not null default 0,
  suggested_price numeric(12,2) not null default 0,
  stock_qty      integer not null default 0,
  sku            text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

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

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  dropshipper_id    uuid not null references public.dropshipper_profiles(id) on delete cascade,
  customer_name     text not null default '',
  customer_phone    text not null default '',
  customer_address  text not null default '',
  status            text not null default 'pending'
                      check (status in ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal          numeric(12,2) not null default 0,
  platform_fee      numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  payment_reference text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity   integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  subtotal   numeric(12,2) not null default 0
);

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
  type          text not null check (type in ('credit','debit','withdrawal','refund','commission')),
  amount        numeric(12,2) not null,
  description   text not null default '',
  balance_after numeric(12,2),
  reference     text,
  meta          jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  channel    text not null,
  reference  text not null,
  amount     numeric(12,2) not null default 0,
  status     text not null default 'pending' check (status in ('pending','success','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-variant stock/pricing under a product (e.g. size/color combinations).
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

-- Customer/dropshipper reviews left against a supplier's product.
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

create index if not exists idx_products_supplier on public.products(supplier_id);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_dp_products_pub on public.dropshipper_products(is_published);
create index if not exists idx_orders_dropshipper on public.orders(dropshipper_id);
create index if not exists idx_wallet_tx_user on public.wallet_transactions(user_id);
create index if not exists idx_product_variants_product on public.product_variants(product_id);
create index if not exists idx_product_reviews_product on public.product_reviews(product_id);

-- ── Auth → profile provisioning ─────────────────────────────────────────────
-- On signup, create the public profile row and an empty wallet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, phone, role, is_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    false
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper: current user's role ─────────────────────────────────────────────
create or replace function public.app_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ── Enable RLS ──────────────────────────────────────────────────────────────
alter table public.users                enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.dropshipper_products enable row level security;
alter table public.supplier_profiles    enable row level security;
alter table public.dropshipper_profiles enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.wallets              enable row level security;
alter table public.wallet_transactions  enable row level security;
alter table public.product_variants     enable row level security;
alter table public.product_reviews      enable row level security;

-- ── Read policies ───────────────────────────────────────────────────────────
drop policy if exists "categories are public" on public.categories;
create policy "categories are public" on public.categories for select using (true);

drop policy if exists "active products are public" on public.products;
create policy "active products are public" on public.products for select
  using (is_active = true or supplier_id = auth.uid());

drop policy if exists "variants are public" on public.product_variants;
create policy "variants are public" on public.product_variants for select using (true);

drop policy if exists "reviews are public" on public.product_reviews;
create policy "reviews are public" on public.product_reviews for select using (true);

drop policy if exists "published store items are public" on public.dropshipper_products;
create policy "published store items are public" on public.dropshipper_products for select
  using (is_published = true or dropshipper_id = auth.uid());

drop policy if exists "users read own profile" on public.users;
create policy "users read own profile" on public.users for select
  using (id = auth.uid() or public.app_user_role() = 'admin');

drop policy if exists "supplier profiles are public" on public.supplier_profiles;
create policy "supplier profiles are public" on public.supplier_profiles for select using (true);

drop policy if exists "dropshipper profiles are public" on public.dropshipper_profiles;
create policy "dropshipper profiles are public" on public.dropshipper_profiles for select using (true);

drop policy if exists "owner reads wallet" on public.wallets;
create policy "owner reads wallet" on public.wallets for select using (user_id = auth.uid());

drop policy if exists "owner reads transactions" on public.wallet_transactions;
create policy "owner reads transactions" on public.wallet_transactions for select using (user_id = auth.uid());

drop policy if exists "dropshipper reads own orders" on public.orders;
create policy "dropshipper reads own orders" on public.orders for select
  using (dropshipper_id = auth.uid() or public.app_user_role() = 'admin');

drop policy if exists "order items follow order visibility" on public.order_items;
create policy "order items follow order visibility" on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.dropshipper_id = auth.uid() or public.app_user_role() = 'admin')
    )
  );

-- ── Owner write policies (profiles, catalog, storefront) ────────────────────
drop policy if exists "user updates own profile" on public.users;
create policy "user updates own profile" on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "owner manages supplier profile" on public.supplier_profiles;
create policy "owner manages supplier profile" on public.supplier_profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "owner manages dropshipper profile" on public.dropshipper_profiles;
create policy "owner manages dropshipper profile" on public.dropshipper_profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "supplier manages own products" on public.products;
create policy "supplier manages own products" on public.products for all
  using (supplier_id = auth.uid()) with check (supplier_id = auth.uid());

drop policy if exists "dropshipper manages own store items" on public.dropshipper_products;
create policy "dropshipper manages own store items" on public.dropshipper_products for all
  using (dropshipper_id = auth.uid()) with check (dropshipper_id = auth.uid());

drop policy if exists "supplier manages own product variants" on public.product_variants;
create policy "supplier manages own product variants" on public.product_variants for all
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.supplier_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.supplier_id = auth.uid()
    )
  );

drop policy if exists "authenticated users write own review" on public.product_reviews;
create policy "authenticated users write own review" on public.product_reviews for insert
  with check (user_id = auth.uid());

drop policy if exists "users manage own review" on public.product_reviews;
create policy "users manage own review" on public.product_reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users delete own review" on public.product_reviews;
create policy "users delete own review" on public.product_reviews for delete
  using (user_id = auth.uid());

-- NOTE: orders, wallets and wallet_transactions are intentionally NOT directly
-- writable by clients. Sensitive writes go through the SECURITY DEFINER
-- functions below, which enforce pricing and balance integrity.

-- ============================================================================
-- Security-critical write functions
-- ============================================================================

-- Create an order with server-resolved prices (from dropshipper_products.custom_price).
-- p_items: jsonb array of { "productId": uuid, "quantity": int }
create or replace function public.create_order(
  p_dropshipper_id uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_customer_address text,
  p_items          jsonb,
  p_notes          text default null,
  p_platform_fee_percent numeric default 2
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order      public.orders;
  v_item       jsonb;
  v_product_id uuid;
  v_qty        int;
  v_price      numeric;
  v_subtotal   numeric := 0;
  v_fee        numeric;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    select custom_price into v_price
    from public.dropshipper_products
    where dropshipper_id = p_dropshipper_id and product_id = v_product_id;

    if v_price is null or v_price <= 0 then
      raise exception 'Product % is not available in this store', v_product_id;
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  v_fee := round(v_subtotal * p_platform_fee_percent / 100, 2);

  insert into public.orders (
    dropshipper_id, customer_name, customer_phone, customer_address,
    status, subtotal, platform_fee, total, notes
  ) values (
    p_dropshipper_id, p_customer_name, p_customer_phone, p_customer_address,
    'pending', v_subtotal, v_fee, v_subtotal + v_fee, p_notes
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    select custom_price into v_price
    from public.dropshipper_products
    where dropshipper_id = p_dropshipper_id and product_id = v_product_id;

    insert into public.order_items (order_id, product_id, quantity, unit_price, subtotal)
    values (v_order.id, v_product_id, v_qty, v_price, round(v_price * v_qty, 2));
  end loop;

  return v_order;
end;
$$;

-- Atomic wallet credit (payout/internal use; service-role only).
create or replace function public.wallet_credit(
  p_user_id uuid,
  p_amount  numeric,
  p_description text,
  p_type    text default 'credit'
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

  insert into public.wallets (user_id) values (p_user_id) on conflict (user_id) do nothing;

  update public.wallets
  set balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.wallet_transactions (user_id, type, amount, description, balance_after)
  values (p_user_id, p_type, p_amount, p_description, v_balance);

  return v_balance;
end;
$$;

-- Atomic, overdraft-safe wallet withdrawal (caller = owner).
create or replace function public.wallet_withdraw(
  p_amount  numeric,
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
  set balance = balance - p_amount, updated_at = now()
  where user_id = v_user and balance >= p_amount
  returning balance into v_balance;

  if v_balance is null then
    raise exception 'Insufficient wallet balance';
  end if;

  insert into public.wallet_transactions (user_id, type, amount, description, balance_after, meta)
  values (v_user, 'withdrawal', -p_amount, 'Wallet withdrawal', v_balance, p_account);

  return v_balance;
end;
$$;

-- ── Function privileges ─────────────────────────────────────────────────────
revoke all on function public.wallet_credit(uuid, numeric, text, text) from anon, authenticated;
grant execute on function public.create_order(uuid, text, text, text, jsonb, text, numeric) to authenticated;
grant execute on function public.wallet_withdraw(numeric, jsonb) to authenticated;
