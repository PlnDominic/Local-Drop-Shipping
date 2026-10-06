-- catalog-features.sql part 3 of 5. Run parts in order. Safe to re-run.
create or replace function public.create_order(
  p_dropshipper_id          uuid,
  p_customer_name           text,
  p_customer_phone          text,
  p_customer_region         text,
  p_customer_city           text,
  p_customer_ghana_post_gps text,
  p_items                   jsonb,
  p_notes                   text default null,
  p_platform_fee_percent    numeric default 2
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
  v_variant_id uuid;
  v_qty        int;
  v_line       jsonb;
  v_subtotal   numeric := 0;
  v_fee        numeric;
  v_quote      jsonb;
  v_delivery   numeric;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to place an order.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if not public.is_valid_ghana_post_gps(p_customer_ghana_post_gps) then
    raise exception 'Enter a valid GhanaPost GPS address, like GA-184-9022.';
  end if;

  v_quote := public.get_delivery_quote(p_customer_region, p_customer_city);
  if v_quote is null then
    raise exception 'Delivery is not available to that region yet. Please choose another region.';
  end if;
  v_delivery := (v_quote->>'fee')::numeric;

  -- Validate every line and total it using server-side prices.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_variant_id := nullif(v_item->>'variantId', '')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_line := public.resolve_order_line(p_dropshipper_id, v_product_id, v_variant_id, v_qty);
    v_subtotal := v_subtotal + (v_line->>'unitPrice')::numeric * v_qty;
  end loop;

  v_fee := round(v_subtotal * p_platform_fee_percent / 100, 2);

  insert into public.orders (
    dropshipper_id, customer_id, customer_name, customer_phone,
    customer_region, customer_city, customer_ghana_post_gps,
    status, subtotal, platform_fee, delivery_fee,
    delivery_min_days, delivery_max_days, total, notes, order_number
  ) values (
    p_dropshipper_id, auth.uid(), btrim(p_customer_name), btrim(p_customer_phone),
    btrim(p_customer_region), btrim(p_customer_city),
    public.normalize_ghana_post_gps(p_customer_ghana_post_gps),
    'pending', v_subtotal, v_fee, v_delivery,
    (v_quote->>'minDays')::int, (v_quote->>'maxDays')::int,
    v_subtotal + v_fee + v_delivery, p_notes,
    'LDK-' || lpad((floor(random() * 900000) + 100000)::text, 6, '0')
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_variant_id := nullif(v_item->>'variantId', '')::uuid;
    v_qty        := (v_item->>'quantity')::int;
    v_line := public.resolve_order_line(p_dropshipper_id, v_product_id, v_variant_id, v_qty);

    insert into public.order_items (
      order_id, product_id, quantity, unit_price, subtotal,
      variant_id, variant_label, variant_adjustment
    ) values (
      v_order.id, v_product_id, v_qty,
      (v_line->>'unitPrice')::numeric,
      round((v_line->>'unitPrice')::numeric * v_qty, 2),
      v_variant_id, v_line->>'variantLabel', (v_line->>'adjustment')::numeric
    );
  end loop;

  return v_order;
end;
$$;

revoke all on function public.create_order(uuid, text, text, text, text, text, jsonb, text, numeric) from public, anon;
grant execute on function public.create_order(uuid, text, text, text, text, text, jsonb, text, numeric) to authenticated;
