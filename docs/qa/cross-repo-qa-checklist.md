# Cross-Repo QA Checklist — TRACE-client ↔ coach dashboard

**When to use this**: when both `TRACE-client` (this repo, the trainee app)
and the coach dashboard repo (`TRACE`) are open together in one session, for
end-to-end testing of the shared Supabase backend and logic flow between
them. Each test case below is a round-trip: an action in one app, verified
in the other. Neither repo can be fully QA'd alone for these flows — that's
the point of testing them together.

Every case names which repo performs the action and which repo verifies the
result, the exact screen/table involved, and what "pass" looks like. Where
a flow depends on a migration that isn't applied yet (see this repo's
`docs/migrations-drafts/APPLY_ALL.md`), it's marked **BLOCKED** — skip it
until that migration lands, don't treat a failure there as a bug.

---

## How to run this

1. Two trainee test accounts (`Trainee A`, `Trainee B`) and one coach
   account, all against the same Supabase project the two repos share.
2. Confirm `platform_settings.default_coach_id` is set to the test coach —
   every account created in `TRACE-client` auto-enrolls to whichever coach
   that points at (see this repo's `AGENTS.md`).
3. Work top to bottom — later sections assume earlier ones passed (e.g. the
   workout-assignment tests assume the trainee is already enrolled to the
   coach).
4. For each case: note pass/fail, and if fail, which repo's code (or which
   shared table/RLS policy) looks like the actual cause before filing
   anything — a mismatch here is as likely to be a contract drift between
   the two repos as a bug in either one alone.

---

## 1. Account provisioning

| # | Action | Verify | Pass condition |
|---|---|---|---|
| 1.1 | **Client**: sign up a new trainee (`Trainee A`) via `TRACE-client`'s auth screen | **Dashboard**: check the coach's roster | New trainee appears, `role = 'trainee'`, `coach_id` = the coach's id (not null) |
| 1.2 | **Client**: sign in as `Trainee A`, open the hamburger menu → Account | — | Profile loads without error (confirms `useTraceUser` resolved a real `profiles` row) |

---

## 2. Workout assignment (coach → client)

| # | Action | Verify | Pass condition |
|---|---|---|---|
| 2.1 | **Dashboard**: assign a `workout_templates` row (`scope = 'ASSIGNED'`) to Trainee A, with 2+ `template_items` | **Client**: open Home tab | Training card shows the assigned template's name, not "Select Workout" |
| 2.2 | **Client**: tap the Training card → Start Workout | — | `GymLogger` loads the coach's exact exercises/sets/reps, not the hardcoded placeholder |
| 2.3 | **Client**: log a few sets, mark them complete (airplane mode off) | **Dashboard**: check `set_logs`/`workout_sessions` for Trainee A | Sets appear with correct `weight_kg` (converted from the lbs the client UI showed), `reps`, `rpe`; no `estimated_1rm` in the write payload (generated column) |
| 2.4 | **Client**: repeat 2.3 with airplane mode ON, then reconnect | **Dashboard**: same table | Sets still land once connectivity returns (outbox flush) — this is the one offline-critical path in the client, worth deliberately testing offline |

---

## 3. Form Checks (client → coach → client)

