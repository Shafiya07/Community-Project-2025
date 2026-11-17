create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  profession text not null check (char_length(profession) between 1 and 100),
  skills jsonb not null default '[]'::jsonb check (jsonb_typeof(skills) = 'array'),
  experience integer not null check (experience between 0 and 80),
  service_areas jsonb not null check (jsonb_typeof(service_areas) = 'array' and jsonb_array_length(service_areas) > 0),
  description text not null check (char_length(description) between 1 and 500),
  languages jsonb not null check (jsonb_typeof(languages) = 'array' and jsonb_array_length(languages) > 0),
  working_hours text not null default '' check (char_length(working_hours) <= 100),
  pricing text not null default '' check (char_length(pricing) <= 200),
  photo_path text,
  published_contact boolean not null default false check (published_contact),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists workers_public_created_at_idx
  on public.workers (created_at desc) where status = 'approved';
create index if not exists workers_pending_created_at_idx
  on public.workers (created_at) where status = 'pending';

alter table public.workers enable row level security;
revoke all on public.workers from anon, authenticated;
grant select on public.workers to anon, authenticated;
grant update on public.workers to authenticated;

drop policy if exists "Anyone can read approved workers" on public.workers;
create policy "Anyone can read approved workers"
  on public.workers for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "Admins can read all workers" on public.workers;
create policy "Admins can read all workers"
  on public.workers for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update workers" on public.workers;
create policy "Admins can update workers"
  on public.workers for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  text text not null default '' check (char_length(text) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists reviews_approved_worker_idx
  on public.reviews (worker_id, created_at desc) where status = 'approved';

alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

drop policy if exists "Anyone can read approved reviews" on public.reviews;
create policy "Anyone can read approved reviews"
  on public.reviews for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "Admins can read all reviews" on public.reviews;
create policy "Admins can read all reviews"
  on public.reviews for select to authenticated
  using (public.is_admin());

create table if not exists public.registration_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

alter table public.registration_rate_limits enable row level security;
revoke all on public.registration_rate_limits from anon, authenticated;

create or replace function public.consume_registration_slot(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.registration_rate_limits
  where updated_at < pg_catalog.now() - interval '2 days';

  insert into public.registration_rate_limits (ip_hash, window_started_at, request_count, updated_at)
  values (p_ip_hash, pg_catalog.now(), 1, pg_catalog.now())
  on conflict (ip_hash) do update
  set window_started_at = case
        when public.registration_rate_limits.window_started_at < pg_catalog.now() - interval '1 day'
          then pg_catalog.now()
        else public.registration_rate_limits.window_started_at
      end,
      request_count = case
        when public.registration_rate_limits.window_started_at < pg_catalog.now() - interval '1 day'
          then 1
        else public.registration_rate_limits.request_count + 1
      end,
      updated_at = pg_catalog.now()
  returning request_count into v_count;

  return v_count <= 5;
end;
$$;

revoke all on function public.consume_registration_slot(text) from public, anon, authenticated;
grant execute on function public.consume_registration_slot(text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-photos',
  'worker-photos',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Approved worker photos and admin photos are readable" on storage.objects;
create policy "Approved worker photos and admin photos are readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'worker-photos'
    and (
      public.is_admin()
      or exists (
        select 1 from public.workers
        where workers.photo_path = storage.objects.name
          and workers.status = 'approved'
      )
    )
  );
