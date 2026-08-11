# TRACE-client TODO — from 2026-08-12 cross-repo QA pass

Generated after a code-level (no live login) QA pass across TRACE (coach dashboard)
and TRACE-client, cross-referenced against the live Supabase schema
(`lfaxkrorjljdeefnafjb`). See `docs/handoff/trace-client-handoff-2026-08-10.md`
and `docs/qa/cross-repo-qa-checklist.md` for prior context.

## Confirmed findings (not guesses — verified against live DB + both repos' source)

1. Live DB check: `form_checks.exercise_id` has exactly one FK
   (`form_checks_exercise_id_fkey` → `exercises(id)`) — the dashboard's
   `exercise:exercises(name)` embed is safe, no ambiguity. Not a client-repo item,
   noted for context only.
2. `useFormChecks.ts` submit path lets `exercise_id` be `null` on purpose
   (trainee can pick "No exercise") — this is correct behavior, just make sure
   the dashboard side treats null as "no exercise" not an error (dashboard-side
   fix, not yours, noted for context).
3. **No check-in feature exists client-side at all** — zero code for
   `check_in_templates`/`CheckInQuestion`, no `app/checkins/` route, nothing.
4. **Exercise muscle data mismatch** — `useExerciseCatalog.ts` and
   `useMuscleAnalytics.ts` only read the legacy flat `target_muscle_group`
   column. The dashboard now writes real per-muscle rows with primary/secondary
   `role` to `exercise_muscles`/`muscle_groups` (see
   `TRACE/supabase/migrations/20260805000001_exercise_details.sql`). Client
   never reads that table, so secondary muscles and any muscle beyond the
   first primary are invisible to trainees.
5. Messaging (`useDirectChat.ts`) is confirmed working correctly on both sides
   — real Supabase Realtime `postgres_changes`, matching channel naming. No
   action needed.

## TODO for this repo, ranked

1. **Build the check-in feature from scratch.** This is the single biggest gap
   found. Needs: a new route (e.g. `app/checkins/`), a screen that fetches a
   trainee's assigned `check_in_templates`, a question-type renderer covering
   all types the dashboard supports — `text`, `number`, `scale-5`, `scale-10`,
   `single-choice`, `multiple-choice`, `photo`, `time`, `bodyweight`,
   `progress-photo`, `measurement` — and a submit flow writing to `check_ins`
   as the trainee (`client_id = auth.uid()`, matches the existing
   `form_checks` insert pattern in `useFormChecks.ts` as a reference for the
   RLS/trigger shape). Reference the coach dashboard's `CheckInQuestion` type
   definition for the exact schema of each question type before starting.
2. **Fix exercise muscle-data reads.** Update `useExerciseCatalog.ts` and
   `useMuscleAnalytics.ts` to read `exercise_muscles(role, muscle_group:muscle_groups(id,name))`
   instead of (or in addition to, for back-compat) the flat
   `target_muscle_group` column, so primary/secondary muscle tagging done on
   the dashboard actually shows up for trainees. Mirror the read shape the
   dashboard uses in `TRACE/src/hooks/useExercises.ts` (`SELECT_COLUMNS`,
   around line 73) for consistency.
3. **Real device/simulator pass.** Every UI shipped in the 2026-08-10 session
   was only verified via typecheck/test/Expo web preview — never clicked
   through on a real iOS/Android build. Do this before treating any of that
   work as done, especially the newer tabs (Cardio, Sleep, Social, Training).
4. Everything else in the prior handoff's "Outstanding TODOs" list (§2 of
   `trace-client-handoff-2026-08-10.md`) still stands unchanged — Google
   sign-in external config, 7 pending migrations, nutrition meal-slot
   approximation, steps persistence, unit-preference setting, etc. Not
   repeated here in full; read that doc for the complete list.

## Explicitly not in scope for this repo

- Setting `platform_settings.default_coach_id` (blocks trainee signup
  `coach_id` assignment right now — confirmed empty on live DB) — that's a
  Supabase-side action for whoever holds the coach's profile ID, not a code
  change in this repo.
- The 7 pending migration drafts themselves are compiled and ready in
  `docs/migrations-drafts/APPLY_ALL.md` — applying them is a Supabase-side
  action, not something to redo here.
