# TRACE — Supabase Migration History (drafted in this repo)

**Status as of 2026-08-15: everything in this file (001-010, 012) is
APPLIED and live on the Supabase project (`lfaxkrorjljdeefnafjb`).** 011
was superseded before ever being applied — see its section. This file is
now a historical record of what was drafted here and confirmed live via
direct REST checks (querying each table/column returns `[]`, not a
missing-table/column error), not a to-do list.

Applied via the coach-dashboard repo's linked `supabase/` (it owns the
project link + a working CLI; this repo only ever had the anon key). Some
of these (esp. 010) were also independently applied by that repo's own
migration files with equivalent SQL — noted per-section below.

Each migration was idempotent (`create table if not exists`, `add column
if not exists`), so re-running any of them again is harmless if it's ever
in question.

---

## 001 — Bodyweight Settings — APPLIED

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

## 002 — Workout Folders — APPLIED

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

## 003 — Nutrition Extensions (Custom Foods, Favorites, Supplements, Meal Templates) — APPLIED

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

## 004 — Leaderboards (Follows + RPC) — APPLIED

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

## 005 — Cardio Tracking — APPLIED

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

## 006 — Sleep Tracking — APPLIED

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

## 007 — Social Discovery (Coach Roster RPC) — APPLIED

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

## 008 — Tracked-parity Tier A — APPLIED 2026-08-15

Backs: warm-up set exclusion from muscle volume, set failure marking,
isometric hold (duration) sets, net-carbs/sugar nutrition fields, water
logging. Applied as `20260815040000_tracked_parity_tier_a.sql`. Full SQL
in `docs/migrations-drafts/008_tracked_parity_tier_a.sql` — not
reproduced here since this file predates that draft being tracked in
APPLY_ALL; see the standalone file for the exact statements.

## 009 — Tracked-parity Tier B — APPLIED 2026-08-15

Backs: progress photos, training-phase "roadmap" goals, notification quiet
hours. Applied as `20260815050000_tracked_parity_tier_b.sql`. Full SQL in
`docs/migrations-drafts/009_tracked_parity_tier_b.sql`.

---

## 010 — Periodized Training Programs — APPLIED (already live)

Applied independently by the coach-dashboard repo as
`20260814000000_periodized_training_programs.sql`, byte-identical to the
SQL below. Kept here for reference only — do not re-apply.

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

## 011 — Steps Tracking — SUPERSEDED, do not apply

Was drafted as a new `steps_logs` table. The coach-dashboard repo
independently shipped a different, already-*applied* approach in
`20260815000000_steps_and_cardio_tracking.sql` — a `step_count` column on
the existing `wearable_biometrics` table instead of a new table. TRACE-client's
`useStepsLogs.ts` now targets that live column directly. This entry is kept
only so the number `011` isn't silently reused for something else later;
the SQL that was here has been deleted.

---

## 012 — Program Sharing — APPLIED 2026-08-15

Backs: share-by-link + join on `/programs`. Builds on `010` (also already
applied — see the coach-dashboard repo's
`20260814000000_periodized_training_programs.sql`, byte-identical to what
was drafted here as `010`). Scoped to authenticated users, not truly
public — see the SQL file's header comment for why, and for a known
limitation around joined programs referencing templates the joiner may not
have read access to.

```sql
alter table public.workout_programs
  add column if not exists share_token uuid unique;

create policy "workout_programs_share_token_read"
  on public.workout_programs
  for select
  to authenticated
  using (share_token is not null);

create policy "program_days_share_token_read"
  on public.program_days
  for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_id and p.share_token is not null
    )
  );

create or replace function public.join_program_by_token(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.workout_programs%rowtype;
  v_new_program_id uuid := gen_random_uuid();
begin
  select * into v_source from public.workout_programs where share_token = p_token;
  if not found then
    raise exception 'No program found for that share link.';
  end if;

  insert into public.workout_programs (id, owner_id, name, description, category, split_type, total_weeks)
  values (
    v_new_program_id, auth.uid(), v_source.name, v_source.description,
    v_source.category, v_source.split_type, v_source.total_weeks
  );

  insert into public.program_days (id, program_id, week_number, day_of_week, workout_template_id, notes)
  select gen_random_uuid(), v_new_program_id, week_number, day_of_week, workout_template_id, notes
  from public.program_days
  where program_id = v_source.id;

  return v_new_program_id;
end;
$$;

grant execute on function public.join_program_by_token(uuid) to authenticated;
```

---

## Post-apply verification (2026-08-15)

All of the above confirmed live via direct unauthenticated REST calls to
`https://lfaxkrorjljdeefnafjb.supabase.co/rest/v1/<table>` — each returned
`[]` (RLS-filtered empty result) rather than a missing-table/column error,
for: `bodyweight_settings`, `workout_folders`, `custom_foods`,
`favorite_foods`, `supplements`, `meal_templates`, `follows`,
`cardio_exercises`, `cardio_entries`, `sleep_logs`, `list_coach_roster`
(RPC), `set_logs.is_warmup`, `water_logs`, `progress_photos`,
`training_phases`, `notification_settings`, `workout_programs.share_token`.
Real in-app click-through (not just schema presence) is still unverified —
see the repo's device-testing caveat elsewhere.

No client code changes are needed anywhere in this list except
`useStepsLogs.ts`, which was rewritten to target
`wearable_biometrics.step_count` (the coach-dashboard repo's own,
different, already-applied approach) instead of the `steps_logs` table
`011` originally drafted — see that section above.
