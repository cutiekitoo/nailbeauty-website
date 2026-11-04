begin;

create table if not exists public.ambassador_notifications (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors(id) on delete cascade,
  notification_type text not null check (notification_type in ('gift_milestone','commission_validated','payment_sent')),
  title text not null,
  message text not null,
  source_key text not null unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists ambassador_notifications_owner_date_idx
  on public.ambassador_notifications(ambassador_id, created_at desc);
alter table public.ambassador_notifications enable row level security;
revoke all on public.ambassador_notifications from anon, authenticated;
grant select on public.ambassador_notifications to authenticated;

create or replace function public.notify_ambassador_gift_milestone()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status = 'eligible' and (tg_op = 'INSERT' or old.status is distinct from 'eligible') then
    insert into public.ambassador_notifications(ambassador_id,notification_type,title,message,source_key)
    values(new.ambassador_id,'gift_milestone',
      'Félicitations ! Palier cadeau atteint 🎁',
      'Tu as atteint le palier de ' || new.threshold || ' commandes livrées' ||
        case when nullif(btrim(coalesce(new.gift_name,'')),'') is not null then ' : ' || new.gift_name else '' end || '.',
      'gift:' || new.id::text)
    on conflict(source_key) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists ambassador_gift_milestone_notification on public.ambassador_monthly_rewards;
create trigger ambassador_gift_milestone_notification
  after insert or update of status on public.ambassador_monthly_rewards
  for each row execute function public.notify_ambassador_gift_milestone();

create or replace function public.notify_ambassador_payout()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.ambassador_notifications(ambassador_id,notification_type,title,message,source_key)
  values(new.ambassador_id,'payment_sent','Ton paiement a été effectué 💸',
    'Un règlement de ' || to_char(new.amount,'FM999999990D00') || ' DA a été enregistré pour tes commissions.',
    'payout:' || new.id::text)
  on conflict(source_key) do nothing;
  return new;
end;
$$;
drop trigger if exists ambassador_payout_notification on public.ambassador_payouts;
create trigger ambassador_payout_notification after insert on public.ambassador_payouts
  for each row execute function public.notify_ambassador_payout();

create or replace function public.get_my_ambassador_notifications()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_ambassador_id uuid; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into v_ambassador_id from public.ambassadors
    where user_id=auth.uid() and is_active=true;
  if v_ambassador_id is null then raise exception 'Ambassador profile not found or inactive'; end if;

  -- Notify once when a delivered order's seven-day commission review period expires.
  insert into public.ambassador_notifications(ambassador_id,notification_type,title,message,source_key)
  select c.ambassador_id,'commission_validated','Une nouvelle commission a été validée ✨',
    'Ta commission de ' || to_char(c.amount,'FM999999990D00') || ' DA pour la commande ' || o.order_number || ' est maintenant disponible.',
    'commission:' || c.id::text
  from public.ambassador_commissions c
  join public.orders o on o.id=c.order_id
  where c.ambassador_id=v_ambassador_id and o.status='delivered'
    and c.eligible_at<=now() and c.status in ('pending_review','payable')
  on conflict(source_key) do nothing;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,'notification_type',n.notification_type,'title',n.title,'message',n.message,
    'created_at',n.created_at,'read_at',n.read_at
  ) order by n.created_at desc),'[]'::jsonb)
  into v_result
  from public.ambassador_notifications n where n.ambassador_id=v_ambassador_id;
  return v_result;
end;
$$;
revoke all on function public.get_my_ambassador_notifications() from public;
grant execute on function public.get_my_ambassador_notifications() to authenticated;

create or replace function public.mark_my_ambassador_notifications_read()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_ambassador_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into v_ambassador_id from public.ambassadors
    where user_id=auth.uid() and is_active=true;
  if v_ambassador_id is null then raise exception 'Ambassador profile not found or inactive'; end if;
  update public.ambassador_notifications set read_at=now()
    where ambassador_id=v_ambassador_id and read_at is null;
  return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.mark_my_ambassador_notifications_read() from public;
grant execute on function public.mark_my_ambassador_notifications_read() to authenticated;

commit;
