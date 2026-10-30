begin;

-- 1. Ambassador accounts and referral attribution.
create table if not exists public.ambassadors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  referral_code text not null,
  is_active boolean not null default true,
  payment_method text check (payment_method in ('ccp','baridimob')),
  payment_account_name text,
  payment_identifier text,
  created_at timestamptz not null default now()
);
create unique index if not exists ambassadors_referral_code_ci_uidx on public.ambassadors(lower(referral_code));
create unique index if not exists ambassadors_email_ci_uidx on public.ambassadors(lower(email));

alter table public.orders add column if not exists ambassador_id uuid references public.ambassadors(id) on delete set null;
create index if not exists orders_ambassador_created_idx on public.orders(ambassador_id,created_at desc);
create index if not exists orders_ambassador_delivered_idx on public.orders(ambassador_id,delivered_at desc) where ambassador_id is not null;

-- 2. Ledger: one commission per delivered order, payout batches and return adjustments.
create table if not exists public.ambassador_commissions (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  amount numeric(12,2) not null default 150 check (amount = 150),
  status text not null default 'pending_review' check (status in ('pending_review','payable','paid','reversed')),
  earned_at timestamptz not null default now(),
  eligible_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ambassador_commission_status_idx on public.ambassador_commissions(ambassador_id,status,eligible_at);

create table if not exists public.ambassador_payouts (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete restrict,
  period_month date not null,
  gross_amount numeric(12,2) not null default 0,
  adjustment_amount numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  payment_method text check (payment_method in ('ccp','baridimob')),
  payment_identifier text,
  payment_reference text,
  note text,
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ambassador_payout_month_idx on public.ambassador_payouts(ambassador_id,period_month desc);

create table if not exists public.ambassador_payout_commissions (
  payout_id uuid not null references public.ambassador_payouts(id) on delete restrict,
  commission_id uuid not null unique references public.ambassador_commissions(id) on delete restrict,
  amount numeric(12,2) not null,
  primary key(payout_id,commission_id)
);
create table if not exists public.ambassador_commission_adjustments (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  amount numeric(12,2) not null default 150 check(amount > 0),
  remaining_amount numeric(12,2) not null default 150 check(remaining_amount >= 0),
  reason text not null default 'Commission already paid before order return',
  created_at timestamptz not null default now()
);
create index if not exists ambassador_adjustment_owner_idx on public.ambassador_commission_adjustments(ambassador_id,created_at);
create table if not exists public.ambassador_payout_adjustments (
  payout_id uuid not null references public.ambassador_payouts(id) on delete restrict,
  adjustment_id uuid not null references public.ambassador_commission_adjustments(id) on delete restrict,
  amount numeric(12,2) not null check(amount > 0),
  primary key(payout_id,adjustment_id)
);

-- 3. Monthly gift at 100 delivered orders in the same calendar month.
create table if not exists public.ambassador_monthly_rewards (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete restrict,
  period_month date not null,
  delivered_count integer not null default 0,
  threshold integer not null default 100,
  gift_name text,
  status text not null default 'eligible' check(status in ('eligible','prepared','given','cancelled')),
  given_at timestamptz,
  created_at timestamptz not null default now(),
  unique(ambassador_id,period_month)
);
create index if not exists ambassador_reward_month_idx on public.ambassador_monthly_rewards(ambassador_id,period_month desc);

-- 4. RLS: ambassadors can read only their own rows. Writes go through checked RPCs.
alter table public.ambassadors enable row level security;
alter table public.ambassador_commissions enable row level security;
alter table public.ambassador_payouts enable row level security;
alter table public.ambassador_payout_commissions enable row level security;
alter table public.ambassador_commission_adjustments enable row level security;
alter table public.ambassador_payout_adjustments enable row level security;
alter table public.ambassador_monthly_rewards enable row level security;
grant select on public.ambassadors,public.ambassador_commissions,public.ambassador_payouts,
  public.ambassador_commission_adjustments,public.ambassador_monthly_rewards to authenticated;

drop policy if exists "ambassadors read own or admin" on public.ambassadors;
create policy "ambassadors read own or admin" on public.ambassadors for select to authenticated
  using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
drop policy if exists "ambassador commissions read own or admin" on public.ambassador_commissions;
create policy "ambassador commissions read own or admin" on public.ambassador_commissions for select to authenticated
  using(public.has_role(auth.uid(),'admin') or exists(
    select 1 from public.ambassadors a where a.id=ambassador_id and a.user_id=auth.uid()
  ));
drop policy if exists "ambassador payouts read own or admin" on public.ambassador_payouts;
create policy "ambassador payouts read own or admin" on public.ambassador_payouts for select to authenticated
  using(public.has_role(auth.uid(),'admin') or exists(
    select 1 from public.ambassadors a where a.id=ambassador_id and a.user_id=auth.uid()
  ));
drop policy if exists "ambassador rewards read own or admin" on public.ambassador_monthly_rewards;
create policy "ambassador rewards read own or admin" on public.ambassador_monthly_rewards for select to authenticated
  using(public.has_role(auth.uid(),'admin') or exists(
    select 1 from public.ambassadors a where a.id=ambassador_id and a.user_id=auth.uid()
  ));

-- 5. Public code validation returns only a boolean; no ambassador profile data is exposed.
create or replace function public.validate_ambassador_code(p_code text)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('valid',exists(
    select 1 from public.ambassadors
    where lower(referral_code)=lower(btrim(coalesce(p_code,''))) and is_active=true
  ));
$$;
revoke all on function public.validate_ambassador_code(text) from public;
grant execute on function public.validate_ambassador_code(text) to anon,authenticated;

-- 6. Recompute gift progress by Algeria local calendar month.
create or replace function public.refresh_ambassador_monthly_reward(p_ambassador_id uuid,p_period_month date)
returns void language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  select count(*)::integer into v_count from public.orders o
  where o.ambassador_id=p_ambassador_id and o.status='delivered'
    and o.delivered_at >= (p_period_month::timestamp at time zone 'Africa/Algiers')
    and o.delivered_at < ((p_period_month + interval '1 month')::timestamp at time zone 'Africa/Algiers');

  if v_count >= 100 then
    insert into public.ambassador_monthly_rewards(ambassador_id,period_month,delivered_count,threshold,status)
    values(p_ambassador_id,p_period_month,v_count,100,'eligible')
    on conflict(ambassador_id,period_month) do update set
      delivered_count=excluded.delivered_count,
      status=case when public.ambassador_monthly_rewards.status in ('prepared','given','cancelled') then public.ambassador_monthly_rewards.status else 'eligible' end;
  elsif exists(select 1 from public.ambassador_monthly_rewards where ambassador_id=p_ambassador_id and period_month=p_period_month) then
    update public.ambassador_monthly_rewards set delivered_count=v_count,
      status=case when status in ('prepared','given','cancelled') then status else 'cancelled' end
    where ambassador_id=p_ambassador_id and period_month=p_period_month;
  end if;
end;
$$;
revoke all on function public.refresh_ambassador_monthly_reward(uuid,date) from public;

-- 7. Server-side order status trigger creates and reverses commissions exactly once.
create or replace function public.sync_ambassador_order_earning()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_commission public.ambassador_commissions%rowtype;
  v_period_month date;
begin
  if new.ambassador_id is null then return new; end if;

  if new.status='delivered' and old.status is distinct from 'delivered' then
    insert into public.ambassador_commissions(ambassador_id,order_id,amount,status,earned_at,eligible_at)
    values(new.ambassador_id,new.id,150,'pending_review',coalesce(new.delivered_at,now()),
      coalesce(new.delivered_at,now())+interval '7 days')
    on conflict(order_id) do nothing;
    v_period_month:=date_trunc('month',coalesce(new.delivered_at,now()) at time zone 'Africa/Algiers')::date;
    perform public.refresh_ambassador_monthly_reward(new.ambassador_id,v_period_month);

  elsif new.status in ('cancelled','returned') and old.status is distinct from new.status then
    select * into v_commission from public.ambassador_commissions where order_id=new.id for update;
    if found then
      if v_commission.status='paid' then
        insert into public.ambassador_commission_adjustments(ambassador_id,order_id,amount,remaining_amount,reason)
        values(v_commission.ambassador_id,new.id,v_commission.amount,v_commission.amount,
          'Commission déjà payée, puis commande annulée ou retournée')
        on conflict(order_id) do nothing;
      end if;
      update public.ambassador_commissions set status='reversed' where id=v_commission.id;
    end if;
    if new.delivered_at is not null then
      v_period_month:=date_trunc('month',new.delivered_at at time zone 'Africa/Algiers')::date;
      perform public.refresh_ambassador_monthly_reward(new.ambassador_id,v_period_month);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_ambassador_order_earning() from public;
drop trigger if exists orders_sync_ambassador_earning on public.orders;
create trigger orders_sync_ambassador_earning after update of status on public.orders
for each row when(old.status is distinct from new.status)
execute function public.sync_ambassador_order_earning();

-- 8. Admin list, admin details and account controls.
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
    'month_pending',(select count(*) from public.orders o where o.ambassador_id=a.id and o.status in('pending','confirmed','shipped','deferred')),
    'payable_amount',(select coalesce(sum(c.amount),0) from public.ambassador_commissions c where c.ambassador_id=a.id and (c.status='payable' or (c.status='pending_review' and c.eligible_at<=now()))),
    'review_amount',(select coalesce(sum(c.amount),0) from public.ambassador_commissions c where c.ambassador_id=a.id and c.status='pending_review' and c.eligible_at>now()),
    'reversal_balance',(select coalesce(sum(ad.remaining_amount),0) from public.ambassador_commission_adjustments ad where ad.ambassador_id=a.id and ad.remaining_amount>0),
    'total_paid',(select coalesce(sum(p.amount),0) from public.ambassador_payouts p where p.ambassador_id=a.id)
  ) order by a.created_at desc),'[]'::jsonb) into v_result from public.ambassadors a;
  return v_result;
