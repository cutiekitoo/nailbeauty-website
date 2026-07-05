-- ============================================
-- CORRECTED SUPABASE MIGRATION SCRIPT
-- Run in Supabase SQL Editor in order
-- ============================================

-- 1.1 Extensions + roles
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "users read own roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- 1.2 Products (with indexes)
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  rating numeric(3,2) not null default 5 check (rating between 0 and 5),
  short_description text not null default '',
  description text not null default '',
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add index for slug lookups
create index idx_products_slug on public.products(slug);

grant select on public.products to anon, authenticated;
grant all on public.products to authenticated;
grant all on public.products to service_role;

alter table public.products enable row level security;

create policy "products public read"
  on public.products for select to anon, authenticated using (true);

create policy "products admin write"
  on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- 1.3 Shipping rates (58 wilayas)
create table public.shipping_rates (
  code text primary key,
  name text not null,
  enabled boolean not null default true,
  home_rate numeric(10,2) not null default 0 check (home_rate >= 0),
  office_rate numeric(10,2) not null default 0 check (office_rate >= 0),
  updated_at timestamptz not null default now()
);

grant select on public.shipping_rates to anon, authenticated;
grant all on public.shipping_rates to authenticated;
grant all on public.shipping_rates to service_role;

alter table public.shipping_rates enable row level security;

create policy "shipping public read"
  on public.shipping_rates for select to anon, authenticated using (true);

create policy "shipping admin write"
  on public.shipping_rates for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger shipping_rates_set_updated_at
  before update on public.shipping_rates
  for each row execute function public.set_updated_at();

insert into public.shipping_rates (code, name, home_rate, office_rate) values
('01','Adrar',1200,900),('02','Chlef',700,500),('03','Laghouat',900,700),
('04','Oum El Bouaghi',800,600),('05','Batna',800,600),('06','Béjaïa',700,500),
('07','Biskra',900,700),('08','Béchar',1200,900),('09','Blida',600,400),
('10','Bouira',700,500),('11','Tamanrasset',1400,1100),('12','Tébessa',900,700),
('13','Tlemcen',800,600),('14','Tiaret',800,600),('15','Tizi Ouzou',700,500),
('16','Alger',600,400),('17','Djelfa',900,700),('18','Jijel',800,600),
('19','Sétif',700,500),('20','Saïda',900,700),('21','Skikda',800,600),
('22','Sidi Bel Abbès',800,600),('23','Annaba',800,600),('24','Guelma',800,600),
('25','Constantine',800,600),('26','Médéa',700,500),('27','Mostaganem',800,600),
('28','M''Sila',800,600),('29','Mascara',800,600),('30','Ouargla',1100,800),
('31','Oran',800,600),('32','El Bayadh',1000,800),('33','Illizi',1400,1100),
('34','Bordj Bou Arreridj',700,500),('35','Boumerdès',600,400),('36','El Tarf',800,600),
('37','Tindouf',1400,1100),('38','Tissemsilt',800,600),('39','El Oued',1000,800),
('40','Khenchela',900,700),('41','Souk Ahras',800,600),('42','Tipaza',600,400),
('43','Mila',800,600),('44','Aïn Defla',700,500),('45','Naâma',1000,800),
('46','Aïn Témouchent',800,600),('47','Ghardaïa',1000,800),('48','Relizane',800,600),
('49','Timimoun',1300,1000),('50','Bordj Badji Mokhtar',1400,1100),
('51','Ouled Djellal',900,700),('52','Béni Abbès',1300,1000),('53','In Salah',1400,1100),
('54','In Guezzam',1500,1200),('55','Touggourt',1000,800),('56','Djanet',1500,1200),
('57','El M''Ghair',1000,800),('58','El Meniaa',1200,900);

