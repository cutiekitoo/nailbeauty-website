-- Remove direct/public table access to private order records.
-- Guest checkout and confirmation remain available only through scoped SECURITY DEFINER RPCs.
begin;

revoke all privileges on table public.orders, public.order_items from public;
revoke all privileges on table public.orders, public.order_items from anon;

-- Remove any SELECT/ALL RLS policy that explicitly exposes these tables to anon or PUBLIC.
-- Preserve policies granted only to authenticated (for the admin interface).
do $public_order_read_policy_cleanup$
declare
  v_policy record;
begin
  for v_policy in
    select p.schemaname, p.tablename, p.policyname
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('orders', 'order_items')
      and p.cmd in ('SELECT', 'ALL')
      and exists (
        select 1
        from unnest(p.roles) as role_name
        where role_name::text in ('anon', 'public')
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      v_policy.policyname, v_policy.schemaname, v_policy.tablename
    );
  end loop;
end;
$public_order_read_policy_cleanup$;

-- Keep public checkout and order-specific confirmation through their validated RPCs.
revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;
revoke all on function public.get_order_confirmation(uuid) from public;
grant execute on function public.get_order_confirmation(uuid) to anon, authenticated;

-- Fail atomically if anonymous table SELECT remains or the scoped RPCs are unavailable.
do $assert_order_privacy$
begin
  if has_table_privilege('anon', 'public.orders', 'SELECT')
     or has_table_privilege('anon', 'public.order_items', 'SELECT') then
    raise exception 'Anonymous SELECT privilege still exists on orders/order_items. Check inherited or column privileges.';
  end if;

  if exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('orders', 'order_items')
      and p.cmd in ('SELECT', 'ALL')
      and exists (
        select 1
        from unnest(p.roles) as role_name
        where role_name::text in ('anon', 'public')
      )
  ) then
    raise exception 'Public-facing SELECT policy remains on orders/order_items.';
  end if;

  if not has_function_privilege('anon', 'public.create_order(jsonb)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.get_order_confirmation(uuid)', 'EXECUTE') then
    raise exception 'Anonymous checkout/confirmation RPC permissions were not preserved.';
  end if;
end;
$assert_order_privacy$;

commit;