end;
$$;
revoke all on function public.get_ambassadors_admin_overview() from public;
grant execute on function public.get_ambassadors_admin_overview() to authenticated;

create or replace function public.get_ambassador_admin_details(p_ambassador_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'profile',jsonb_build_object(
      'id',a.id,'full_name',a.full_name,'email',a.email,'referral_code',a.referral_code,'is_active',a.is_active,
      'payment_method',a.payment_method,'payment_account_name',a.payment_account_name,'payment_identifier',a.payment_identifier,
      'created_at',a.created_at
    ),
    'orders',coalesce((select jsonb_agg(jsonb_build_object(
      'order_number',o.order_number,'created_at',o.created_at,'status',o.status,'delivered_at',o.delivered_at,
      'commission_status',c.status,'commission_amount',case when c.status='reversed' then 0 else c.amount end,
      'commission_eligible_at',c.eligible_at
    ) order by o.created_at desc) from public.orders o
      left join public.ambassador_commissions c on c.order_id=o.id where o.ambassador_id=a.id),'[]'::jsonb),
    'payouts',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'period_month',p.period_month,'gross_amount',p.gross_amount,'adjustment_amount',p.adjustment_amount,
      'amount',p.amount,'payment_method',p.payment_method,'payment_identifier',p.payment_identifier,
      'payment_reference',p.payment_reference,'note',p.note,'paid_at',p.paid_at
    ) order by p.paid_at desc) from public.ambassador_payouts p where p.ambassador_id=a.id),'[]'::jsonb),
    'rewards',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'period_month',r.period_month,'delivered_count',r.delivered_count,
      'threshold',r.threshold,'gift_name',r.gift_name,'status',r.status,'given_at',r.given_at
    ) order by r.period_month desc) from public.ambassador_monthly_rewards r where r.ambassador_id=a.id),'[]'::jsonb),
    'adjustments',coalesce((select jsonb_agg(jsonb_build_object(
      'order_id',ad.order_id,'amount',ad.amount,'remaining_amount',ad.remaining_amount,'reason',ad.reason,'created_at',ad.created_at
    ) order by ad.created_at desc) from public.ambassador_commission_adjustments ad where ad.ambassador_id=a.id),'[]'::jsonb)
  ) into v_result from public.ambassadors a where a.id=p_ambassador_id;
  if v_result is null then raise exception 'Ambassador not found'; end if;
  return v_result;
