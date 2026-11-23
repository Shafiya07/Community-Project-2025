-- Store an optional numeric first-visit / inspection fee for filtering.
alter table public.workers
  add column if not exists consultation_fee numeric(10, 2);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workers_consultation_fee_check'
      and conrelid = 'public.workers'::regclass
  ) then
    alter table public.workers
      add constraint workers_consultation_fee_check
      check (consultation_fee is null or consultation_fee between 0 and 500000);
  end if;
end;
$$;

grant update (consultation_fee) on public.workers to authenticated;
