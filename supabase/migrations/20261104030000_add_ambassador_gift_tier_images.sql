begin;

create table if not exists public.ambassador_gift_tier_settings (
  threshold integer primary key check (threshold in (50, 100, 200)),
  gift_name text,
  image_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.ambassador_gift_tier_settings (threshold)
values (50), (100), (200)
on conflict (threshold) do nothing;

alter table public.ambassador_gift_tier_settings enable row level security;
revoke all on public.ambassador_gift_tier_settings from anon, authenticated;

create or replace function public.get_ambassador_gift_tier_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'threshold', threshold,
      'gift_name', gift_name,
      'image_url', image_url
    ) order by threshold)
    from public.ambassador_gift_tier_settings
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_ambassador_gift_tier_settings() from public;
grant execute on function public.get_ambassador_gift_tier_settings() to authenticated;

create or replace function public.update_ambassador_gift_tier_setting(
  p_threshold integer,
  p_gift_name text,
  p_image_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorized';
  end if;

  if p_threshold not in (50, 100, 200) then
    raise exception 'Invalid gift tier';
  end if;

  if length(btrim(coalesce(p_gift_name, ''))) > 120 then
    raise exception 'Gift name must be 120 characters or fewer';
  end if;

  if p_image_url is not null and p_image_url !~ '^https?://' then
    raise exception 'Gift image URL must be an absolute HTTP(S) URL';
  end if;

  update public.ambassador_gift_tier_settings
  set gift_name = nullif(btrim(coalesce(p_gift_name, '')), ''),
      image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
      updated_at = now(),
      updated_by = auth.uid()
  where threshold = p_threshold;

  if not found then
    raise exception 'Gift tier setting not found';
  end if;

  return jsonb_build_object('success', true, 'threshold', p_threshold);
end;
$$;

revoke all on function public.update_ambassador_gift_tier_setting(integer, text, text) from public;
grant execute on function public.update_ambassador_gift_tier_setting(integer, text, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Admins upload ambassador gift tier photos" on storage.objects;
create policy "Admins upload ambassador gift tier photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'ambassador-gifts'
  and public.has_role(auth.uid(), 'admin')
);

commit;