end;
$$;
revoke all on function public.get_ambassador_admin_details(uuid) from public;
grant execute on function public.get_ambassador_admin_details(uuid) to authenticated;

create or replace function public.set_ambassador_status(p_ambassador_id uuid,p_is_active boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  update public.ambassadors set is_active=p_is_active where id=p_ambassador_id;
  if not found then raise exception 'Ambassador not found'; end if;
  return jsonb_build_object('success',true,'is_active',p_is_active);
end;
$$;
revoke all on function public.set_ambassador_status(uuid,boolean) from public;
grant execute on function public.set_ambassador_status(uuid,boolean) to authenticated;

create or replace function public.set_ambassador_code(p_ambassador_id uuid,p_referral_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_code text:=upper(btrim(coalesce(p_referral_code,'')));
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  if v_code !~ '^[A-Z0-9_-]{3,24}$' then raise exception 'Code must contain 3 to 24 letters, numbers, underscores or hyphens'; end if;
  update public.ambassadors set referral_code=v_code where id=p_ambassador_id;
  if not found then raise exception 'Ambassador not found'; end if;
  return jsonb_build_object('success',true,'referral_code',v_code);
end;
$$;
revoke all on function public.set_ambassador_code(uuid,text) from public;
grant execute on function public.set_ambassador_code(uuid,text) to authenticated;

-- 9. The ambassador updates only her own payment-receiving details.
create or replace function public.update_ambassador_payment_details(p_payment_method text,p_payment_account_name text,p_payment_identifier text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_payment_method not in('ccp','baridimob') then raise exception 'Choose CCP or BaridiMob'; end if;
  if nullif(btrim(coalesce(p_payment_account_name,'')),'') is null then raise exception 'Account holder name is required'; end if;
  if nullif(btrim(coalesce(p_payment_identifier,'')),'') is null then raise exception 'CCP account or BaridiMob phone is required'; end if;
  update public.ambassadors set payment_method=p_payment_method,
    payment_account_name=btrim(p_payment_account_name),payment_identifier=btrim(p_payment_identifier)
  where user_id=auth.uid() returning id into v_id;
  if not found then raise exception 'Ambassador profile not found'; end if;
  return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.update_ambassador_payment_details(text,text,text) from public;
grant execute on function public.update_ambassador_payment_details(text,text,text) to authenticated;

-- 10. Monthly payout: commissions older than seven days are settled; post-payment returns offset later payouts.
create or replace function public.record_ambassador_monthly_payout(
  p_ambassador_id uuid,p_period_month date,p_payment_reference text default null,p_note text default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_profile public.ambassadors%rowtype;
  v_gross numeric(12,2);
  v_adjustment_total numeric(12,2);
  v_adjustment_used numeric(12,2);
  v_net numeric(12,2);
  v_payout_id uuid;
  v_adjustment record;
  v_to_apply numeric(12,2);
  v_left numeric(12,2);
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  select * into v_profile from public.ambassadors where id=p_ambassador_id for update;
  if not found then raise exception 'Ambassador not found'; end if;
  if v_profile.payment_method is null or v_profile.payment_identifier is null then
    raise exception 'The ambassador has not configured CCP or BaridiMob payment details';
  end if;
  update public.ambassador_commissions set status='payable'
    where ambassador_id=p_ambassador_id and status='pending_review' and eligible_at<=now();
  select coalesce(sum(amount),0) into v_gross from public.ambassador_commissions
    where ambassador_id=p_ambassador_id and status='payable';
  if v_gross<=0 then raise exception 'No payable commissions are available'; end if;
  select coalesce(sum(remaining_amount),0) into v_adjustment_total
    from public.ambassador_commission_adjustments where ambassador_id=p_ambassador_id and remaining_amount>0;
  v_adjustment_used:=least(v_gross,v_adjustment_total);
  v_net:=v_gross-v_adjustment_used;
  if v_net>0 and nullif(btrim(coalesce(p_payment_reference,'')),'') is null then
    raise exception 'Payment reference is required for a non-zero payout';
  end if;
  insert into public.ambassador_payouts(
    ambassador_id,period_month,gross_amount,adjustment_amount,amount,payment_method,
    payment_identifier,payment_reference,note,created_by
  ) values(
    p_ambassador_id,
    coalesce(p_period_month,date_trunc('month',timezone('Africa/Algiers',now()))::date),
    v_gross,v_adjustment_used,v_net,
    case when v_net>0 then v_profile.payment_method else null end,
    case when v_net>0 then v_profile.payment_identifier else null end,
    nullif(btrim(coalesce(p_payment_reference,'')),''),
    nullif(btrim(coalesce(p_note,'')),''),
    auth.uid()
  ) returning id into v_payout_id;
  insert into public.ambassador_payout_commissions(payout_id,commission_id,amount)
    select v_payout_id,id,amount from public.ambassador_commissions
    where ambassador_id=p_ambassador_id and status='payable';
  update public.ambassador_commissions set status='paid',paid_at=now()
    where ambassador_id=p_ambassador_id and status='payable';
  v_left:=v_adjustment_used;
  for v_adjustment in select id,remaining_amount from public.ambassador_commission_adjustments
    where ambassador_id=p_ambassador_id and remaining_amount>0 order by created_at,id for update
  loop
    exit when v_left<=0;
    v_to_apply:=least(v_left,v_adjustment.remaining_amount);
    insert into public.ambassador_payout_adjustments(payout_id,adjustment_id,amount)
      values(v_payout_id,v_adjustment.id,v_to_apply);
    update public.ambassador_commission_adjustments
      set remaining_amount=remaining_amount-v_to_apply where id=v_adjustment.id;
    v_left:=v_left-v_to_apply;
  end loop;
  return jsonb_build_object('success',true,'payout_id',v_payout_id,'gross_amount',v_gross,
    'adjustment_amount',v_adjustment_used,'paid_amount',v_net,
    'payment_method',case when v_net>0 then v_profile.payment_method else null end);
end;
$$;
revoke all on function public.record_ambassador_monthly_payout(uuid,date,text,text) from public;
grant execute on function public.record_ambassador_monthly_payout(uuid,date,text,text) to authenticated;

-- 11. Admin records the gift name and marks it prepared or handed over.
create or replace function public.update_ambassador_reward(p_reward_id uuid,p_gift_name text,p_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Not authorized'; end if;
  if p_status not in('eligible','prepared','given','cancelled') then raise exception 'Invalid reward status'; end if;
  if p_status in('eligible','prepared','given') and nullif(btrim(coalesce(p_gift_name,'')),'') is null then
    raise exception 'Gift name is required';
  end if;
  update public.ambassador_monthly_rewards set gift_name=nullif(btrim(coalesce(p_gift_name,'')),''),
    status=p_status,given_at=case when p_status='given' then coalesce(given_at,now()) else null end
    where id=p_reward_id;
  if not found then raise exception 'Reward not found'; end if;
  return jsonb_build_object('success',true,'status',p_status);
end;
$$;
revoke all on function public.update_ambassador_reward(uuid,text,text) from public;
grant execute on function public.update_ambassador_reward(uuid,text,text) to authenticated;

-- 12. The ambassador dashboard response contains order reference/status only: no customer data or order totals.
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
  v_adjustment numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_a from public.ambassadors where user_id=auth.uid();
  if not found then raise exception 'Ambassador profile not found'; end if;
  if not v_a.is_active then raise exception 'Ambassador account is suspended'; end if;

  update public.ambassador_commissions set status='payable'
    where ambassador_id=v_a.id and status='pending_review' and eligible_at<=now();
  select count(*)::integer into v_delivered from public.orders
    where ambassador_id=v_a.id and status='delivered'
      and delivered_at >= (v_month::timestamp at time zone 'Africa/Algiers')
      and delivered_at < (v_next::timestamp at time zone 'Africa/Algiers');
  select count(*)::integer into v_pending from public.orders
    where ambassador_id=v_a.id and status in('pending','confirmed','shipped','deferred');
  select coalesce(sum(amount),0) into v_review from public.ambassador_commissions
    where ambassador_id=v_a.id and status='pending_review';
  select coalesce(sum(amount),0) into v_payable from public.ambassador_commissions
    where ambassador_id=v_a.id and status='payable';
  select coalesce(sum(amount),0) into v_paid from public.ambassador_payouts where ambassador_id=v_a.id;
  select coalesce(sum(amount),0) into v_month_paid
    from public.ambassador_payouts
    where ambassador_id=v_a.id
      and paid_at >= (v_month::timestamp at time zone 'Africa/Algiers')
      and paid_at < (v_next::timestamp at time zone 'Africa/Algiers');
  select coalesce(sum(remaining_amount),0) into v_adjustment from public.ambassador_commission_adjustments
    where ambassador_id=v_a.id and remaining_amount>0;

  select jsonb_build_object(
    'profile',jsonb_build_object(
      'id',v_a.id,'full_name',v_a.full_name,'email',v_a.email,'referral_code',v_a.referral_code,
      'is_active',v_a.is_active,'payment_method',v_a.payment_method,
      'payment_account_name',v_a.payment_account_name,'payment_identifier',v_a.payment_identifier
    ),
    'current_month',jsonb_build_object(
      'period_month',v_month,'delivered_count',v_delivered,'pending_orders',v_pending,
      'commission_under_review',v_review,'commission_payable',greatest(0,v_payable-v_adjustment),
      'commission_paid',v_month_paid,'reward_threshold',100,'reward_progress',least(100,v_delivered)
    ),
    'all_time',jsonb_build_object(
      'delivered_count',(select count(*) from public.orders where ambassador_id=v_a.id and status='delivered'),
      'commission_paid',v_paid
    ),
    'orders',coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_number',o.order_number,'created_at',o.created_at,'status',o.status,'delivered_at',o.delivered_at,
        'commission_amount',case when c.status='reversed' or c.id is null then 0 else c.amount end,
        'commission_status',case
          when o.status in('cancelled','returned') then 'reversed'
          when c.id is null then 'pending_delivery'
          when c.status='pending_review' then 'under_review'
          else c.status end,
        'commission_eligible_at',c.eligible_at
      ) order by o.created_at desc)
      from public.orders o left join public.ambassador_commissions c on c.order_id=o.id
      where o.ambassador_id=v_a.id
    ),'[]'::jsonb),
    'monthly_history',coalesce((
      select jsonb_agg(jsonb_build_object(
        'period_month',x.period_month,'delivered_count',x.delivered_count,
        'commission_earned',x.commission_earned,'commission_paid',x.commission_paid
      ) order by x.period_month desc)
      from (
        select date_trunc('month',o.delivered_at at time zone 'Africa/Algiers')::date as period_month,
          count(*)::integer as delivered_count,
          coalesce(sum(case when c.status<>'reversed' then c.amount else 0 end),0) as commission_earned,
          coalesce(sum(case when c.status='paid' then c.amount else 0 end),0) as commission_paid
        from public.orders o left join public.ambassador_commissions c on c.order_id=o.id
        where o.ambassador_id=v_a.id and o.delivered_at is not null and o.status='delivered'
        group by 1
      ) x
    ),'[]'::jsonb),
    'payouts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'period_month',p.period_month,'gross_amount',p.gross_amount,'adjustment_amount',p.adjustment_amount,
        'amount',p.amount,'payment_method',p.payment_method,'payment_reference',p.payment_reference,'paid_at',p.paid_at
      ) order by p.paid_at desc)
      from public.ambassador_payouts p where p.ambassador_id=v_a.id
    ),'[]'::jsonb),
    'rewards',coalesce((
      select jsonb_agg(jsonb_build_object(
        'period_month',r.period_month,'delivered_count',r.delivered_count,'threshold',r.threshold,
        'gift_name',r.gift_name,'status',r.status,'given_at',r.given_at
      ) order by r.period_month desc)
      from public.ambassador_monthly_rewards r where r.ambassador_id=v_a.id
    ),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_my_ambassador_dashboard() from public;
grant execute on function public.get_my_ambassador_dashboard() to authenticated;

-- 13. Checkout stores the referral ID inside the same transaction as order and stock reservation.
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
  v_ambassador_code text;
  v_ambassador_id uuid;
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
  v_ambassador_code := nullif(upper(btrim(payload->>'ambassadorCode')), '');
  if v_ambassador_code is not null then
    select id into v_ambassador_id
    from public.ambassadors
    where upper(referral_code) = v_ambassador_code and is_active = true;
    if not found then raise exception 'Ambassador code is invalid or inactive'; end if;
  end if;

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
        total, payment_method, status, notes, ambassador_id
      ) values (
        v_order_number, v_customer_name, v_customer_phone, v_wilaya_code,
        coalesce(v_wilaya_name, v_wilaya_code), v_delivery_method, v_address,
        v_office_location, v_subtotal, v_shipping_fee, v_total, v_payment_method,
        'pending', v_notes, v_ambassador_id
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
grant execute on function public.create_order(jsonb) to anon,authenticated;

commit;