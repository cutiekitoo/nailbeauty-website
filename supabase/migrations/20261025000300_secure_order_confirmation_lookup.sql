-- Secure order-confirmation lookup without public read access to order tables.
-- A random per-order token is returned only by create_order after successful checkout.
-- Public confirmation requests can read only the specific order matching that token.
begin;

alter table public.orders
  add column if not exists confirmation_token uuid;

alter table public.orders
  alter column confirmation_token set default gen_random_uuid();

update public.orders
set confirmation_token = gen_random_uuid()
where confirmation_token is null;

alter table public.orders
  alter column confirmation_token set not null;

create unique index if not exists orders_confirmation_token_uidx
  on public.orders (confirmation_token);

create or replace function public.create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_customer_name text;
  v_customer_phone text;
  v_wilaya_code text;
  v_wilaya_name text;
  v_delivery_method public.delivery_method;
  v_address text;
  v_office_location text;
  v_payment_method text;
  v_notes text;
  v_subtotal numeric := 0;
  v_shipping_fee numeric;
  v_total numeric;
  v_item_record record;
  v_product_id uuid;
  v_variant_id uuid;
  v_current_stock integer;
  v_db_unit_price numeric;
  v_item_quantity integer;
  v_line_total numeric;
  v_product_name text;
  v_product_image text;
  v_variant_name text;
  v_variant_code text;
  v_variant_price numeric;
  v_variant_stock integer;
  v_variant_image text;
  v_variant_active boolean;
  v_has_variants boolean;
  v_retry_count integer := 0;
