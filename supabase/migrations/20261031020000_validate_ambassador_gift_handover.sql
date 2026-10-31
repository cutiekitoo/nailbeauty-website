-- Prevent gift preparation or handover unless the monthly delivered-order threshold is met.
-- A gift already handed over remains historical and cannot be downgraded.
create or replace function public.update_ambassador_reward(
  p_reward_id uuid,
  p_gift_name text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward public.ambassador_monthly_rewards%rowtype;
  v_delivered_count integer;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_status not in ('eligible', 'prepared', 'given', 'cancelled') then
    raise exception 'Invalid reward status';
  end if;

  select *
    into v_reward
  from public.ambassador_monthly_rewards
  where id = p_reward_id
  for update;

  if not found then
    raise exception 'Reward not found';
  end if;

  if v_reward.status = 'given' and p_status <> 'given' then
    raise exception 'A handed-over gift cannot be downgraded';
  end if;

  if p_status in ('eligible', 'prepared', 'given')
     and nullif(btrim(coalesce(p_gift_name, '')), '') is null then
    raise exception 'Gift name is required';
  end if;

  if p_status in ('eligible', 'prepared', 'given') and v_reward.status <> 'given' then
    select count(*)::integer
      into v_delivered_count
    from public.orders o
    where o.ambassador_id = v_reward.ambassador_id
      and o.status = 'delivered'
      and o.delivered_at >= (v_reward.period_month::timestamp at time zone 'Africa/Algiers')
      and o.delivered_at < ((v_reward.period_month + interval '1 month')::timestamp at time zone 'Africa/Algiers');

    if v_delivered_count < v_reward.threshold then
      raise exception 'Gift threshold not reached: % delivered orders required, % currently delivered',
        v_reward.threshold, v_delivered_count;
    end if;
  end if;

  update public.ambassador_monthly_rewards
  set gift_name = case
        when p_status = 'cancelled' then gift_name
        else nullif(btrim(coalesce(p_gift_name, '')), '')
      end,
      delivered_count = coalesce(v_delivered_count, delivered_count),
      status = p_status,
      given_at = case
        when p_status = 'given' then coalesce(given_at, now())
        else null
      end
  where id = p_reward_id;

  return jsonb_build_object('success', true, 'status', p_status);
end;
$$;

revoke all on function public.update_ambassador_reward(uuid, text, text) from public;
grant execute on function public.update_ambassador_reward(uuid, text, text) to authenticated;
