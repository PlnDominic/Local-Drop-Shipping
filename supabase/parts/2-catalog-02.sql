-- catalog-features.sql part 2 of 5. Run parts in order. Safe to re-run.
-- ============================================================================
-- 3. create_order with variants. Items look like
--    {"productId": "...", "quantity": 2, "variantId": "..."} (variantId optional).
-- ============================================================================

-- Resolves one cart line to its server-side price. Internal helper.
create or replace function public.resolve_order_line(
  p_dropshipper_id uuid,
  p_product_id     uuid,
  p_variant_id     uuid,
  p_qty            int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price   numeric;
  v_var     public.product_variants;
  v_adj     numeric := 0;
  v_label   text;
  v_unit    numeric;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'Invalid quantity for product %', p_product_id;
  end if;

  select custom_price into v_price
  from public.dropshipper_products
  where dropshipper_id = p_dropshipper_id and product_id = p_product_id and is_published;

  if v_price is null or v_price <= 0 then
    raise exception 'Product % is not available in this store', p_product_id;
  end if;

  if p_variant_id is not null then
    select * into v_var from public.product_variants where id = p_variant_id;
    if v_var.id is null or v_var.product_id <> p_product_id then
      raise exception 'That option is no longer available.';
    end if;
    if not v_var.is_active or v_var.stock_qty < p_qty then
      raise exception '% is out of stock.', v_var.label;
    end if;
    v_adj := v_var.price_adjustment;
    v_label := v_var.label;
  elsif exists (select 1 from public.product_variants where product_id = p_product_id and is_active) then
    raise exception 'Please choose an option (size, colour, etc.) for this product.';
  end if;

  v_unit := v_price + v_adj;
  if v_unit <= 0 then
    raise exception 'Product % is not available in this store', p_product_id;
  end if;

  return jsonb_build_object(
    'unitPrice', v_unit,
    'adjustment', v_adj,
    'variantId', p_variant_id,
    'variantLabel', v_label
  );
end;
$$;

revoke all on function public.resolve_order_line(uuid, uuid, uuid, int) from public, anon, authenticated;
