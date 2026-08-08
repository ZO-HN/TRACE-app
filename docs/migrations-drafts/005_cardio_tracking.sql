-- DRAFT — not applied. Hand off to the coach-dashboard repo's
-- supabase/migrations/. Client code (useCardioExercises/useCardioEntries)
-- degrades gracefully (Postgres 42P01) if this hasn't landed yet.

create table if not exists public.cardio_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.cardio_exercises enable row level security;
create policy "cardio_exercises_owner_all" on public.cardio_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.cardio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cardio_exercise_id uuid not null references public.cardio_exercises(id) on delete cascade,
  entry_date date not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

alter table public.cardio_entries enable row level security;
create policy "cardio_entries_owner_all" on public.cardio_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists cardio_entries_user_date_idx
  on public.cardio_entries (user_id, entry_date desc);
