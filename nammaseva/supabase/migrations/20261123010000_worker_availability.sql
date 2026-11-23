-- Let workers share a current availability indicator with customers.
alter table public.workers
  add column if not exists availability_status text not null default 'available';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workers_availability_status_check'
      and conrelid = 'public.workers'::regclass
  ) then
    alter table public.workers
      add constraint workers_availability_status_check
      check (availability_status in ('available', 'busy', 'unavailable'));
  end if;
end;
$$;

create or replace function public.sync_worker_availability_from_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.worker_id is null then return new; end if;

  if new.status = 'in_progress' then
    update public.workers set availability_status = 'busy' where id = new.worker_id;
  elsif tg_op = 'UPDATE' and old.status = 'in_progress'
    and new.status in ('completed', 'cancelled')
    and not exists (
      select 1 from public.bookings
      where worker_id = new.worker_id and status = 'in_progress' and id <> new.id
    ) then
    update public.workers
      set availability_status = 'available'
      where id = new.worker_id and availability_status = 'busy';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_worker_availability_from_booking on public.bookings;
create trigger sync_worker_availability_from_booking
  after insert or update of status on public.bookings
  for each row execute function public.sync_worker_availability_from_booking();

revoke all on function public.sync_worker_availability_from_booking() from public, anon, authenticated;

grant update (availability_status) on public.workers to authenticated;
