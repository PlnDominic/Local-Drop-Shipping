-- audit-log.sql part 2 of 2. Run parts in order. Safe to re-run.

drop trigger if exists trg_audit_supplier_verification on public.supplier_verifications;
create trigger trg_audit_supplier_verification
  after update of status on public.supplier_verifications
  for each row execute function public.trg_audit_changes('supplier_verification', 'supplier_id', 'status', 'rejection_reason');

drop trigger if exists trg_audit_refund on public.refund_requests;
create trigger trg_audit_refund
  after update of status, refund_amount on public.refund_requests
  for each row execute function public.trg_audit_changes('refund', 'id', 'status', 'refund_amount', 'order_id');

drop trigger if exists trg_audit_review on public.reviews;
create trigger trg_audit_review
  after update of is_hidden on public.reviews
  for each row execute function public.trg_audit_changes('review', 'id', 'is_hidden', 'product_id');

drop trigger if exists trg_audit_delivery_zone on public.delivery_zones;
create trigger trg_audit_delivery_zone
  after insert or update or delete on public.delivery_zones
  for each row execute function public.trg_audit_changes('delivery_zone', 'id', 'region', 'city', 'fee', 'min_days', 'max_days', 'is_active');

drop trigger if exists trg_audit_setting on public.app_settings;
create trigger trg_audit_setting
  after insert or update on public.app_settings
  for each row execute function public.trg_audit_changes('setting', 'key', 'value');

-- Orders: anything an admin changes, every cancellation or refund, payment and
-- earnings (commission + supplier payouts credited or taken back).
create or replace function public.trg_audit_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := coalesce(new.order_number, left(new.id::text, 8));
begin
  if new.status is distinct from old.status
     and (coalesce(public.app_user_role(), '') = 'admin' or new.status in ('cancelled', 'refunded')) then
    perform public.log_audit('order.status_changed', 'order', new.id::text,
      v_label || ': ' || old.status || ' → ' || new.status,
      jsonb_build_object('from', old.status, 'to', new.status, 'total', new.total));
  end if;

  if new.payment_status is distinct from old.payment_status then
    perform public.log_audit('order.payment_' || new.payment_status, 'order', new.id::text,
      v_label || ' marked ' || new.payment_status || ' (GHS ' || new.total || ')',
      jsonb_build_object('from', old.payment_status, 'to', new.payment_status, 'total', new.total));
  end if;

  if new.earnings_credited is distinct from old.earnings_credited then
    perform public.log_audit(
      case when new.earnings_credited then 'order.earnings_credited' else 'order.earnings_reversed' end,
      'order', new.id::text,
      case when new.earnings_credited then 'Commission and supplier payouts credited for ' || v_label
           else 'Commission and supplier payouts taken back for ' || v_label end,
      jsonb_build_object('status', new.status));
  end if;
  return null;
end;
$$;

revoke all on function public.trg_audit_order() from public, anon, authenticated;

drop trigger if exists trg_audit_order on public.orders;
create trigger trg_audit_order
  after update on public.orders
  for each row execute function public.trg_audit_order();

notify pgrst, 'reload schema';
