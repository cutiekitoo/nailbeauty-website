begin;

-- Keep legacy adjustment tables for historical compatibility, but never create
-- new adjustment debt or deduct it from future ambassador payouts.
create or replace function public.sync_ambassador_order_earning()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_period_month date;
begin
  if new.ambassador_id is null then return new; end if;
  if new.status='delivered' and old.status is distinct from 'delivered' then
    insert into public.ambassador_commissions(ambassador_id,order_id,amount,status,earned_at,eligible_at)
    values(new.ambassador_id,new.id,150,'pending_review',coalesce(new.delivered_at,now()),coalesce(new.delivered_at,now())+interval '7 days')
    on conflict(order_id) do nothing;
    v_period_month:=date_trunc('month',coalesce(new.delivered_at,now()) at time zone 'Africa/Algiers')::date;
    perform public.refresh_ambassador_monthly_reward(new.ambassador_id,v_period_month);
  elsif new.status in ('cancelled','returned') and old.status is distinct from new.status then
    update public.ambassador_commissions set status='reversed'
    where order_id=new.id and status<>'reversed';
    if new.delivered_at is not null then
      v_period_month:=date_trunc('month',new.delivered_at at time zone 'Africa/Algiers')::date;
      perform public.refresh_ambassador_monthly_reward(new.ambassador_id,v_period_month);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_ambassador_order_earning() from public;

create or replace function public.get_ambassadors_admin_overview()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  v_result jsonb;
  v_month_start date:=date_trunc('month',timezone('Africa/Algiers',now()))::date;
  v_next_month date:=(date_trunc('month',timezone('Africa/Algiers',now()))+interval '1 month')::date;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'full_name',a.full_name,'email',a.email,'referral_code',a.referral_code,'is_active',a.is_active,
    'payment_method',a.payment_method,'payment_account_name',a.payment_account_name,'payment_identifier',a.payment_identifier,
    'created_at',a.created_at,
    'month_delivered',(select count(*) from public.orders o where o.ambassador_id=a.id and o.status='delivered'
      and o.delivered_at >= (v_month_start::timestamp at time zone 'Africa/Algiers')
      and o.delivered_at < (v_next_month::timestamp at time zone 'Africa/Algiers')),
    'month_pending',(select count(*) from public.orders o where o.ambassador_id=a.id and o.status in('pending','confirmed','shipped')),
    'payable_amount',(select coalesce(sum(c.amount),0) from public.ambassador_commissions c join public.orders o on o.id=c.order_id
      where c.ambassador_id=a.id and o.status='delivered'
      and (c.status='payable' or (c.status='pending_review' and c.eligible_at<=now()))),
    'review_amount',(select coalesce(sum(c.amount),0) from public.ambassador_commissions c join public.orders o on o.id=c.order_id
      where c.ambassador_id=a.id and o.status='delivered' and c.status='pending_review' and c.eligible_at>now()),
    'reversal_balance',0,
    'total_paid',(select coalesce(sum(p.amount),0) from public.ambassador_payouts p where p.ambassador_id=a.id)
  ) order by a.created_at desc),'[]'::jsonb) into v_result from public.ambassadors a;
  return v_result;
end;
$$;
revoke all on function public.get_ambassadors_admin_overview() from public;
grant execute on function public.get_ambassadors_admin_overview() to authenticated;

