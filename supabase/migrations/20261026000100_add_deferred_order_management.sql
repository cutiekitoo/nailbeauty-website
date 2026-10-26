-- Add deferred-order scheduling and internal notes.
-- Run only after 20261026000000_add_deferred_order_status.sql has succeeded.
begin;

alter table public.orders
  add column if not exists deferred_until date,
  add column if not exists deferred_note text;

create index if not exists idx_orders_deferred_until
  on public.orders (deferred_until)
  where status = 'deferred';

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
      and new_status in ('shipped', 'cancelled', 'deferred') then true
    when current_status = 'deferred'
      and new_status in ('confirmed', 'cancelled') then true
    when current_status = 'shipped'
      and new_status in ('delivered', 'returned', 'cancelled') then true
    when current_status = 'delivered'
      and new_status = 'returned' then true
    when current_status = 'cancelled'
      and new_status = 'pending' then true
    else false
  end;
$validator$;

create or replace function public.defer_order(
  p_order_id uuid,
  p_deferred_until date,
  p_deferred_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $defer$
declare
  v_current_status public.order_status;
  v_note text := nullif(btrim(p_deferred_note), '');
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized to defer orders';
  end if;

  if v_note is null then
    raise exception 'A note is required when deferring an order';
  end if;

  if p_deferred_until is not null and p_deferred_until < current_date then
    raise exception 'The deferred date cannot be in the past';
  end if;

  select status into v_current_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_current_status not in ('confirmed', 'deferred') then
    raise exception 'Only confirmed orders can be deferred';
  end if;

  update public.orders
  set status = 'deferred',
      deferred_until = p_deferred_until,
      deferred_note = v_note
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'deferred',
    'deferred_until', p_deferred_until,
    'deferred_note', v_note
  );
end;
$defer$;

revoke all on function public.defer_order(uuid, date, text) from public;
grant execute on function public.defer_order(uuid, date, text) to authenticated;

commit;
