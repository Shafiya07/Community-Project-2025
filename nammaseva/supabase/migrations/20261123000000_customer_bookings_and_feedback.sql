-- Customer accounts, bookable work requests, and reviews tied to completed jobs.
create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  phone text not null default '' check (phone = '' or phone ~ '^[6-9][0-9]{9}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;
revoke all on public.customer_profiles from anon, authenticated;
grant select, insert, update on public.customer_profiles to authenticated;
drop policy if exists "Customers can read own profile" on public.customer_profiles;
create policy "Customers can read own profile" on public.customer_profiles
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Customers can create own profile" on public.customer_profiles;
create policy "Customers can create own profile" on public.customer_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Customers can update own profile" on public.customer_profiles;
create policy "Customers can update own profile" on public.customer_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  worker_id uuid references public.workers (id) on delete set null,
  worker_name text not null,
  worker_profession text not null,
  customer_name text not null,
  customer_phone text not null check (customer_phone ~ '^[6-9][0-9]{9}$'),
  service text not null check (char_length(service) between 1 and 100),
  customer_note text not null default '' check (char_length(customer_note) <= 1000),
  preferred_date date,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_created_idx on public.bookings (customer_id, created_at desc);
create index if not exists bookings_worker_created_idx on public.bookings (worker_id, created_at desc);
alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;
grant select, insert, update on public.bookings to authenticated;
drop policy if exists "Customers can read own bookings" on public.bookings;
create policy "Customers can read own bookings" on public.bookings
  for select to authenticated using (customer_id = (select auth.uid()));
drop policy if exists "Customers can create bookings for published workers" on public.bookings;
create policy "Customers can create bookings for published workers" on public.bookings
  for insert to authenticated with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.workers
      where workers.id = worker_id and workers.status = 'approved'
        and workers.name = worker_name and workers.profession = worker_profession and workers.profession = service
    )
    and exists (
      select 1 from public.customer_profiles
      where customer_profiles.user_id = (select auth.uid())
        and customer_profiles.full_name = customer_name and customer_profiles.phone = customer_phone
    )
  );
drop policy if exists "Workers can read received bookings" on public.bookings;
create policy "Workers can read received bookings" on public.bookings
  for select to authenticated using (
    exists (select 1 from public.workers where workers.id = worker_id and workers.user_id = (select auth.uid()))
  );
drop policy if exists "Workers can update received booking status" on public.bookings;
create policy "Workers can update received booking status" on public.bookings
  for update to authenticated using (
    exists (select 1 from public.workers where workers.id = worker_id and workers.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.workers where workers.id = worker_id and workers.user_id = (select auth.uid()))
  );

create or replace function public.protect_booking_updates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id is distinct from old.id
    or new.customer_id is distinct from old.customer_id
    or new.worker_id is distinct from old.worker_id
    or new.worker_name is distinct from old.worker_name
    or new.worker_profession is distinct from old.worker_profession
    or new.customer_name is distinct from old.customer_name
    or new.customer_phone is distinct from old.customer_phone
    or new.service is distinct from old.service
    or new.customer_note is distinct from old.customer_note
    or new.preferred_date is distinct from old.preferred_date
    or new.created_at is distinct from old.created_at then
    raise exception 'Booking details cannot be changed after submission.';
  end if;
  if not (
    (old.status = 'pending' and new.status in ('accepted', 'cancelled'))
    or (old.status = 'accepted' and new.status in ('in_progress', 'cancelled'))
    or (old.status = 'in_progress' and new.status = 'completed')
  ) then
    raise exception 'This booking status change is not allowed.';
  end if;
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
drop trigger if exists protect_booking_updates on public.bookings;
create trigger protect_booking_updates before update on public.bookings
  for each row execute function public.protect_booking_updates();

alter table public.reviews
  add column if not exists booking_id uuid unique references public.bookings (id) on delete set null,
  add column if not exists customer_id uuid references auth.users (id) on delete set null,
  add column if not exists customer_name text not null default 'Customer';

create or replace function public.submit_booking_review(p_booking_id uuid, p_rating smallint, p_text text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_booking public.bookings%rowtype;
  v_name text;
  v_review_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to leave feedback.'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Choose a rating from 1 to 5.'; end if;
  if char_length(coalesce(p_text, '')) > 1000 then raise exception 'Feedback must be 1000 characters or fewer.'; end if;
  select * into v_booking from public.bookings
    where id = p_booking_id and customer_id = (select auth.uid());
  if not found then raise exception 'Booking not found.'; end if;
  if v_booking.status <> 'completed' then raise exception 'Feedback is available after the work is marked complete.'; end if;
  if v_booking.worker_id is null then raise exception 'This worker profile is no longer available.'; end if;
  select coalesce(nullif(full_name, ''), v_booking.customer_name) into v_name
    from public.customer_profiles where user_id = (select auth.uid());
  insert into public.reviews (worker_id, rating, text, status, booking_id, customer_id, customer_name)
    values (v_booking.worker_id, p_rating, coalesce(p_text, ''), 'approved', p_booking_id,
      (select auth.uid()), coalesce(v_name, v_booking.customer_name))
    returning id into v_review_id;
  return v_review_id;
end;
$$;
revoke all on function public.submit_booking_review(uuid, smallint, text) from public, anon;
grant execute on function public.submit_booking_review(uuid, smallint, text) to authenticated;

create or replace function public.get_worker_completed_booking_count(p_worker_id uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.bookings where worker_id = p_worker_id and status = 'completed';
$$;
revoke all on function public.get_worker_completed_booking_count(uuid) from public;
grant execute on function public.get_worker_completed_booking_count(uuid) to anon, authenticated;