begin
  if payload is null or jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Invalid order payload';
  end if;

  v_customer_name := nullif(btrim(payload->'customer'->>'fullName'), '');
  v_customer_phone := nullif(btrim(payload->'customer'->>'phone'), '');
  v_wilaya_code := nullif(btrim(payload->'delivery'->>'wilayaCode'), '');
  v_wilaya_name := nullif(btrim(payload->'delivery'->>'wilayaName'), '');
  v_delivery_method := nullif(payload->'delivery'->>'method', '')::public.delivery_method;
  v_address := nullif(btrim(payload->'delivery'->>'address'), '');
  v_office_location := nullif(btrim(payload->'delivery'->>'officeLocation'), '');
  v_payment_method := payload->>'paymentMethod';
  v_notes := nullif(btrim(payload->>'notes'), '');

  if v_customer_name is null then
    raise exception 'Customer name is required';
  end if;
  if v_customer_phone is null then
    raise exception 'Customer phone is required';
  end if;
  if v_wilaya_code is null then
    raise exception 'Wilaya code is required';
  end if;
  if v_delivery_method is null then
    raise exception 'Delivery method is required';
  end if;
  if v_delivery_method = 'home' and v_address is null then
    raise exception 'Delivery address is required';
  end if;
  if v_delivery_method = 'office' and v_office_location is null then
    raise exception 'DHD office location is required';
  end if;
  if v_payment_method is distinct from 'cod' then
    raise exception 'Payment method must be cod';
  end if;

  if coalesce(jsonb_typeof(payload->'items'), 'null') <> 'array' then
    raise exception 'Order items must be an array';
  end if;
  if jsonb_array_length(payload->'items') = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  -- Validate each line before aggregation so a zero-quantity line cannot hide behind duplicates.
  if exists (
    select 1
    from jsonb_array_elements(payload->'items') as elements(item)
    where nullif(elements.item->>'id', '') is null
       or coalesce((elements.item->>'quantity')::integer, 0) <= 0
  ) then
    raise exception 'Every order item must have a product ID and a positive integer quantity';
  end if;

  -- Lock and validate each distinct product/variant pair in deterministic order.
  -- Prices and stock are read from the database, not trusted from the browser.
  for v_item_record in
    select
      (elements.item->>'id')::uuid as product_id,
      coalesce(nullif(elements.item->>'variantId', ''), nullif(elements.item->>'variant_id', ''))::uuid as variant_id,
      sum((elements.item->>'quantity')::integer)::integer as total_quantity
    from jsonb_array_elements(payload->'items') as elements(item)
    group by
      (elements.item->>'id')::uuid,
      coalesce(nullif(elements.item->>'variantId', ''), nullif(elements.item->>'variant_id', ''))::uuid
    order by product_id, variant_id nulls first
  loop
    v_product_id := v_item_record.product_id;
    v_variant_id := v_item_record.variant_id;
    v_item_quantity := v_item_record.total_quantity;

    select price, name, images[1], stock
      into v_db_unit_price, v_product_name, v_product_image, v_current_stock
    from public.products
    where id = v_product_id
    for update;

    if not found then
      raise exception 'Product not found with id: %', v_product_id;
    end if;

    if v_variant_id is not null then
      select name, code, price, stock, image, is_active
        into v_variant_name, v_variant_code, v_variant_price, v_variant_stock, v_variant_image, v_variant_active
      from public.product_variants
      where id = v_variant_id and product_id = v_product_id
      for update;

      if not found then
        raise exception 'Variant % does not belong to product % or no longer exists', v_variant_id, v_product_id;
      end if;
      if v_variant_active is not true then
        raise exception 'Variant % is inactive and cannot be ordered', v_variant_id;
      end if;

      v_current_stock := v_variant_stock;
      v_db_unit_price := v_variant_price;
      v_product_image := coalesce(nullif(v_variant_image, ''), v_product_image);
    else
      -- A product configured with variants must be ordered through one of those variants.
      select exists (
        select 1 from public.product_variants where product_id = v_product_id
      ) into v_has_variants;

      if v_has_variants then
        raise exception 'A variant must be selected for product %', v_product_id;
      end if;
    end if;

    if v_current_stock < v_item_quantity then
      raise exception 'Insufficient stock for item %. Available: %, requested: %',
        coalesce(v_variant_id::text, v_product_id::text), v_current_stock, v_item_quantity;
    end if;

    v_subtotal := v_subtotal + (v_db_unit_price * v_item_quantity);
  end loop;

  select case when v_delivery_method = 'home' then home_rate else office_rate end
    into v_shipping_fee
  from public.shipping_rates
  where code = v_wilaya_code and enabled = true;

  if v_shipping_fee is null then
    raise exception 'Shipping rate not found or disabled for wilaya code: %', v_wilaya_code;
  end if;

  v_total := v_subtotal + v_shipping_fee;

  loop
    v_order_number := 'NB-' || to_char(current_date, 'YYYYMMDD') || '-' ||
      lpad(floor(random() * 9000 + 1000)::text, 4, '0');

    begin
      insert into public.orders (
        order_number, customer_name, customer_phone, wilaya_code, wilaya_name,
        delivery_method, address, office_location, subtotal, shipping_fee,
        total, payment_method, status, notes
      ) values (
        v_order_number, v_customer_name, v_customer_phone, v_wilaya_code,
        coalesce(v_wilaya_name, v_wilaya_code), v_delivery_method, v_address,
        v_office_location, v_subtotal, v_shipping_fee, v_total, v_payment_method,
        'pending', v_notes
      ) returning id into v_order_id;
      exit;
    exception when unique_violation then
      v_retry_count := v_retry_count + 1;
      if v_retry_count >= 10 then
        raise exception 'Failed to generate a unique order number after 10 attempts';
      end if;
    end;
  end loop;

  -- Reserve stock from the exact product or variant, aggregating duplicate lines.
  for v_item_record in
    select
      (elements.item->>'id')::uuid as product_id,
      coalesce(nullif(elements.item->>'variantId', ''), nullif(elements.item->>'variant_id', ''))::uuid as variant_id,
      sum((elements.item->>'quantity')::integer)::integer as total_quantity
    from jsonb_array_elements(payload->'items') as elements(item)
    group by
      (elements.item->>'id')::uuid,
      coalesce(nullif(elements.item->>'variantId', ''), nullif(elements.item->>'variant_id', ''))::uuid
    order by product_id, variant_id nulls first
  loop
    if v_item_record.variant_id is not null then
      update public.product_variants
      set stock = stock - v_item_record.total_quantity, updated_at = now()
      where id = v_item_record.variant_id
        and product_id = v_item_record.product_id
        and is_active = true
        and stock >= v_item_record.total_quantity;

      if not found then
        raise exception 'Variant stock changed while placing the order. Please retry';
      end if;
    else
      update public.products
      set stock = stock - v_item_record.total_quantity, updated_at = now()
      where id = v_item_record.product_id
        and stock >= v_item_record.total_quantity;

      if not found then
        raise exception 'Product stock changed while placing the order. Please retry';
      end if;
    end if;
  end loop;

  -- Store one order line per submitted line, with database-authoritative prices and variant IDs.
  for v_item_record in
    select elements.item as item
    from jsonb_array_elements(payload->'items') as elements(item)
  loop
    v_product_id := (v_item_record.item->>'id')::uuid;
    v_variant_id := coalesce(nullif(v_item_record.item->>'variantId', ''), nullif(v_item_record.item->>'variant_id', ''))::uuid;
    v_item_quantity := (v_item_record.item->>'quantity')::integer;

    if v_variant_id is not null then
      select p.name, coalesce(nullif(pv.image, ''), p.images[1]), pv.price, pv.name, pv.code
        into v_product_name, v_product_image, v_db_unit_price, v_variant_name, v_variant_code
      from public.products p
      join public.product_variants pv on pv.product_id = p.id and pv.id = v_variant_id
      where p.id = v_product_id;

      if not found then
        raise exception 'Could not load product/variant details for order item';
      end if;
    else
      select name, images[1], price
        into v_product_name, v_product_image, v_db_unit_price
      from public.products
      where id = v_product_id;

      if not found then
        raise exception 'Could not load product details for order item';
      end if;
    end if;

    v_line_total := v_db_unit_price * v_item_quantity;

    insert into public.order_items (
      order_id, product_id, variant_id, name, image, unit_price, quantity, line_total
    ) values (
      v_order_id, v_product_id, v_variant_id,
      case
        when v_variant_id is not null then
          v_product_name || ' — ' || v_variant_name || ' (' || v_variant_code || ')'
        else v_product_name
      end,
      v_product_image, v_db_unit_price, v_item_quantity, v_line_total
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping_fee', v_shipping_fee,
    'total', v_total,
    'status', 'pending',
    'confirmation_token', (
      select o.confirmation_token
      from public.orders o
      where o.id = v_order_id
    )
  );
