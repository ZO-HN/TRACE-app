-- DRAFT — not applied. Hand off to the coach-dashboard repo's
-- supabase/migrations/ for review and application; this client repo has no
-- migrations folder of its own (see AGENTS.md). Until this is applied,
-- src/hooks/useBodyweightSettings.ts degrades to in-memory defaults.

create table if not exists public.bodyweight_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  moving_average_window smallint not null default 7
    check (moving_average_window in (7, 14)),
  weigh_in_reminder_enabled boolean not null default false,
  weigh_in_reminder_time time,
  updated_at timestamptz not null default now()
);

alter table public.bodyweight_settings enable row level security;

-- Owner-only, matching bodyweight_logs' existing policy shape.
create policy "bodyweight_settings_owner_all"
  on public.bodyweight_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
