-- DRAFT — not applied. Hand off to the coach-dashboard repo's
-- supabase/migrations/. Client code (useSleepLogs) degrades gracefully
-- (Postgres 42P01) if this hasn't landed yet.

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sleep_date date not null, -- the wake-up date; one row per night, like bodyweight_logs
  bedtime timestamptz not null,
  wake_time timestamptz not null,
  quality smallint not null check (quality between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, sleep_date)
);

alter table public.sleep_logs enable row level security;
create policy "sleep_logs_owner_all" on public.sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists sleep_logs_user_date_idx
  on public.sleep_logs (user_id, sleep_date desc);
