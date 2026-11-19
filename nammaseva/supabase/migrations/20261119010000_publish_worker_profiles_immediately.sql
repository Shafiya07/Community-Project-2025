-- Publish each new worker listing immediately after submission.
alter table public.workers
  alter column status set default 'approved';

-- Existing profiles have already been submitted with consent to publish contact details.
update public.workers
set status = 'approved'
where status = 'pending';
