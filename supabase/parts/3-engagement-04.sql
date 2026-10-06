-- engagement-features.sql part 4 of 8. Run parts in order. Safe to re-run.
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
