-- catalog-features.sql part 1 of 5. Run parts in order. Safe to re-run.
-- ============================================================================
-- Catalog features: product variants and specs, variant-aware orders, and
-- customer saved items.
--
-- Paste this whole file into the Supabase SQL editor and Run. Safe to re-run.
-- Run it AFTER supabase/launch-features.sql: it replaces create_order and
-- update_order_status with versions that understand variants, so always keep
-- that order (supabase/schema.sql already contains both, in order).
-- ============================================================================


-- ============================================================================
-- 1. Product specs and variants
-- ============================================================================

-- Specs are a list of {label, value} rows shown on the product page.
alter table public.products
  add column if not exists specs jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_specs_is_array') then
    alter table public.products
      add constraint products_specs_is_array check (jsonb_typeof(specs) = 'array');
  end if;
end $$;

create table if not exists public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,
  label            text not null check (char_length(btrim(label)) between 1 and 80),
  sku_suffix       text not null default '',
  price_adjustment numeric(12,2) not null default 0,
  stock_qty        integer not null default 0 check (stock_qty >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (product_id, label)
);

create index if not exists idx_product_variants_product on public.product_variants(product_id);

alter table public.product_variants enable row level security;

-- Visible wherever the product is visible (the products policy still applies
-- inside this check); suppliers also see their own inactive options.
drop policy if exists "variants follow product visibility" on public.product_variants;
create policy "variants follow product visibility" on public.product_variants for select
  using (
    exists (select 1 from public.products p where p.id = product_variants.product_id)
    and (
      is_active
      or exists (select 1 from public.products p
                 where p.id = product_variants.product_id and p.supplier_id = auth.uid())
    )
  );

drop policy if exists "supplier manages own variants" on public.product_variants;
create policy "supplier manages own variants" on public.product_variants for all
  using (exists (select 1 from public.products p
                 where p.id = product_variants.product_id and p.supplier_id = auth.uid()))
  with check (exists (select 1 from public.products p
                      where p.id = product_variants.product_id and p.supplier_id = auth.uid()));


-- ============================================================================
-- 2. Order items remember which option was bought and its price adjustment, so
--    commission and supplier payout stay exact even if the option changes later.
-- ============================================================================

alter table public.order_items
  add column if not exists variant_id         uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_label      text,
  add column if not exists variant_adjustment numeric(12,2) not null default 0;