create or replace function public.record_ambassador_monthly_payout(
  p_ambassador_id uuid,p_period_month date,p_payment_reference text default null,p_note text default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_profile public.ambassadors%rowtype;
  v_period_month date;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_gross numeric(12,2);
  v_payout_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  select * into v_profile from public.ambassadors where id=p_ambassador_id for update;
  if not found then raise exception 'Ambassador not found'; end if;
  v_period_month:=coalesce(p_period_month,date_trunc('month',timezone('Africa/Algiers',now()))::date);
  if v_period_month<>date_trunc('month',v_period_month::timestamp)::date then
    raise exception 'Payout period must be the first day of a calendar month';
  end if;
  v_period_start:=v_period_month::timestamp at time zone 'Africa/Algiers';
  v_period_end:=(v_period_month+interval '1 month')::timestamp at time zone 'Africa/Algiers';

  update public.ambassador_commissions c set status='payable'
  from public.orders o where o.id=c.order_id and o.status='delivered'
    and c.ambassador_id=p_ambassador_id and c.status='pending_review'
    and c.eligible_at<=now() and c.earned_at>=v_period_start and c.earned_at<v_period_end;

  select coalesce(sum(c.amount),0) into v_gross
  from public.ambassador_commissions c join public.orders o on o.id=c.order_id
  where c.ambassador_id=p_ambassador_id and o.status='delivered' and c.status='payable'
    and c.eligible_at<=now() and c.earned_at>=v_period_start and c.earned_at<v_period_end;
  if v_gross<=0 then raise exception 'No payable commissions are available for the selected month'; end if;
  if v_profile.payment_method is null or v_profile.payment_identifier is null then
    raise exception 'The ambassador has not configured CCP or BaridiMob payment details';
  end if;
  if nullif(btrim(coalesce(p_payment_reference,'')),'') is null then
    raise exception 'Payment reference is required for a non-zero payout';
  end if;

  insert into public.ambassador_payouts(
    ambassador_id,period_month,gross_amount,adjustment_amount,amount,payment_method,
    payment_identifier,payment_reference,note,created_by
  ) values(p_ambassador_id,v_period_month,v_gross,0,v_gross,v_profile.payment_method,
    v_profile.payment_identifier,nullif(btrim(coalesce(p_payment_reference,'')), ''),
    nullif(btrim(coalesce(p_note,'')), ''),auth.uid())
  returning id into v_payout_id;

  insert into public.ambassador_payout_commissions(payout_id,commission_id,amount)
  select v_payout_id,c.id,c.amount
  from public.ambassador_commissions c join public.orders o on o.id=c.order_id
  where c.ambassador_id=p_ambassador_id and o.status='delivered' and c.status='payable'
    and c.eligible_at<=now() and c.earned_at>=v_period_start and c.earned_at<v_period_end;

  update public.ambassador_commissions c set status='paid',paid_at=now()
  from public.orders o where o.id=c.order_id and o.status='delivered'
    and c.ambassador_id=p_ambassador_id and c.status='payable'
    and c.eligible_at<=now() and c.earned_at>=v_period_start and c.earned_at<v_period_end;

  return jsonb_build_object('success',true,'payout_id',v_payout_id,'gross_amount',v_gross,
    'adjustment_amount',0,'paid_amount',v_gross,'payment_method',v_profile.payment_method);
end;
$$;
revoke all on function public.record_ambassador_monthly_payout(uuid,date,text,text) from public;
grant execute on function public.record_ambassador_monthly_payout(uuid,date,text,text) to authenticated;

create or replace function public.get_my_ambassador_dashboard()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_a public.ambassadors%rowtype;
  v_month date:=date_trunc('month',timezone('Africa/Algiers',now()))::date;
  v_next date:=(date_trunc('month',timezone('Africa/Algiers',now()))+interval '1 month')::date;
  v_result jsonb;
  v_delivered integer;
  v_pending integer;
  v_review numeric(12,2);
  v_payable numeric(12,2);
  v_paid numeric(12,2);
  v_month_paid numeric(12,2);
  v_month_start timestamptz;
  v_next_start timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_a from public.ambassadors where user_id=auth.uid();
  if not found then raise exception 'Ambassador profile not found'; end if;
  if not v_a.is_active then raise exception 'Ambassador account is suspended'; end if;
  v_month_start:=v_month::timestamp at time zone 'Africa/Algiers';
  v_next_start:=v_next::timestamp at time zone 'Africa/Algiers';

  update public.ambassador_commissions c set status='payable'
  from public.orders o where o.id=c.order_id and o.status='delivered'
    and c.ambassador_id=v_a.id and c.status='pending_review' and c.eligible_at<=now();

  select count(*)::integer into v_delivered from public.orders
    where ambassador_id=v_a.id and status='delivered'
      and delivered_at>=v_month_start and delivered_at<v_next_start;
  select count(*)::integer into v_pending from public.orders
    where ambassador_id=v_a.id and status in('pending','confirmed','shipped');
  select coalesce(sum(c.amount),0) into v_review from public.ambassador_commissions c
    join public.orders o on o.id=c.order_id
    where c.ambassador_id=v_a.id and o.status='delivered' and c.status='pending_review'
      and c.eligible_at>now() and c.earned_at>=v_month_start and c.earned_at<v_next_start;
  select coalesce(sum(c.amount),0) into v_payable from public.ambassador_commissions c
    join public.orders o on o.id=c.order_id
    where c.ambassador_id=v_a.id and o.status='delivered' and c.status='payable'
      and c.eligible_at<=now() and c.earned_at>=v_month_start and c.earned_at<v_next_start;
  select coalesce(sum(amount),0) into v_paid from public.ambassador_payouts where ambassador_id=v_a.id;
  select coalesce(sum(amount),0) into v_month_paid from public.ambassador_payouts
    where ambassador_id=v_a.id and paid_at>=v_month_start and paid_at<v_next_start;

  select jsonb_build_object(
    'profile',jsonb_build_object('id',v_a.id,'full_name',v_a.full_name,'email',v_a.email,
      'referral_code',v_a.referral_code,'is_active',v_a.is_active,'payment_method',v_a.payment_method,
      'payment_account_name',v_a.payment_account_name,'payment_identifier',v_a.payment_identifier),
    'current_month',jsonb_build_object('period_month',v_month,'delivered_count',v_delivered,
      'pending_orders',v_pending,'commission_under_review',v_review,'commission_payable',v_payable,
      'commission_paid',v_month_paid,'reward_threshold',100,'reward_progress',least(100,v_delivered)),
    'all_time',jsonb_build_object(
      'delivered_count',(select count(*) from public.orders where ambassador_id=v_a.id and status='delivered'),
      'commission_paid',v_paid),
    'orders',coalesce((select jsonb_agg(jsonb_build_object(
      'order_number',o.order_number,'created_at',o.created_at,'status',o.status,'delivered_at',o.delivered_at,
      'commission_amount',case when o.status in('cancelled','returned') or c.status='reversed' or c.id is null then 0 else c.amount end,
      'commission_status',case when o.status in('cancelled','returned') then 'reversed'
        when c.id is null then 'pending_delivery' when c.status='pending_review' then 'under_review' else c.status end,
      'commission_eligible_at',c.eligible_at) order by o.created_at desc)
      from public.orders o left join public.ambassador_commissions c on c.order_id=o.id
      where o.ambassador_id=v_a.id),'[]'::jsonb),
    'monthly_history',coalesce((select jsonb_agg(jsonb_build_object(
      'period_month',x.period_month,'delivered_count',x.delivered_count,
      'commission_earned',x.commission_earned,'commission_paid',x.commission_paid) order by x.period_month desc)
      from (select date_trunc('month',o.delivered_at at time zone 'Africa/Algiers')::date as period_month,
        count(*) filter (where o.status='delivered')::integer as delivered_count,
        coalesce(sum(case when o.status='delivered' and c.status<>'reversed' then c.amount else 0 end),0) as commission_earned,
        coalesce(sum(pc.amount),0) as commission_paid
        from public.orders o left join public.ambassador_commissions c on c.order_id=o.id
        left join public.ambassador_payout_commissions pc on pc.commission_id=c.id
        where o.ambassador_id=v_a.id and o.delivered_at is not null
        group by 1) x),'[]'::jsonb),
    'payouts',coalesce((select jsonb_agg(jsonb_build_object(
      'period_month',p.period_month,'gross_amount',p.gross_amount,'adjustment_amount',p.adjustment_amount,
      'amount',p.amount,'payment_method',p.payment_method,'payment_reference',p.payment_reference,'paid_at',p.paid_at)
      order by p.paid_at desc) from public.ambassador_payouts p where p.ambassador_id=v_a.id),'[]'::jsonb),
    'rewards',coalesce((select jsonb_agg(jsonb_build_object(
      'period_month',r.period_month,'delivered_count',r.delivered_count,'threshold',r.threshold,
      'gift_name',r.gift_name,'status',r.status,'given_at',r.given_at)
      order by r.period_month desc) from public.ambassador_monthly_rewards r where r.ambassador_id=v_a.id),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_my_ambassador_dashboard() from public;
grant execute on function public.get_my_ambassador_dashboard() to authenticated;

create or replace function public.update_ambassador_payment_details(
  p_payment_method text,p_payment_account_name text,p_payment_identifier text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_payment_method not in('ccp','baridimob') then raise exception 'Choose CCP or BaridiMob'; end if;
  if nullif(btrim(coalesce(p_payment_account_name,'')),'') is null then raise exception 'Account holder name is required'; end if;
  if nullif(btrim(coalesce(p_payment_identifier,'')),'') is null then raise exception 'CCP account or BaridiMob phone is required'; end if;
  update public.ambassadors set payment_method=p_payment_method,
    payment_account_name=btrim(p_payment_account_name),payment_identifier=btrim(p_payment_identifier)
  where user_id=auth.uid() and is_active=true returning id into v_id;
  if not found then raise exception 'Active ambassador profile not found'; end if;
  return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.update_ambassador_payment_details(text,text,text) from public;
grant execute on function public.update_ambassador_payment_details(text,text,text) to authenticated;

commit;
