-- Link each worker listing to its authenticated owner and let that owner manage it.
alter table public.workers
  add column if not exists user_id uuid unique references auth.users (id) on delete cascade;

create index if not exists workers_user_id_idx on public.workers (user_id) where user_id is not null;

drop policy if exists "Workers can read own profile" on public.workers;
create policy "Workers can read own profile"
  on public.workers for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Workers can update own profile" on public.workers;
create policy "Workers can update own profile"
  on public.workers for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Workers can delete own profile" on public.workers;
create policy "Workers can delete own profile"
  on public.workers for delete to authenticated
  using (user_id = (select auth.uid()));

grant delete on public.workers to authenticated;

create or replace function public.protect_worker_account_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.user_id = (select auth.uid()) and not public.is_admin() then
    if new.user_id is distinct from old.user_id
      or new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.published_contact is distinct from old.published_contact
      or new.status is distinct from old.status
      or new.verified is distinct from old.verified then
      raise exception 'Worker account cannot change ownership, approval, or verification fields.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_worker_account_fields on public.workers;
create trigger protect_worker_account_fields
  before update on public.workers
  for each row execute function public.protect_worker_account_fields();

drop policy if exists "Worker owners can read own photos" on storage.objects;
create policy "Worker owners can read own photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'worker-photos'
    and exists (
      select 1 from public.workers
      where workers.user_id = (select auth.uid())
        and workers.id::text = split_part(storage.objects.name, '/', 1)
    )
  );

drop policy if exists "Worker owners can upload own photos" on storage.objects;
create policy "Worker owners can upload own photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'worker-photos'
    and exists (
      select 1 from public.workers
      where workers.user_id = (select auth.uid())
        and workers.id::text = split_part(storage.objects.name, '/', 1)
    )
  );

drop policy if exists "Worker owners can replace own photos" on storage.objects;
create policy "Worker owners can replace own photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'worker-photos'
    and exists (
      select 1 from public.workers
      where workers.user_id = (select auth.uid())
        and workers.id::text = split_part(storage.objects.name, '/', 1)
    )
  )
  with check (
    bucket_id = 'worker-photos'
    and exists (
      select 1 from public.workers
      where workers.user_id = (select auth.uid())
        and workers.id::text = split_part(storage.objects.name, '/', 1)
    )
  );

drop policy if exists "Worker owners can delete own photos" on storage.objects;
create policy "Worker owners can delete own photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'worker-photos'
    and exists (
      select 1 from public.workers
      where workers.user_id = (select auth.uid())
        and workers.id::text = split_part(storage.objects.name, '/', 1)
    )
  );
