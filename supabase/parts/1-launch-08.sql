-- launch-features.sql part 8 of 10. Run parts in order. Safe to re-run.
-- Private bucket for the documents: <user_id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-documents', 'supplier-documents', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owner or admin reads supplier documents" on storage.objects;
create policy "owner or admin reads supplier documents" on storage.objects for select
  using (
    bucket_id = 'supplier-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.app_user_role() = 'admin')
  );

drop policy if exists "owner uploads supplier documents" on storage.objects;
create policy "owner uploads supplier documents" on storage.objects for insert
  with check (bucket_id = 'supplier-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owner deletes supplier documents" on storage.objects;
create policy "owner deletes supplier documents" on storage.objects for delete
  using (bucket_id = 'supplier-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.submit_supplier_verification(
  p_ghana_card_number   text,
  p_business_reg_number text,
  p_front_path          text,
  p_back_path           text default null,
  p_business_doc_path   text default null
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
  if (p_back_path is not null and p_back_path not like v_uid::text || '/%')
     or (p_business_doc_path is not null and p_business_doc_path not like v_uid::text || '/%') then
    raise exception 'Invalid document upload.';
  end if;
  if exists (select 1 from public.supplier_verifications where supplier_id = v_uid and status = 'approved') then
    raise exception 'You are already verified.';
  end if;

  insert into public.supplier_verifications (
    supplier_id, ghana_card_number, business_reg_number,
    ghana_card_front_path, ghana_card_back_path, business_doc_path,
    status, rejection_reason, submitted_at, reviewed_at, reviewed_by
  ) values (
    v_uid, v_card, nullif(btrim(p_business_reg_number), ''),
    p_front_path, p_back_path, p_business_doc_path,
    'pending', null, now(), null, null
  )
  on conflict (supplier_id) do update set
    ghana_card_number = excluded.ghana_card_number,
    business_reg_number = excluded.business_reg_number,
    ghana_card_front_path = excluded.ghana_card_front_path,
    ghana_card_back_path = excluded.ghana_card_back_path,
    business_doc_path = excluded.business_doc_path,
    status = 'pending',
    rejection_reason = null,
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.submit_supplier_verification(text, text, text, text, text) to authenticated;

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
  set is_verified = p_approve, updated_at = now()
  where id = p_supplier_id;

  return v_row;
end;
$$;

grant execute on function public.review_supplier_verification(uuid, boolean, text) to authenticated;
