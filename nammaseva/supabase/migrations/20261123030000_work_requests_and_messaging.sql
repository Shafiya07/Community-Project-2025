-- Customer work requests, targeted in-app worker notifications, interest replies, and private chat.
create table if not exists public.work_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  service text not null check (char_length(service) between 1 and 100),
  title text not null check (char_length(title) between 3 and 120),
  area text not null check (char_length(area) between 2 and 160),
  description text not null check (char_length(description) between 10 and 2000),
  budget numeric(10,2) check (budget is null or budget between 0 and 5000000),
  desired_date date,
  status text not null default 'open' check (status in ('open','hired','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists work_requests_customer_created_idx on public.work_requests(customer_id, created_at desc);
alter table public.work_requests enable row level security;
revoke all on public.work_requests from anon, authenticated;
grant select, insert, update on public.work_requests to authenticated;
drop policy if exists "Customers read own work requests" on public.work_requests;
create policy "Customers read own work requests" on public.work_requests for select to authenticated using (customer_id = (select auth.uid()));
drop policy if exists "Customers create work requests" on public.work_requests;
create policy "Customers create work requests" on public.work_requests for insert to authenticated with check (customer_id = (select auth.uid()));
drop policy if exists "Customers close own work requests" on public.work_requests;
create policy "Customers close own work requests" on public.work_requests for update to authenticated using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

create table if not exists public.work_request_notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(request_id, worker_id)
);
alter table public.work_request_notifications enable row level security;
revoke all on public.work_request_notifications from anon, authenticated;
grant select on public.work_request_notifications to authenticated;
grant update (read_at) on public.work_request_notifications to authenticated;
drop policy if exists "Workers read own work request alerts" on public.work_request_notifications;
create policy "Workers read own work request alerts" on public.work_request_notifications for select to authenticated using (
  exists (select 1 from public.workers w where w.id = worker_id and w.user_id = (select auth.uid()))
);
drop policy if exists "Workers mark own alerts read" on public.work_request_notifications;
create policy "Workers mark own alerts read" on public.work_request_notifications for update to authenticated using (
  exists (select 1 from public.workers w where w.id = worker_id and w.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.workers w where w.id = worker_id and w.user_id = (select auth.uid()))
);

drop policy if exists "Matched workers read work requests" on public.work_requests;
create policy "Matched workers read work requests" on public.work_requests for select to authenticated using (
  exists (select 1 from public.work_request_notifications n join public.workers w on w.id = n.worker_id where n.request_id = work_requests.id and w.user_id = (select auth.uid()))
);

create table if not exists public.work_request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  worker_user_id uuid not null references auth.users(id) on delete cascade,
  worker_name text not null,
  message text not null default '' check (char_length(message) <= 1000),
  created_at timestamptz not null default now(),
  unique(request_id, worker_id)
);
alter table public.work_request_responses enable row level security;
revoke all on public.work_request_responses from anon, authenticated;
grant select, insert on public.work_request_responses to authenticated;
drop policy if exists "Participants read worker responses" on public.work_request_responses;
create policy "Participants read worker responses" on public.work_request_responses for select to authenticated using (
  worker_user_id = (select auth.uid()) or exists (select 1 from public.work_requests r where r.id = request_id and r.customer_id = (select auth.uid()))
);
drop policy if exists "Notified workers can respond" on public.work_request_responses;
create policy "Notified workers can respond" on public.work_request_responses for insert to authenticated with check (
  worker_user_id = (select auth.uid())
  and exists (select 1 from public.workers w join public.work_request_notifications n on n.worker_id = w.id where w.id = worker_id and w.user_id = (select auth.uid()) and w.name = worker_name and n.request_id = request_id)
  and exists (select 1 from public.work_requests r where r.id = request_id and r.status = 'open')
);

create table if not exists public.work_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists work_request_messages_thread_idx on public.work_request_messages(request_id, created_at);
alter table public.work_request_messages enable row level security;
revoke all on public.work_request_messages from anon, authenticated;
grant select, insert on public.work_request_messages to authenticated;
drop policy if exists "Chat participants read messages" on public.work_request_messages;
create policy "Chat participants read messages" on public.work_request_messages for select to authenticated using (
  sender_id = (select auth.uid()) or recipient_id = (select auth.uid())
);
drop policy if exists "Interested participants send messages" on public.work_request_messages;
create policy "Interested participants send messages" on public.work_request_messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and sender_id <> recipient_id
  and exists (
    select 1 from public.work_requests r join public.work_request_responses a on a.request_id = r.id
    where r.id = request_id and r.customer_id = recipient_id and a.worker_user_id = sender_id
  )
  or sender_id = (select auth.uid()) and sender_id <> recipient_id
  and exists (
    select 1 from public.work_requests r join public.work_request_responses a on a.request_id = r.id
    where r.id = request_id and r.customer_id = sender_id and a.worker_user_id = recipient_id
  )
);

create or replace function public.notify_workers_for_work_request(p_request_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to post a work request.'; end if;
  if not exists (select 1 from public.work_requests r where r.id = p_request_id and r.customer_id = (select auth.uid()) and r.status = 'open') then
    raise exception 'Work request not found or not open.';
  end if;
  insert into public.work_request_notifications(request_id, worker_id)
  select r.id, w.id from public.work_requests r join public.workers w on w.status = 'approved' and w.availability_status = 'available'
  where r.id = p_request_id
    and pg_catalog.regexp_replace(lower(w.profession), 's$', '') = pg_catalog.regexp_replace(lower(r.service), 's$', '')
    and exists (
      select 1 from pg_catalog.jsonb_array_elements_text(w.service_areas) s(area)
      where lower(s.area) like '%' || lower(r.area) || '%' or lower(r.area) like '%' || lower(s.area) || '%'
    )
  on conflict (request_id, worker_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.notify_workers_for_work_request(uuid) from public, anon;
grant execute on function public.notify_workers_for_work_request(uuid) to authenticated;

create or replace function public.protect_work_request_updates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_id is distinct from old.customer_id or new.customer_name is distinct from old.customer_name
    or new.service is distinct from old.service or new.title is distinct from old.title or new.area is distinct from old.area
    or new.description is distinct from old.description or new.budget is distinct from old.budget
    or new.desired_date is distinct from old.desired_date or new.created_at is distinct from old.created_at then
    raise exception 'Work request details cannot be changed after posting.';
  end if;
  if new.status not in ('hired','closed') or old.status <> 'open' then raise exception 'This work request status change is not allowed.'; end if;
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
drop trigger if exists protect_work_request_updates on public.work_requests;
create trigger protect_work_request_updates before update on public.work_requests for each row execute function public.protect_work_request_updates();
revoke all on function public.protect_work_request_updates() from public, anon, authenticated;
