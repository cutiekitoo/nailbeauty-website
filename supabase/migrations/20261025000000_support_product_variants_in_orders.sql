-- Variant-aware order creation and stock restoration.
-- Additive migration for an existing Nail Beauty Supabase database.
-- It intentionally does not guess variants for historical order lines.
begin;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  code text not null,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, code)
);

alter table public.product_variants add column if not exists image text;
alter table public.product_variants add column if not exists is_active boolean not null default true;
alter table public.product_variants add column if not exists created_at timestamptz not null default now();
alter table public.product_variants add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='product_id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='code')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='name')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='price')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='product_variants' and column_name='stock') then
    raise exception 'product_variants is missing required columns (product_id, code, name, price or stock). Review its schema before applying this migration.';
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists product_variants_product_active_idx
  on public.product_variants (product_id, is_active);

grant select on public.product_variants to anon, authenticated;
grant all on public.product_variants to authenticated;
grant all on public.product_variants to service_role;
alter table public.product_variants enable row level security;

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_variants'
      and policyname='product variants public active read'
  ) then
    execute 'create policy "product variants public active read"
      on public.product_variants for select to anon, authenticated
      using (is_active = true)';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='product_variants'
      and policyname='product variants admin write'
  ) then
    execute 'create policy "product variants admin write"
      on public.product_variants for all to authenticated
      using (public.has_role(auth.uid(), ''admin''))
      with check (public.has_role(auth.uid(), ''admin''))';
  end if;
end $$;

alter table public.order_items add column if not exists variant_id uuid;
alter table public.order_items drop constraint if exists order_items_variant_id_fkey;
alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id)
  on delete restrict not valid;
create index if not exists order_items_variant_id_idx on public.order_items (variant_id);

alter table public.orders add column if not exists stock_restored boolean not null default false;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;

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
    'status', 'pending'
  );
end;
$$;
revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

create or replace function public.restore_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_restored boolean;
  v_order_status public.order_status;
  v_item record;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized to restore order stock';
  end if;

  select status, stock_restored
    into v_order_status, v_stock_restored
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found: %', p_order_id;
  end if;

  -- This routine may only return inventory after a cancellation or customer return.
  if v_order_status not in ('cancelled', 'returned') then
    raise exception 'Stock can only be restored for cancelled or returned orders';
  end if;

  if coalesce(v_stock_restored, false) then
    return;
  end if;

  for v_item in
    select product_id, variant_id, sum(quantity)::integer as total_quantity
    from public.order_items
    where order_id = p_order_id
      and (product_id is not null or variant_id is not null)
    group by product_id, variant_id
    order by product_id nulls last, variant_id nulls first
  loop
    if v_item.variant_id is not null then
      update public.product_variants
      set stock = stock + v_item.total_quantity,
          updated_at = now()
      where id = v_item.variant_id;

      if not found then
        raise exception 'Cannot restore stock: variant % no longer exists', v_item.variant_id;
      end if;
    elsif v_item.product_id is not null then
      update public.products
      set stock = stock + v_item.total_quantity,
          updated_at = now()
      where id = v_item.product_id;
      -- If a product was deleted, its historical order_items.product_id is NULL.
    end if;
  end loop;

  update public.orders
  set stock_restored = true
  where id = p_order_id;
end;
$$;
revoke all on function public.restore_stock(uuid) from public;
grant execute on function public.restore_stock(uuid) to authenticated;

-- Keep the currently supported return transitions and align validation with
-- the cancelled-order reactivation handled by update_order_status.
create or replace function public.validate_order_status_transition(
  current_status public.order_status,
  new_status public.order_status
)
returns boolean
language sql
immutable
as $validator$
  select case
    when current_status = 'pending'
      and new_status in ('confirmed', 'cancelled') then true
    when current_status = 'confirmed'
      and new_status in ('shipped', 'cancelled') then true
    when current_status = 'shipped'
      and new_status in ('delivered', 'returned', 'cancelled') then true
    when current_status = 'delivered'
      and new_status = 'returned' then true
    when current_status = 'cancelled'
      and new_status = 'pending' then true
    else false
  end;
$validator$;

create or replace function public.update_order_status(
  p_order_id uuid,
  new_status public.order_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status public.order_status;
  v_stock_restored boolean;
  v_item record;
  v_current_stock integer;
  v_variant_active boolean;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized to update order status';
  end if;

  select status, stock_restored into v_current_status, v_stock_restored
  from public.orders where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if not public.validate_order_status_transition(v_current_status, new_status) then
    raise exception 'Invalid status transition from % to %', v_current_status, new_status;
  end if;

  -- When reactivating a cancelled order, reserve its previous product/variant quantities again.
  if v_current_status = 'cancelled' and new_status <> 'cancelled' and v_stock_restored then
    for v_item in
      select product_id, variant_id, sum(quantity)::integer as total_quantity
      from public.order_items
      where order_id = p_order_id and (product_id is not null or variant_id is not null)
      group by product_id, variant_id
      order by product_id nulls last, variant_id nulls first
    loop
      if v_item.variant_id is not null then
        select stock, is_active into v_current_stock, v_variant_active
        from public.product_variants
        where id = v_item.variant_id
        for update;

        if not found or v_variant_active is not true then
          raise exception 'Cannot reactivate order: variant % is missing or inactive', v_item.variant_id;
        end if;
      elsif v_item.product_id is not null then
        select stock into v_current_stock
        from public.products where id = v_item.product_id
        for update;

        if not found then
          raise exception 'Cannot reactivate order: product % no longer exists', v_item.product_id;
        end if;
      else
        continue;
      end if;

      if v_current_stock < v_item.total_quantity then
        raise exception 'Insufficient stock to reactivate order. Item %, available: %, required: %',
          coalesce(v_item.variant_id::text, v_item.product_id::text),
          v_current_stock, v_item.total_quantity;
      end if;

      if v_item.variant_id is not null then
        update public.product_variants
        set stock = stock - v_item.total_quantity, updated_at = now()
        where id = v_item.variant_id and is_active = true and stock >= v_item.total_quantity;
      else
        update public.products
        set stock = stock - v_item.total_quantity, updated_at = now()
        where id = v_item.product_id and stock >= v_item.total_quantity;
      end if;

      if not found then
        raise exception 'Stock changed while reactivating the order. Please retry';
      end if;
    end loop;

    update public.orders
    set stock_restored = false, shipped_at = null, delivered_at = null
    where id = p_order_id;
  end if;

  update public.orders
  set
    status = new_status,
    shipped_at = case
      when new_status = 'shipped' and v_current_status <> 'shipped' then now()
      else shipped_at
    end,
    delivered_at = case
      when new_status = 'delivered' and v_current_status <> 'delivered' then now()
      else delivered_at
    end
  where id = p_order_id;

  if new_status in ('cancelled', 'returned') and v_current_status <> new_status then
    perform public.restore_stock(p_order_id);
  end if;

  return jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'old_status', v_current_status,
    'new_status', new_status
  );
end;
$$;
revoke all on function public.update_order_status(uuid, public.order_status) from public;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname='supabase_realtime' and schemaname='public' and tablename='product_variants'
     ) then
    alter publication supabase_realtime add table public.product_variants;
  end if;
end $$;

commit;