This is the newest cross-repo contract (`public.form_checks`, live as of
the coach dashboard's `docs/client-app-handoff-2026-08-10.md` §4).

| # | Action | Verify | Pass condition |
|---|---|---|---|
| 3.1 | **Client**: hamburger menu → Training → Form Checks → submit a video, **with an exercise selected** | **Client**: back on the Form Checks list | New entry shows the exercise's real name, not blank/"Form check" fallback — **this is the specific join risk flagged when this feature shipped**: the hook selects `exercise:exercises(name)` assuming a particular FK shape on `form_checks.exercise_id`; if the dashboard's actual schema differs, this fails silently to `null` rather than erroring, so a blank name here is the signal, not a thrown error |
| 3.2 | **Client**: submit a second form check **without** selecting an exercise | **Client**: Form Checks list | Entry shows "Form check" (no exercise name), status `unreviewed`, no error |
| 3.3 | **Dashboard**: open Form Checks page, find Trainee A's two submissions | — | Both videos play (signed R2 URL resolves); exercise tag on 3.1's entry matches what was selected client-side |
| 3.4 | **Dashboard**: review submission from 3.1 — set status to reviewed, add coach notes | **Client**: reload Form Checks list | Status flips to `reviewed`, coach notes text appears under that entry |
| 3.5 | **Client**: attempt to edit/delete a form check (no UI for this today, but sanity-check via direct table access if testing RLS) | — | Update/delete is rejected by RLS — review is coach-only, client is insert-and-read-own only |
| 3.6 | **Client**: submit a form check while **not yet enrolled to any coach** (a test account with no coach) | — | Insert is rejected — the `BEFORE INSERT` trigger requires a `coach_id` to stamp, matching `check_ins`' existing pattern |

---

## 4. Messaging (coach ↔ client)

| # | Action | Verify | Pass condition |
|---|---|---|---|
| 4.1 | **Dashboard**: coach sends a chat message to Trainee A | **Client**: open Messages (top bar chat icon) | Message appears, correct sender |
| 4.2 | **Client**: Trainee A replies | **Dashboard**: coach's chat view for Trainee A | Reply appears in real time (or on refresh, if the dashboard doesn't have realtime chat) |
| 4.3 | **Dashboard**: coach sends a message | **Client**: check for a push notification (real device, not the web preview) | Push notification received (skip if no EAS project is linked yet — `usePushNotifications` no-ops without one, this is expected, not a bug) |

---

## 5. Shared read-only data (exercises catalog)

| # | Action | Verify | Pass condition |
|---|---|---|---|
| 5.1 | **Dashboard**: add a new exercise to `public.exercises` | **Client**: open Training tab → Generate a workout, or Form Checks → New → exercise picker | New exercise appears in the client's catalog without any client-side deploy |
| 5.2 | **Client**: confirm no write path exists to `exercises` from this app (read-only contract) | — | No UI anywhere in `TRACE-client` creates/edits exercises — if one exists, that's a contract violation worth flagging |

---

## 6. RLS boundaries (negative tests — these should fail)

| # | Action | Expected result |
|---|---|---|
| 6.1 | **Client**: as Trainee A, attempt to read Trainee B's `workout_sessions`/`set_logs`/`bodyweight_logs`/`nutrition_logs` directly | Rejected by RLS — owner-only on all of these |
| 6.2 | **Client**: as Trainee A, attempt to read the coach's `feedback`/`notifications` tables (coach-dashboard-only, mentioned in the handoff doc as explicitly not client-relevant) | Rejected — these are `coach_id = auth.uid()`-scoped, no trainee policy exists |
| 6.3 | **Client**: as Trainee A, call the `list_coach_roster` RPC (Social tab → Discover) | Only returns other trainees under the **same** coach, id + display name only — no email/DOB/other profile fields, and Trainee A's own row is excluded |
| 6.4 | **Client**: as Trainee A, attempt to set `form_checks.coach_id` directly in an insert payload | Either the column is ignored (trigger overwrites it) or the insert is rejected — client code never sets this intentionally, confirm the DB doesn't silently trust a client-supplied value either |

---

## 7. Migration-gated flows — **BLOCKED until applied**

These depend on migrations drafted in `docs/migrations-drafts/APPLY_ALL.md`
that aren't live yet. Don't test them until confirming via
`npx supabase migration list` (or equivalent) that the relevant migration
has actually run — a failure here before that point is expected, not a bug.

| Flow | Needs |
|---|---|
| Bodyweight Settings persists across reload | `001_bodyweight_settings.sql` |
| Moving a workout into a folder persists | `002_workout_folders.sql` |
| Add to Meal → Custom/Favorites/Supplements/Meals stop showing empty states | `003_nutrition_extensions.sql` |
| `/leaderboards/<exerciseId>` shows ranked entries | `004_leaderboards.sql` — also verify `set_logs` actually has `rpe` and `created_at` columns as assumed |
| `/cardio` and `/sleep` show real data | `005_cardio_tracking.sql`, `006_sleep_tracking.sql` |
| Social tab Discover list is non-empty | `007_social_discovery.sql` — also verify `profiles.coach_id`/`profiles.role` exist with those names, as assumed |

---

## 8. Reporting a failure

For anything that fails, capture: which repo performed the action, which
repo/table you checked, the exact table/column/RPC name involved, and
whether the two repos' assumptions about that name/shape actually match —
most cross-repo bugs here will be a contract drift (one side assumes a
column/shape the other side doesn't have), not a logic bug in either app
alone.
