begin;

-- Three fixed monthly gift milestones: 50, 100 and 200 delivered orders.
-- Keep existing reward rows (including the 100-order history) and make each
-- milestone independently unique for an ambassador and calendar month.
alter table public.ambassador_monthly_rewards
  drop constraint if exists ambassador_monthly_rewards_ambassador_id_period_month_key;

alter table public.ambassador_monthly_rewards
  drop constraint if exists ambassador_monthly_rewards_threshold_check;

alter table public.ambassador_monthly_rewards
  add constraint ambassador_monthly_rewards_threshold_check
  check (threshold in (50, 100, 200));

create unique index if not exists ambassador_monthly_rewards_month_tier_uidx
  on public.ambassador_monthly_rewards(ambassador_id, period_month, threshold);

create or replace function public.refresh_ambassador_monthly_reward(
  p_ambassador_id uuid,
  p_period_month date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_threshold integer;
begin
  select count(*)::integer
    into v_count
  from public.orders o
  where o.ambassador_id = p_ambassador_id
    and o.status = 'delivered'
    and o.delivered_at >= (p_period_month::timestamp at time zone 'Africa/Algiers')
    and o.delivered_at < ((p_period_month + interval '1 month')::timestamp at time zone 'Africa/Algiers');

  foreach v_threshold in array array[50, 100, 200]
  loop
    if v_count >= v_threshold then
      insert into public.ambassador_monthly_rewards(
        ambassador_id, period_month, delivered_count, threshold, status
      )
      values (p_ambassador_id, p_period_month, v_count, v_threshold, 'eligible')
      on conflict (ambassador_id, period_month, threshold) do update
      set delivered_count = excluded.delivered_count,
          status = case
            when public.ambassador_monthly_rewards.status in ('given', 'prepared')
              then public.ambassador_monthly_rewards.status
            else 'eligible'
          end;
    else
      update public.ambassador_monthly_rewards
      set delivered_count = v_count,
          status = case
            when status = 'given' then status
            else 'cancelled'
          end
      where ambassador_id = p_ambassador_id
        and period_month = p_period_month
        and threshold = v_threshold;
    end if;
  end loop;
end;
$$;
revoke all on function public.refresh_ambassador_monthly_reward(uuid, date) from public;

-- The ambassador sees the three milestone records and progress toward the final
-- 200-order tier. Commissions, payouts and order creation remain unchanged.
create or replace function public.get_my_ambassador_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.ambassadors%rowtype;
  v_month date := date_trunc('month', timezone('Africa/Algiers', now()))::date;
  v_next date := (date_trunc('month', timezone('Africa/Algiers', now())) + interval '1 month')::date;
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
  select * into v_a from public.ambassadors where user_id = auth.uid();
  if not found then raise exception 'Ambassador profile not found'; end if;
  if not v_a.is_active then raise exception 'Ambassador account is suspended'; end if;

  v_month_start := v_month::timestamp at time zone 'Africa/Algiers';
  v_next_start := v_next::timestamp at time zone 'Africa/Algiers';

  update public.ambassador_commissions c
  set status = 'payable'
  from public.orders o
  where o.id = c.order_id and o.status = 'delivered'
    and c.ambassador_id = v_a.id and c.status = 'pending_review'
    and c.eligible_at <= now();

  select count(*)::integer into v_delivered
  from public.orders
  where ambassador_id = v_a.id and status = 'delivered'
    and delivered_at >= v_month_start and delivered_at < v_next_start;

  select count(*)::integer into v_pending
  from public.orders
  where ambassador_id = v_a.id and status in ('pending', 'confirmed', 'shipped');

  select coalesce(sum(c.amount), 0) into v_review
  from public.ambassador_commissions c
  join public.orders o on o.id = c.order_id
  where c.ambassador_id = v_a.id and o.status = 'delivered'
    and c.status = 'pending_review' and c.eligible_at > now()
    and c.earned_at >= v_month_start and c.earned_at < v_next_start;

  select coalesce(sum(c.amount), 0) into v_payable
  from public.ambassador_commissions c
  join public.orders o on o.id = c.order_id
  where c.ambassador_id = v_a.id and o.status = 'delivered'
    and c.status = 'payable' and c.eligible_at <= now()
    and c.earned_at >= v_month_start and c.earned_at < v_next_start;

  select coalesce(sum(amount), 0) into v_paid
  from public.ambassador_payouts where ambassador_id = v_a.id;

  select coalesce(sum(amount), 0) into v_month_paid
  from public.ambassador_payouts
  where ambassador_id = v_a.id and paid_at >= v_month_start and paid_at < v_next_start;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_a.id, 'full_name', v_a.full_name, 'email', v_a.email,
      'referral_code', v_a.referral_code, 'is_active', v_a.is_active,
      'payment_method', v_a.payment_method, 'payment_account_name', v_a.payment_account_name,
      'payment_identifier', v_a.payment_identifier
    ),
    'current_month', jsonb_build_object(
      'period_month', v_month, 'delivered_count', v_delivered,
      'pending_orders', v_pending, 'commission_under_review', v_review,
      'commission_payable', v_payable, 'commission_paid', v_month_paid,
      'reward_threshold', 200, 'reward_progress', least(200, v_delivered)
    ),
    'all_time', jsonb_build_object(
      'delivered_count', (select count(*) from public.orders where ambassador_id = v_a.id and status = 'delivered'),
      'commission_paid', v_paid
    ),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_number', o.order_number, 'created_at', o.created_at,
        'status', o.status, 'delivered_at', o.delivered_at,
        'commission_amount', case
          when o.status in ('cancelled', 'returned') or c.status = 'reversed' or c.id is null then 0
          else c.amount end,
        'commission_status', case
          when o.status in ('cancelled', 'returned') then 'reversed'
          when c.id is null then 'pending_delivery'
          when c.status = 'pending_review' then 'under_review'
          else c.status end,
        'commission_eligible_at', c.eligible_at
      ) order by o.created_at desc)
      from public.orders o
      left join public.ambassador_commissions c on c.order_id = o.id
      where o.ambassador_id = v_a.id
    ), '[]'::jsonb),
    'monthly_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'period_month', x.period_month, 'delivered_count', x.delivered_count,
        'commission_earned', x.commission_earned, 'commission_paid', x.commission_paid
      ) order by x.period_month desc)
      from (
        select date_trunc('month', o.delivered_at at time zone 'Africa/Algiers')::date as period_month,
          count(*) filter (where o.status = 'delivered')::integer as delivered_count,
          coalesce(sum(case when o.status = 'delivered' and c.status <> 'reversed' then c.amount else 0 end), 0) as commission_earned,
          coalesce(sum(pc.amount), 0) as commission_paid
        from public.orders o
        left join public.ambassador_commissions c on c.order_id = o.id
        left join public.ambassador_payout_commissions pc on pc.commission_id = c.id
        where o.ambassador_id = v_a.id and o.delivered_at is not null
        group by 1
      ) x
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'period_month', p.period_month, 'gross_amount', p.gross_amount,
        'adjustment_amount', p.adjustment_amount, 'amount', p.amount,
        'payment_method', p.payment_method, 'payment_reference', p.payment_reference,
        'paid_at', p.paid_at
      ) order by p.paid_at desc)
      from public.ambassador_payouts p where p.ambassador_id = v_a.id
    ), '[]'::jsonb),
    'rewards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'period_month', r.period_month, 'delivered_count', r.delivered_count,
        'threshold', r.threshold, 'gift_name', r.gift_name,
        'status', r.status, 'given_at', r.given_at
      ) order by r.period_month desc, r.threshold asc)
      from public.ambassador_monthly_rewards r where r.ambassador_id = v_a.id
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_my_ambassador_dashboard() from public;
grant execute on function public.get_my_ambassador_dashboard() to authenticated;

commit;
