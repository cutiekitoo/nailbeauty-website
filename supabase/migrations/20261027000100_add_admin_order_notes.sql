begin;

alter table public.orders
  add column if not exists internal_note text;

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
  set
    internal_note = nullif(btrim(coalesce(p_internal_note, '')), ''),
  where id = p_order_id
  returning internal_note into v_saved_note;

  if not found then
    raise exception 'Order not found';
  end if;

  return jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'internal_note', v_saved_note
  );
end;
$$;

revoke all on function public.update_order_internal_note(uuid, text) from public;
grant execute on function public.update_order_internal_note(uuid, text) to authenticated;

commit;
