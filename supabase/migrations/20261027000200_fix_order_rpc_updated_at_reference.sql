begin;

-- The live orders table does not have an updated_at column.
-- Replace both RPCs so they only write columns present in the orders table.

create or replace function public.update_order_internal_note(
  p_order_id uuid,
  p_internal_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saved_note text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized to update internal order note';
  end if;

  if p_internal_note is not null and length(p_internal_note) > 2000 then
    raise exception 'Internal note cannot exceed 2000 characters';
  end if;

  update public.orders
  set internal_note = nullif(btrim(coalesce(p_internal_note, '')), '')
  where id = p_order_id
  returning internal_note into v_saved_note;

  if not found then
    raise exception 'Order not found';
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id, 'internal_note', v_saved_note);
end;
$$;

revoke all on function public.update_order_internal_note(uuid, text) from public;
grant execute on function public.update_order_internal_note(uuid, text) to authenticated;

create or replace function public.update_order_delivery(
  p_order_id uuid,
  p_delivery_method text,
  p_address text,
  p_office_location text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_wilaya_code text;
  v_subtotal numeric;
  v_shipping_fee numeric;
  v_total numeric;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized to update order delivery';
  end if;

  if p_delivery_method not in ('home', 'office') then
    raise exception 'Invalid delivery method';
  end if;

  if p_delivery_method = 'home' and nullif(btrim(coalesce(p_address, '')), '') is null then
    raise exception 'A home delivery address is required';
  end if;

  if p_delivery_method = 'office' and nullif(btrim(coalesce(p_office_location, '')), '') is null then
    raise exception 'A DHD office location is required';
  end if;

  select status, wilaya_code, subtotal
    into v_status, v_wilaya_code, v_subtotal
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_status not in ('pending', 'confirmed', 'deferred') then
    raise exception 'Delivery method can only be changed before dispatch';
  end if;

  select case p_delivery_method
    when 'home' then sr.home_rate
    when 'office' then sr.office_rate
  end
    into v_shipping_fee
  from public.shipping_rates sr
  where sr.code = v_wilaya_code;

  if not found or v_shipping_fee is null then
    raise exception 'Shipping rate not found for wilaya code: %', v_wilaya_code;
  end if;

  v_total := v_subtotal + v_shipping_fee;

  update public.orders
  set
    delivery_method = p_delivery_method,
    address = case when p_delivery_method = 'home' then btrim(p_address) else null end,
    office_location = case when p_delivery_method = 'office' then btrim(p_office_location) else null end,
    shipping_fee = v_shipping_fee,
    total = v_total
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'delivery_method', p_delivery_method,
    'shipping_fee', v_shipping_fee,
    'total', v_total
  );
end;
$$;

revoke all on function public.update_order_delivery(uuid, text, text, text) from public;
grant execute on function public.update_order_delivery(uuid, text, text, text) to authenticated;

commit;
