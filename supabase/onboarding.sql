-- ============================================================================
-- Onboarding verification: Ghana Card photos + selfie for suppliers AND dropshippers.
-- Paste into the Supabase SQL editor and Run. Safe to re-run.
-- Requires supabase/launch-features.sql (section 8) to have been applied first.
--
-- Changes:
--  1. supplier_verifications gets a selfie, and submit_supplier_verification now requires one.
--  2. Approving a supplier's verification also approves the supplier (is_approved),
--     so one admin decision opens their dashboard.
--  3. dropshipper_verifications: same flow for dropshippers. Their dashboard stays
--     closed until an admin approves it.
-- Documents live in the private 'supplier-documents' bucket (<user_id>/<file>),
-- whose policies already allow the owner to upload and admins to read.
-- Do not re-run launch-features.sql afterwards without re-running this file.
-- ============================================================================

-- 1. Suppliers: selfie ------------------------------------------------------

alter table public.supplier_verifications
  add column if not exists selfie_path text;

drop function if exists public.submit_supplier_verification(text, text, text, text, text);

create or replace function public.submit_supplier_verification(
  p_ghana_card_number   text,
  p_business_reg_number text,
  p_front_path          text,
  p_back_path           text default null,
  p_business_doc_path   text default null,
  p_selfie_path         text default null
)
returns public.supplier_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_card text := upper(regexp_replace(btrim(coalesce(p_ghana_card_number, '')), '\s+', '', 'g'));
  v_row  public.supplier_verifications;
begin
  if v_uid is null then
    raise exception 'Please sign in.';
  end if;
  if not exists (select 1 from public.supplier_profiles where id = v_uid) then
    raise exception 'Create your supplier profile first.';
  end if;
  if v_card !~ '^GHA-[0-9]{9}-[0-9]$' then
    raise exception 'Enter your Ghana Card number like GHA-123456789-0.';
  end if;
  if p_front_path is null or p_front_path not like v_uid::text || '/%' then
    raise exception 'Please upload a photo of the front of your Ghana Card.';
  end if;
  if p_selfie_path is null or p_selfie_path not like v_uid::text || '/%' then
    raise exception 'Please add a selfie so we can match you to your Ghana Card.';
  end if;
  if (p_back_path is not null and p_back_path not like v_uid::text || '/%')
     or (p_business_doc_path is not null and p_business_doc_path not like v_uid::text || '/%') then
    raise exception 'Invalid document upload.';
  end if;
  if exists (select 1 from public.supplier_verifications where supplier_id = v_uid and status = 'approved') then
    raise exception 'You are already verified.';
  end if;

  insert into public.supplier_verifications (
    supplier_id, ghana_card_number, business_reg_number,
    ghana_card_front_path, ghana_card_back_path, business_doc_path, selfie_path,
    status, rejection_reason, submitted_at, reviewed_at, reviewed_by
  ) values (
    v_uid, v_card, nullif(btrim(p_business_reg_number), ''),
    p_front_path, p_back_path, p_business_doc_path, p_selfie_path,
    'pending', null, now(), null, null
  )
  on conflict (supplier_id) do update set
    ghana_card_number = excluded.ghana_card_number,
    business_reg_number = excluded.business_reg_number,
    ghana_card_front_path = excluded.ghana_card_front_path,
    ghana_card_back_path = excluded.ghana_card_back_path,
    business_doc_path = excluded.business_doc_path,
    selfie_path = excluded.selfie_path,
    status = 'pending',
    rejection_reason = null,
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.submit_supplier_verification(text, text, text, text, text, text) to authenticated;

-- 2. Approving verification also approves the supplier -------------------------

create or replace function public.review_supplier_verification(
  p_supplier_id uuid,
  p_approve     boolean,
  p_reason      text default null
)
returns public.supplier_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.supplier_verifications;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can review verifications.';
  end if;
  if not p_approve and nullif(btrim(p_reason), '') is null then
    raise exception 'Please tell the supplier what to fix.';
  end if;

  update public.supplier_verifications
  set status = case when p_approve then 'approved' else 'rejected' end,
      rejection_reason = case when p_approve then null else btrim(p_reason) end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where supplier_id = p_supplier_id and status = 'pending'
  returning * into v_row;

  if v_row is null then
    raise exception 'No pending verification found for this supplier.';
  end if;

  update public.supplier_profiles
  set is_verified = p_approve,
      is_approved = case when p_approve then true else is_approved end,
      updated_at = now()
  where id = p_supplier_id;

  return v_row;
