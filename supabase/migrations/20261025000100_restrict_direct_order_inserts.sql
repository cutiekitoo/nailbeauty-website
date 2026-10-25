-- Restrict direct client INSERTs on order tables.
-- The storefront checkout must use the validated SECURITY DEFINER create_order(jsonb) RPC.
-- Safe to run on an existing database; does not modify or delete order data.
begin;

do $direct_order_insert_policy_cleanup$
declare
  v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('orders', 'order_items')
      and cmd = 'INSERT'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  end loop;
end;
$direct_order_insert_policy_cleanup$;

-- Remove table-level INSERT rights from public/browser roles.
-- service_role and the SECURITY DEFINER function owner retain their own privileges.
revoke insert on table public.orders, public.order_items
  from public, anon, authenticated;

-- Guest checkout remains available only through the server-side validated RPC.
revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

commit;