end;
$$;
revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;


-- Return only the order associated with the unguessable per-order confirmation token.
-- This avoids granting public SELECT access to the orders or order_items tables.
create or replace function public.get_order_confirmation(
  p_confirmation_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $confirmation$
declare
  v_order record;
  v_items jsonb;
begin
  if p_confirmation_token is null then
    return null;
  end if;

  select
    o.id,
    o.order_number,
    o.created_at,
    o.contact_started_at,
    o.customer_name,
    o.customer_phone,
    o.wilaya_code,
    o.wilaya_name,
    o.delivery_method,
    o.address,
    o.office_location,
    o.subtotal,
    o.shipping_fee,
    o.total,
    o.payment_method,
    o.status,
    o.notes
  into v_order
  from public.orders o
  where o.confirmation_token = p_confirmation_token;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'variant_id', oi.variant_id,
        'name', oi.name,
        'image', oi.image,
        'unit_price', oi.unit_price,
        'quantity', oi.quantity,
        'line_total', oi.line_total
      )
      order by oi.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'created_at', v_order.created_at,
    'contact_started_at', v_order.contact_started_at,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'wilaya_code', v_order.wilaya_code,
    'wilaya_name', v_order.wilaya_name,
    'delivery_method', v_order.delivery_method,
    'address', v_order.address,
    'office_location', v_order.office_location,
    'subtotal', v_order.subtotal,
    'shipping_fee', v_order.shipping_fee,
    'total', v_order.total,
    'payment_method', v_order.payment_method,
    'status', v_order.status,
    'notes', v_order.notes,
    'items', v_items
  );
end;
$confirmation$;

revoke all on function public.get_order_confirmation(uuid) from public;
grant execute on function public.get_order_confirmation(uuid) to anon, authenticated;

commit;
