-- Real steps persistence — mirrors bodyweight_logs exactly (one row per
-- user per day, owner RLS + coach-view RLS) since it's the same "daily
-- metric" shape. Steps tracking was entirely session-local before this;
-- resolves that gap without inventing a new pattern.

create table if not exists public.steps_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorded_date date not null,
  steps int not null check (steps >= 0 and steps <= 200000),
  created_at timestamptz not null default now(),
  unique (user_id, recorded_date)
);

alter table public.steps_logs enable row level security;

create policy "steps_logs_owner_all"
  on public.steps_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "steps_logs_coach_view"
  on public.steps_logs
  for select
  using (
    exists (
      select 1 from public.profiles client
      where client.id = steps_logs.user_id
        and client.coach_id = auth.uid()
    )
  );

create index if not exists idx_steps_logs_user_date on public.steps_logs(user_id, recorded_date desc);
