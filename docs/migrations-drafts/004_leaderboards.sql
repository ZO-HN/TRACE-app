-- DRAFT — not applied. Hand off to the coach-dashboard repo's
-- supabase/migrations/. Client code (useLeaderboard/useFollows) already
-- degrades gracefully (Postgres 42P01/42883) if this hasn't landed yet —
-- confirmed by pointing this client at the current project, which lacks it.
--
-- Design choice: one-way "follows" (not mutual "friendships") -- simpler
-- join logic, matches typical fitness-app opt-in-follow UX. Revisit if
-- mutual approval is actually wanted.

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

-- Owner-scoped: a user can only see/manage rows where they are the follower.
create policy "follows_owner_all"
  on public.follows
  for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- NOTE: set_logs.rpe (not "rir") is this app's actual effort column
-- (see src/lib/outbox/mapSetLog.ts) — the reference screenshot showed RIR,
-- but this stays RPE to match the schema everywhere else. Also verify
-- set_logs' actual creation-timestamp column name (assumed `created_at`
-- below) against the dashboard repo's schema before applying.

-- SECURITY DEFINER so it can read across users' set_logs safely, filtered
-- server-side to the caller's own + followed accounts. Do NOT add a raw
-- cross-user SELECT policy on set_logs/bodyweight_logs to support this —
-- keep that read path funneled through this function.
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