-- 1.4 Orders + order items (guest checkout, no user_id)
create type public.order_status as enum ('pending','confirmed','shipped','delivered','cancelled');
create type public.delivery_method as enum ('home','office');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('NB-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  customer_name text not null,
  customer_phone text not null,
  wilaya_code text not null references public.shipping_rates(code),
  wilaya_name text not null,
  delivery_method public.delivery_method not null,
  address text,
  office_location text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_fee numeric(12,2) not null check (shipping_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null default 'cod',
  status public.order_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

-- Add indexes for order lookups
create index idx_orders_order_number on public.orders(order_number);
create index idx_orders_customer_phone on public.orders(customer_phone);
create index idx_orders_status on public.orders(status);

-- Add stock_restored column for idempotent stock restoration
alter table public.orders add column stock_restored boolean not null default false;

-- Add index for stock_restored lookups
create index idx_orders_stock_restored on public.orders(stock_restored);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  image text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

-- Add index for product revenue queries
create index idx_order_items_product_id on public.order_items(product_id);
create index idx_order_items_order_id on public.order_items(order_id);

grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;

grant insert on public.order_items to anon, authenticated;
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- RLS policies for orders (guest checkout, admin only for read/update/delete)
create policy "orders anon insert"
  on public.orders for insert to anon, authenticated with check (true);
create policy "orders admin read"
  on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "orders admin update"
  on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "orders admin delete"
  on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- RLS policies for order_items (guest checkout, admin only for read)
create policy "order_items anon insert"
  on public.order_items for insert to anon, authenticated with check (true);
create policy "order_items admin read"
  on public.order_items for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- 1.5 Order status transition validation function
create or replace function public.validate_order_status_transition(
  current_status public.order_status,
  new_status public.order_status
)
returns boolean
language sql immutable
as $$
  select case
    when current_status = 'pending' and new_status in ('confirmed', 'cancelled') then true
    when current_status = 'confirmed' and new_status in ('shipped', 'cancelled') then true
    when current_status = 'shipped' and new_status = 'delivered' then true
    when current_status = 'delivered' then false
    when current_status = 'cancelled' then false
    else false
  end;
$$;

-- 1.6 Transaction-safe create_order RPC function (guest checkout, atomic)
create or replace function public.create_order(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public
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
  v_subtotal numeric;
  v_shipping_fee numeric;
  v_total numeric;
  v_item_record record;
  v_product_id uuid;
  v_current_stock integer;
  v_db_unit_price numeric;
  v_item_quantity integer;
  v_line_total numeric;
  v_product_name text;
  v_product_image text;
  v_retry_count integer;
begin
  -- Extract payload fields
  v_customer_name := (payload->'customer'->>'fullName');
  v_customer_phone := (payload->'customer'->>'phone');
  v_wilaya_code := (payload->'delivery'->>'wilayaCode');
  v_wilaya_name := (payload->'delivery'->>'wilayaName');
  v_delivery_method := (payload->'delivery'->>'method')::public.delivery_method;
  v_address := (payload->'delivery'->>'address');
  v_office_location := (payload->'delivery'->>'officeLocation');
  v_payment_method := (payload->>'paymentMethod');
  v_notes := (payload->>'notes');
  
  -- Validation
  if v_customer_name is null or v_customer_name = '' then
    raise exception 'Customer name is required';
  end if;
  
  if v_customer_phone is null or v_customer_phone = '' then
    raise exception 'Customer phone is required';
  end if;
  
  if v_wilaya_code is null or v_wilaya_code = '' then
    raise exception 'Wilaya code is required';
  end if;
  
  if v_delivery_method is null then
    raise exception 'Delivery method is required';
  end if;
  
  if v_payment_method is null or v_payment_method != 'cod' then
    raise exception 'Payment method must be cod';
  end if;
  
  if (payload->'items') is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Order must contain at least one item';
  end if;
  
  -- Calculate subtotal using server-side product prices and lock products for stock validation
  -- Aggregate duplicate product IDs to prevent stock bypass
  v_subtotal := 0;
  for v_item_record in 
    select (item->>'id')::uuid as product_id, 
           sum((item->>'quantity')::integer) as total_quantity
    from jsonb_array_elements(payload->'items') as item
    group by (item->>'id')::uuid
    order by (item->>'id')::uuid
  loop
    v_product_id := v_item_record.product_id;
    v_item_quantity := v_item_record.total_quantity;
    
    if v_item_quantity is null or v_item_quantity <= 0 then
      raise exception 'Item quantity must be greater than 0';
    end if;
    
    -- Lock product and fetch price, name, image, and stock
    select price, name, images[1], stock into v_db_unit_price, v_product_name, v_product_image, v_current_stock
    from public.products
    where id = v_product_id
    for update;
    
    if v_db_unit_price is null then
      raise exception 'Product not found with id: %', v_product_id;
    end if;
    
    if v_current_stock < v_item_quantity then
      raise exception 'Insufficient stock for product. Available: %, Requested: %', v_current_stock, v_item_quantity;
    end if;
    
    v_line_total := v_db_unit_price * v_item_quantity;
    v_subtotal := v_subtotal + v_line_total;
  end loop;
  
  -- Get shipping fee
  select 
    case 
      when v_delivery_method = 'home' then home_rate
      else office_rate
    end
  into v_shipping_fee
  from public.shipping_rates
  where code = v_wilaya_code and enabled = true;
  
  if v_shipping_fee is null then
    raise exception 'Shipping rate not found or disabled for wilaya code: %', v_wilaya_code;
  end if;
  
  v_total := v_subtotal + v_shipping_fee;
  
  -- Generate order number with retry logic for collision handling
  v_retry_count := 0;
  loop
    v_order_number := 'NB-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    
    begin
      insert into public.orders (
        order_number,
        customer_name,
        customer_phone,
        wilaya_code,
        wilaya_name,
        delivery_method,
        address,
        office_location,
        subtotal,
        shipping_fee,
        total,
        payment_method,
        status,
        notes
      ) values (
        v_order_number,
        v_customer_name,
        v_customer_phone,
        v_wilaya_code,
        v_wilaya_name,
        v_delivery_method,
        v_address,
        v_office_location,
        v_subtotal,
        v_shipping_fee,
        v_total,
        v_payment_method,
        'pending',
        v_notes
      ) returning id into v_order_id;
      exit; -- Success, exit retry loop
    exception when unique_violation then
      v_retry_count := v_retry_count + 1;
      if v_retry_count >= 10 then
        raise exception 'Failed to generate unique order number after 10 attempts';
      end if;
    end;
  end loop;
  
  -- Insert order items and decrement stock (products already locked and validated)
  -- First, decrement stock using aggregated quantities
  for v_item_record in 
    select (item->>'id')::uuid as product_id, 
           sum((item->>'quantity')::integer) as total_quantity
    from jsonb_array_elements(payload->'items') as item
    group by (item->>'id')::uuid
    order by (item->>'id')::uuid
  loop
    v_product_id := v_item_record.product_id;
    v_item_quantity := v_item_record.total_quantity;
    
    -- Decrement stock
    update public.products
    set stock = stock - v_item_quantity, updated_at = now()
    where id = v_product_id;
  end loop;
  
  -- Then, insert individual order items as they appear in the payload
  for v_item_record in select jsonb_array_elements(payload->'items') as item loop
    v_product_id := (v_item_record.item->>'id')::uuid;
    v_item_quantity := (v_item_record.item->>'quantity')::integer;
    
    -- Fetch product details (already locked)
    select price, name, images[1] into v_db_unit_price, v_product_name, v_product_image
    from public.products
    where id = v_product_id;
    
    v_line_total := v_db_unit_price * v_item_quantity;
    
    -- Insert order item
    insert into public.order_items (
      order_id,
      product_id,
      name,
      image,
      unit_price,
      quantity,
      line_total
    ) values (
      v_order_id,
      v_product_id,
      v_product_name,
      v_product_image,
      v_db_unit_price,
      v_item_quantity,
      v_line_total
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

grant execute on function public.create_order(jsonb) to anon, authenticated;

-- 1.7 Stock restoration function for cancelled orders
create or replace function public.restore_stock(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_item record;
  v_stock_restored boolean;
begin
  -- Lock order row and check if stock has already been restored
  select stock_restored into v_stock_restored
  from public.orders
  where id = p_order_id
  for update;
  
  if v_stock_restored then
    return;
  end if;
  
  -- Restore stock for each item in deterministic product_id order
  for v_item in 
    select product_id, quantity 
    from public.order_items 
    where order_id = p_order_id and product_id is not null
    order by product_id
  loop
    update public.products
    set stock = stock + v_item.quantity, updated_at = now()
    where id = v_item.product_id;
  end loop;
  
  -- Mark stock as restored
  update public.orders
  set stock_restored = true
  where id = p_order_id;
end;
$$;

grant execute on function public.restore_stock(uuid) to authenticated;

-- 1.8 Order status update function with stock restoration
create or replace function public.update_order_status(
  p_order_id uuid,
  new_status public.order_status
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_current_status public.order_status;
  v_stock_restored boolean;
  v_item record;
  v_current_stock integer;
begin
  -- Get current status and stock_restored flag
  select status, stock_restored into v_current_status, v_stock_restored
  from public.orders
  where id = p_order_id;
  
  if v_current_status is null then
    raise exception 'Order not found';
  end if;
  
  -- Validate transition
  if not public.validate_order_status_transition(v_current_status, new_status) then
    raise exception 'Invalid status transition from % to %', v_current_status, new_status;
  end if;
  
  -- If reactivating from cancelled, check and decrement stock first
  if v_current_status = 'cancelled' and new_status != 'cancelled' then
    if v_stock_restored then
      -- Check and decrement stock for each item in deterministic product_id order
      for v_item in 
        select product_id, quantity 
        from public.order_items 
        where order_id = p_order_id and product_id is not null
        order by product_id
      loop
        -- Lock and check stock
        select stock into v_current_stock
        from public.products
        where id = v_item.product_id
        for update;
        
        if v_current_stock is null then
          raise exception 'Product not found with id: %', v_item.product_id;
        end if;
        
        if v_current_stock < v_item.quantity then
          raise exception 'Insufficient stock to reactivate order. Product ID: %, Available: %, Required: %', v_item.product_id, v_current_stock, v_item.quantity;
        end if;
        
        -- Decrement stock
        update public.products
        set stock = stock - v_item.quantity, updated_at = now()
        where id = v_item.product_id;
      end loop;
      
      -- Reset stock_restored flag
      update public.orders
      set stock_restored = false
      where id = p_order_id;
    end if;
  end if;
  
  -- Update status first
  update public.orders
  set status = new_status
  where id = p_order_id;
  
  -- If cancelling, restore stock after status update
  if new_status = 'cancelled' and v_current_status != 'cancelled' then
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

grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;

-- 1.9 Product revenue view (delivered orders only, excludes shipping)
create or replace view public.product_revenue as
select 
  p.id as product_id,
  p.name as product_name,
  p.slug,
  coalesce(sum(oi.quantity), 0) as units_sold,
  coalesce(sum(oi.line_total), 0) as revenue,
  coalesce(count(distinct o.id), 0) as orders_count
from public.products p
inner join public.order_items oi on oi.product_id = p.id
inner join public.orders o on o.id = oi.order_id and o.status = 'delivered'
group by p.id, p.name, p.slug;

grant select on public.product_revenue to authenticated;
grant select on public.product_revenue to service_role;

-- 1.9.1 Total revenue view (delivered orders only, excludes shipping)
create or replace view public.total_revenue as
select 
  coalesce(sum(o.subtotal), 0) as total_revenue,
  coalesce(sum(o.total), 0) as grand_total_collected,
  coalesce(count(distinct o.id), 0) as total_orders,
  coalesce(sum(o.shipping_fee), 0) as total_shipping
from public.orders o
where o.status = 'delivered';

grant select on public.total_revenue to authenticated;
grant select on public.total_revenue to service_role;

-- 1.10 Realtime
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.shipping_rates;
alter publication supabase_realtime add table public.orders;

-- 2. Storage bucket (Supabase dashboard → Storage)
-- Create bucket product-images — Public: ON, file size limit 2 MB, allowed MIME image/jpeg, image/png, image/webp, image/avif.

-- Then run in SQL Editor:
create policy "product-images public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product-images admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));

create policy "product-images admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));

create policy "product-images admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));

-- 3. Create the admin user
-- Dashboard → Authentication → Users → Add user → email + password → confirm. Copy the user_id, then:
-- insert into public.user_roles (user_id, role) values ('<paste-user-id>', 'admin');
