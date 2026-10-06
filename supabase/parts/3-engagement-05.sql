-- engagement-features.sql part 5 of 8. Run parts in order. Safe to re-run.
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
