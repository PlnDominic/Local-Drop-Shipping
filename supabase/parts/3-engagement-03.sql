-- engagement-features.sql part 3 of 8. Run parts in order. Safe to re-run.
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
