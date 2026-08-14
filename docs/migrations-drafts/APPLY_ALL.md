# TRACE — Pending Supabase Migrations (apply in the dashboard repo)

This file bundles every drafted-but-unapplied migration from the client
repo's `docs/migrations-drafts/` folder. None of this has been applied to
the live Supabase project yet — the client code for each feature already
degrades gracefully (empty states / "not live yet" screens) until it is.

**Apply in the order listed** — `002` and `004` reference tables/columns
from earlier files (`profiles`, `workout_templates`, `set_logs`), and `003`
is the largest single migration (four new tables), so review it with the
most care.

Each migration is idempotent (`create table if not exists`, `add column if
not exists`) — safe to re-run if a prior attempt partially applied.

---

## How to apply

Paste each numbered SQL block below into the Supabase project's **SQL
Editor** (or save each as its own file under this repo's
`supabase/migrations/` and run `supabase db push`), in order, and execute.
After all six are applied, no client-side code changes are needed — every
feature already reads/writes these exact table and column names.

---

## 001 — Bodyweight Settings

Backs: Bodyweight Settings screen (moving-average window picker, weigh-in
reminders). Owner-only RLS, matching `bodyweight_logs`.

```sql
create table if not exists public.bodyweight_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  moving_average_window smallint not null default 7
    check (moving_average_window in (7, 14)),
  weigh_in_reminder_enabled boolean not null default false,
  weigh_in_reminder_time time,
  updated_at timestamptz not null default now()
);

alter table public.bodyweight_settings enable row level security;

create policy "bodyweight_settings_owner_all"
  on public.bodyweight_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 002 — Workout Folders

Backs: "My Workouts" folder grouping/move/delete. **Touches
`workout_templates`, a table the dashboard repo owns** — review before
applying. Folders are a trainee-side organizational construct; a coach's
`ASSIGNED` template can be foldered by the trainee without changing who
owns/edits the template. If that's not the intended semantics, rename
`folder_id` → `user_folder_id` to make the distinction explicit before
applying.

```sql
create table if not exists public.workout_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.workout_folders enable row level security;

create policy "workout_folders_owner_all"
  on public.workout_folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.workout_templates
  add column if not exists folder_id uuid references public.workout_folders(id) on delete set null;
```

---

## 003 — Nutrition Extensions (Custom Foods, Favorites, Supplements, Meal Templates)

Backs: the "Add to Meal" modal's Custom/Favorites/Supplements/Meals tabs.
**Largest migration — four new tables.** `supplements` is reference data
(coach/admin-seeded); clients get read-only access, no client writes.

```sql
create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.custom_foods enable row level security;
create policy "custom_foods_owner_all" on public.custom_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Denormalized name+macro snapshot, not a pointer into custom_foods /
-- nutrition_logs, so favoriting survives edits/deletes of the source.
create table if not exists public.favorite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.favorite_foods enable row level security;
create policy "favorite_foods_owner_all" on public.favorite_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reference data, coach/admin-seeded — clients read only, no client writes.
create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.supplements enable row level security;
create policy "supplements_read_all" on public.supplements
  for select using (auth.role() = 'authenticated');

create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.meal_templates enable row level security;
create policy "meal_templates_owner_all" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  meal_template_id uuid not null references public.meal_templates(id) on delete cascade,
  "order" smallint not null default 0,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer
);

alter table public.meal_template_items enable row level security;
create policy "meal_template_items_owner_all" on public.meal_template_items
  for all
  using (exists (
    select 1 from public.meal_templates t
    where t.id = meal_template_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.meal_templates t
    where t.id = meal_template_id and t.user_id = auth.uid()
  ));
```

---

## 004 — Leaderboards (Follows + RPC)

Backs: per-exercise leaderboards. One-way `follows` (not mutual
friendships) — simpler join logic, matches typical opt-in-follow UX.
`get_exercise_leaderboard` is `SECURITY DEFINER` so it can read across
followed users' `set_logs` safely, scoped server-side. **Do not** add a raw
cross-user `SELECT` policy on `set_logs`/`bodyweight_logs` to support this
— keep that read path funneled through the function.

> **Verify before applying**: this assumes `set_logs` has an `rpe` column
> (not `rir`) and a `created_at` timestamp column — confirm both against
> the actual schema in this repo before running.

```sql
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

create policy "follows_owner_all"
  on public.follows
  for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