end;
$$;

grant execute on function public.review_supplier_verification(uuid, boolean, text) to authenticated;

-- 3. Dropshippers -------------------------------------------------------------

create table if not exists public.dropshipper_verifications (
  dropshipper_id        uuid primary key references public.dropshipper_profiles(id) on delete cascade,
  ghana_card_number     text not null check (ghana_card_number ~ '^GHA-[0-9]{9}-[0-9]$'),
  ghana_card_front_path text not null,
  ghana_card_back_path  text,
  selfie_path           text not null,
  status                text not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
  rejection_reason      text,
  submitted_at          timestamptz not null default now(),
  reviewed_at           timestamptz,
  reviewed_by           uuid references public.users(id) on delete set null
);

alter table public.dropshipper_verifications enable row level security;

drop policy if exists "dropshipper reads own verification" on public.dropshipper_verifications;
create policy "dropshipper reads own verification" on public.dropshipper_verifications for select
  using (dropshipper_id = auth.uid() or public.app_user_role() = 'admin');

create or replace function public.submit_dropshipper_verification(
  p_ghana_card_number text,
  p_front_path        text,
  p_back_path         text default null,
  p_selfie_path       text default null
)
returns public.dropshipper_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_card text := upper(regexp_replace(btrim(coalesce(p_ghana_card_number, '')), '\s+', '', 'g'));
  v_row  public.dropshipper_verifications;
begin
  if v_uid is null then
    raise exception 'Please sign in.';
  end if;
  if not exists (select 1 from public.dropshipper_profiles where id = v_uid) then
    raise exception 'Set up your store first.';
  end if;
  if v_card !~ '^GHA-[0-9]{9}-[0-9]$' then
    raise exception 'Enter your Ghana Card number like GHA-123456789-0.';
  end if;
  if p_front_path is null or p_front_path not like v_uid::text || '/%' then
    raise exception 'Please upload a photo of the front of your Ghana Card.';
  end if;
  if p_selfie_path is null or p_selfie_path not like v_uid::text || '/%' then
    raise exception 'Please add a selfie so we can match you to your Ghana Card.';
  end if;
  if p_back_path is not null and p_back_path not like v_uid::text || '/%' then
    raise exception 'Invalid document upload.';
  end if;
  if exists (select 1 from public.dropshipper_verifications where dropshipper_id = v_uid and status = 'approved') then
    raise exception 'You are already verified.';
  end if;

  insert into public.dropshipper_verifications (
    dropshipper_id, ghana_card_number, ghana_card_front_path, ghana_card_back_path, selfie_path,
    status, rejection_reason, submitted_at, reviewed_at, reviewed_by
  ) values (
    v_uid, v_card, p_front_path, p_back_path, p_selfie_path,
    'pending', null, now(), null, null
  )
  on conflict (dropshipper_id) do update set
    ghana_card_number = excluded.ghana_card_number,
    ghana_card_front_path = excluded.ghana_card_front_path,
    ghana_card_back_path = excluded.ghana_card_back_path,
    selfie_path = excluded.selfie_path,
    status = 'pending',
    rejection_reason = null,
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.submit_dropshipper_verification(text, text, text, text) to authenticated;

create or replace function public.review_dropshipper_verification(
  p_dropshipper_id uuid,
  p_approve        boolean,
  p_reason         text default null
)
returns public.dropshipper_verifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dropshipper_verifications;
begin
  if auth.uid() is null or public.app_user_role() <> 'admin' then
    raise exception 'Only administrators can review verifications.';
  end if;
  if not p_approve and nullif(btrim(p_reason), '') is null then
    raise exception 'Please tell the dropshipper what to fix.';
  end if;

  update public.dropshipper_verifications
  set status = case when p_approve then 'approved' else 'rejected' end,
      rejection_reason = case when p_approve then null else btrim(p_reason) end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where dropshipper_id = p_dropshipper_id and status = 'pending'
  returning * into v_row;

  if v_row is null then
    raise exception 'No pending verification found for this dropshipper.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.review_dropshipper_verification(uuid, boolean, text) to authenticated;

-- Selfies and card photos are images only for dropshippers, but the shared bucket already
-- limits types to jpeg/png/webp/pdf and 5 MB, which is what the app enforces too.
