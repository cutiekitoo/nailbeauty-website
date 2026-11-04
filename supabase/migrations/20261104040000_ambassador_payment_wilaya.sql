begin;
alter table public.ambassadors add column if not exists wilaya text;

create or replace function public.update_ambassador_payment_profile(
  p_payment_method text, p_payment_account_name text, p_payment_identifier text, p_wilaya text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_payment_method not in ('ccp','baridimob') then raise exception 'Choose CCP or BaridiMob'; end if;
  if nullif(btrim(coalesce(p_payment_account_name,'')),'') is null then raise exception 'Full name is required'; end if;
  if nullif(btrim(coalesce(p_payment_identifier,'')),'') is null then raise exception 'Payment details are required'; end if;
  if nullif(btrim(coalesce(p_wilaya,'')),'') is null then raise exception 'Wilaya is required'; end if;
  update public.ambassadors set payment_method=p_payment_method,
    payment_account_name=btrim(p_payment_account_name), payment_identifier=btrim(p_payment_identifier),
    wilaya=btrim(p_wilaya)
  where user_id=auth.uid() returning id into v_id;
  if not found then raise exception 'Ambassador profile not found'; end if;
  return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.update_ambassador_payment_profile(text,text,text,text) from public;
grant execute on function public.update_ambassador_payment_profile(text,text,text,text) to authenticated;

create or replace function public.get_my_ambassador_payment_profile()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select jsonb_build_object('wilaya',wilaya) into v_result
  from public.ambassadors where user_id=auth.uid() and is_active=true;
  if v_result is null then raise exception 'Ambassador profile not found or inactive'; end if;
  return v_result;
end;
$$;
revoke all on function public.get_my_ambassador_payment_profile() from public;
grant execute on function public.get_my_ambassador_payment_profile() to authenticated;

create or replace function public.get_ambassador_payment_profile_admin(p_ambassador_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  select jsonb_build_object('payment_account_name',payment_account_name,'payment_method',payment_method,
    'payment_identifier',payment_identifier,'wilaya',wilaya) into v_result
  from public.ambassadors where id=p_ambassador_id;
  if v_result is null then raise exception 'Ambassador not found'; end if;
  return v_result;
end;
$$;
revoke all on function public.get_ambassador_payment_profile_admin(uuid) from public;
grant execute on function public.get_ambassador_payment_profile_admin(uuid) to authenticated;
commit;