create or replace function public.get_exercise_leaderboard(p_exercise_id uuid)
returns table (
  user_id uuid,
  display_name text,
  weight_lbs numeric,
  reps integer,
  rpe numeric,
  volume numeric,
  sets integer
)
language sql
security definer
set search_path = public
as $$
  with scope as (
    select auth.uid() as uid
    union
    select followee_id from public.follows where follower_id = auth.uid()
  ),
  best_set as (
    select
      sl.user_id,
      sl.weight_kg,
      sl.reps,
      sl.rpe,
      row_number() over (
        partition by sl.user_id
        order by sl.weight_kg * sl.reps desc
      ) as rn
    from public.set_logs sl
    join scope on scope.uid = sl.user_id
    where sl.exercise_id = p_exercise_id
      and sl.created_at >= now() - interval '30 days'
  ),
  agg as (
    select
      sl.user_id,
      sum(sl.weight_kg * sl.reps) as volume,
      count(*) as sets
    from public.set_logs sl
    join scope on scope.uid = sl.user_id
    where sl.exercise_id = p_exercise_id
      and sl.created_at >= now() - interval '30 days'
    group by sl.user_id
  )
  select
    p.id,
    coalesce(p.first_name || ' ' || p.last_name, 'Athlete'),
    round(best_set.weight_kg / 0.45359237, 1),
    best_set.reps,
    best_set.rpe,
    agg.volume,
    agg.sets
  from best_set
  join agg on agg.user_id = best_set.user_id
  join public.profiles p on p.id = best_set.user_id
  where best_set.rn = 1
  order by (best_set.weight_kg * best_set.reps) desc
  limit 50;
$$;

grant execute on function public.get_exercise_leaderboard(uuid) to authenticated;
```

---

## 005 — Cardio Tracking

Backs: the Cardio overview, exercise catalog, and per-day entry screens.

```sql
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
```

---

## 006 — Sleep Tracking

Backs: the Log Sleep bottom sheet and Sleep overview page. One row per
night (`unique (user_id, sleep_date)`), upserted like `bodyweight_logs`.

```sql
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
```

---

## 007 — Social Discovery (Coach Roster RPC)

Backs: the Social tab's Connected/Discover lists. **Verify first** that
`public.profiles` actually has `coach_id` and `role` columns with those
exact names (per AGENTS.md's description of `handle_new_user()`) before
applying — the function body assumes them.

```sql
create or replace function public.list_coach_roster()
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select p.id, coalesce(p.first_name || ' ' || p.last_name, 'Athlete')
  from public.profiles p
  where p.coach_id = (select coach_id from public.profiles where id = auth.uid())
    and p.id <> auth.uid()
    and p.role = 'trainee'
  order by p.first_name
  limit 200;
$$;

grant execute on function public.list_coach_roster() to authenticated;
```

---

## 010 — Periodized Training Programs

Backs: `app/programs/` (program builder + progress tracking). Trainee-owned
(`owner_id`), matching `workout_folders`' ownership model. Deliberately a
2-level program → days model rather than a 4-level program/mesocycle/
microcycle/day hierarchy — see the SQL file's header comment for why. Share-
by-link/join is explicitly out of scope for this pass.

```sql
create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  category text,
  split_type text not null default 'custom',
  total_weeks smallint not null check (total_weeks between 1 and 52),
  created_at timestamptz not null default now()
);

alter table public.workout_programs enable row level security;

create policy "workout_programs_owner_all"
  on public.workout_programs
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  week_number smallint not null check (week_number > 0),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  notes text,
  unique (program_id, week_number, day_of_week)
);

create index if not exists idx_program_days_program on public.program_days(program_id);

alter table public.program_days enable row level security;

create policy "program_days_owner_all"
  on public.program_days
  for all
  using (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_id and p.owner_id = auth.uid()
    )
  );

create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_week smallint not null default 1,
  current_day smallint not null default 1
);

create index if not exists idx_program_enrollments_user on public.program_enrollments(user_id);

alter table public.program_enrollments enable row level security;

create policy "program_enrollments_owner_all"
  on public.program_enrollments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 011 — Steps Tracking

Backs: the Dashboard's Steps card, currently session-local only (resets on
remount). Mirrors `bodyweight_logs` exactly — same one-row-per-day shape,
same owner + coach-view RLS split.

```sql
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
```

---

## After applying

No client code changes are required — every hook (`useBodyweightSettings`,
`useWorkoutFolders`, `useCustomFoods`/`useFavoriteFoods`/`useSupplements`/
`useMealTemplates`, `useLeaderboard`/`useFollows`/`useFollowers`,
`useCardioExercises`/`useCardioEntries`/`useCardioHistory`, `useSleepLogs`,
`useCoachRoster`) already targets these exact table/column/function names
and will start working live the moment each migration lands. Spot-check in
the app:

- Bodyweight Settings screen saves without falling back to session-only.
- A workout can be moved into a folder from My Workouts.
- Add to Meal → Custom/Favorites/Supplements/Meals tabs stop showing empty
  states.
- `/leaderboards/<exerciseId>` shows ranked entries instead of "not live yet".
- `/cardio` shows real weekly totals after logging an entry.
- `/sleep` shows a real last-night summary after using Log Sleep.
- The Social tab's Discover list shows other trainees instead of "not live yet".
