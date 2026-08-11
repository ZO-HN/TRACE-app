# TRACE-client Handoff — 2026-08-10

Session summary for whoever picks this repo up next (human or agent) —
what got built, what's still open, what's stubbed on purpose, and what
needs the coach-dashboard repo before it'll work live. Pair this with
[`docs/qa/cross-repo-qa-checklist.md`](../qa/cross-repo-qa-checklist.md)
when both repos are open together — that doc is the test script; this one
is the map of what to test.

All work below is committed locally on `master`. **Nothing has been pushed
to GitHub** — this repo's `AGENTS.md` has a hard rule that commits stay
local unless explicitly requested otherwise.

---

## 1. What shipped this session

### Navigation
- Migrated off a single-screen tab-switcher to real `expo-router` file
  routes under `app/(tabs)/`.
- Bottom nav is now **Home / Nutrition / Training / Leaderboards / Social**
  (was Log/Nutrition/Progress/Stats, then Log/Nutrition/Stats — went
  through a couple of shapes this session before landing here).
- Shared top bar (`TopBar.tsx`) on every tab: hamburger (opens a left-side
  slide-in menu, `AppMenu.tsx`) — placeholder logo + "TRACE" wordmark —
  bell (Notifications) — chat (Messages).
- Root auth gate lives in `app/_layout.tsx` (not `(tabs)/_layout.tsx`) so
  every pushed screen — `bodyweight/*`, `cardio/*`, `sleep/*`,
  `leaderboards/*`, `form-checks/*`, `workouts/folders/new`,
  `nutrition/add-meal` — shares one `TraceUserProvider`, not just tab
  children. This was a real bug caught mid-session (screens outside
  `(tabs)` were throwing "must be used within TraceUserProvider").

### Home (Dashboard)
- Real dashboard replacing the old direct-into-workout-logger Log tab:
  date strip, Training/Calories/Macros/Bodyweight/Steps/Cardio/Sleep
  cards, Customize-dashboard row (stub).
- Calories, Macros, Cardio, Sleep, Bodyweight cards are all clickable →
  navigate to their respective tab/screen.
- Bodyweight and Steps cards have inline quick-log (tap "Log Weight"/"Log
  Steps" → numeric input appears in the card, no navigation).
- Sleep card's "Log Sleep" opens a bottom-sheet modal (Bedtime/Wake
  hour:minute:AM-PM fields, Quality 1–5, Save).

### Training tab (new)
- Consolidates what used to be scattered across a `/workouts` route and a
  Stats tab: **My Workouts** (folder-grouped list, create/move/delete
  folders), the rule-based **workout generator**, **personal records**,
  **muscle-volume analytics** — all in `src/components/TrainingScreen.tsx`.
- The old standalone `/workouts` route and `StatsScreen.tsx` were deleted;
  everything that pointed at them now points at `/(tabs)/training`.

### Leaderboards tab (new)
- Was a promo card + pushed screen; now a real tab showing the exercise
  list directly. Tapping an exercise still pushes to
  `/leaderboards/[exerciseId]` for the ranked detail view.

### Social tab (new)
- Feed / Connected / Discover sub-tabs.
- **Feed** is an honest empty-state stub — no shared-workout-post data
  model exists, deliberately not faked.
- **Connected** shows who you follow / who follows you (`useFollows` +
  new `useFollowers`).
- **Discover** lists other trainees under the same coach to follow, via a
  new `list_coach_roster` RPC (migration draft `007`, see §3).

### Bodyweight
- History table (month-grouped, moving average, 10-day low, rate) at
  `/bodyweight/history`.
- Settings screen (`/bodyweight/settings`): moving-average window picker,
  weigh-in reminders (local `expo-notifications`, no server dependency),
  Health Connect section (stubbed), Goal section (stubbed — no "roadmap"
  concept exists anywhere in this codebase).

### Nutrition tab
- Rebuilt to match the reference: date strip, four macro progress bars
  (Energy/Protein/Carbs/Fat vs. goal, 0% shown rather than NaN when no
  goal is set — there's no goal-setting feature yet, goals are hardcoded
  to 0), Meal 1–6 slot cards, "Add Meal" button to append more slots.
- **Known approximation**: `nutrition_logs` has no `meal_slot` column (and
  it's an already-live table, not draft-only) — slot assignment is
  client-side, entries land in Meal 1→6 in the order they were logged
  today, not necessarily the exact slot whose "+" was tapped. Documented
  in `src/lib/nutrition/mealSlots.ts`.
- "Add to Meal" modal: Quick Add / Favorites / Custom / Supplements /
  Meals tabs, save-as-template flow.

### Cardio tab (new, full feature)
- `/cardio` overview: total time, 12-week bar chart, this-week stats, PR
  (longest duration), recent days.
- `/cardio/select`: exercise picker with search + create-new.
- `/cardio/[exerciseId]`: per-day entries (inline min:sec add form, not a
  native picker), this-week total.
- Needs `cardio_exercises`/`cardio_entries` tables — migration draft `005`.

### Sleep (new, full feature)
- Dashboard "Log Sleep" bottom sheet + `/sleep` overview (last-night
  circle, 7D/30D avg, best/worst night, avg quality, history list).
- Time fields are plain hour/minute/AM-PM text inputs, not a native
  date/time picker — no such package is installed, and adding one risked
  breaking the Expo web preview used to verify changes (no reliable web
  build for most native date pickers).
- Needs `sleep_logs` table — migration draft `006`.

### Form Checks (new, full feature)
- Standalone submission flow (`/form-checks`, `/form-checks/new`) backing
  the coach dashboard's now-live `public.form_checks` table.
- Deliberately separate from the pre-existing per-set video clip in
  `GymLogger` (`set_logs.form_video_s3_key`, captured inline while logging
  a set) — different concept, different table, both still exist.
- Reuses the existing R2 presigned-upload path (`useMediaUpload`, kind
  `'form-video'`) — no new upload mechanism.
- **Unverified risk**: the list screen selects `exercise:exercises(name)`
  as a joined field, assuming a specific FK shape on
  `form_checks.exercise_id`. If the dashboard's actual schema differs,
  this fails silently to a blank name rather than erroring. Flagged as
  QA checklist item 3.1 — first thing to check once you can log in.

### Branding
- Primary accent recolored from blue (`#3B82F6`) to green (`#4ADE80`/
  `#22C55E`) app-wide, matching the reference screenshots' actual color.
  Every hardcoded hex (Ionicons/RN style props can't use Tailwind classes)
  was swept and updated; the Nutrition macro-bar chart colors were
  deliberately left alone (four distinct semantic colors, not a stray
  reuse of the old brand blue).

### Auth
- Added "Continue with Google" (Supabase OAuth via `expo-web-browser`).
  **Needs external config** — Google provider enabled in Supabase Auth
  settings + a matching Google Cloud OAuth client for this app's redirect
  URI (scheme `traceclient`) — not something this repo can do alone.
- A temporary "hide sign-up for demo" change was made and then **fully
  reverted** in the same session — confirmed no `DEMO_HIDE_SIGN_UP` or
  similar leftover in `AuthScreen.tsx`.

### Dev tooling
- Added a web preview target (`react-dom`, `react-native-web`,
  `@expo/metro-runtime`) purely for verifying changes in this session —
  `.claude/launch.json` config for `expo start --web`. This repo's
  `AGENTS.md` says not to add web support without a deliberate reason;
  the reason here is dev-time verification only, not a product target.
- Fixed `metro.config.js` to resolve `.wasm` assets so `expo-sqlite`'s web
  worker bundles cleanly (was erroring on every web-preview boot before
  this).
- Fixed a NativeWind crash on web (`darkMode: 'class'` in
  `tailwind.config.js` — was defaulting to `'media'`, which
  `react-native-css-interop` can't reconcile).

---

## 2. Outstanding TODOs / known gaps

Ranked roughly by how likely each is to matter next:

1. **Verify the Form Checks exercise-name join** (QA checklist 3.1) —
   the one unverified assumption from this session's newest feature.
2. **No live device/simulator testing was done** — every UI in this
   handoff was verified via `npm run typecheck`, `npm run test`, and an
   Expo **web** preview (console-error-free, correct text/structure).
   Nothing was clicked through on a real iOS/Android build or Expo Go —
   worth a real device pass before treating any of this as done.
3. **Google sign-in needs external setup** (see §1 Auth) before it does
   anything but surface an error.
4. **Seven pending Supabase migrations** (see §3) — nothing in the six new
   feature areas (Bodyweight Settings persistence, Workout Folders,
   Nutrition Extensions, Leaderboards, Cardio, Sleep, Social Discovery)
   is live until these are applied. Compiled for one-shot handoff in
   `docs/migrations-drafts/APPLY_ALL.md`.
5. **Nutrition meal-slot assignment is a client-side approximation**, not
   real per-meal association (§1 Nutrition) — fine for now, but if exact
   slot accuracy matters later, `nutrition_logs` needs a real
   `meal_slot` column, which is a schema change to an already-live table
   (more caution warranted than the draft-only tables).
6. **Extra meal slots don't persist** — "Add Meal" adds session-local
   slots beyond the default 6; they reset on tab remount. No
   `meal_count` field exists to persist it against.
7. **Steps tracking is entirely session-local** — no `steps` table
   anywhere in the schema (unlike bodyweight/sleep, which have real
   tables). Resets on remount. Real persistence needs either a manual
   step-count table or an actual Health Connect/HealthKit integration.
8. **No unit-preference setting exists** — bodyweight/steps quick-logs
   default to lbs because that's what every other entry point already
   assumes, not because of a real setting. If kg/lbs toggle matters,
   that's new scope in Bodyweight Settings.
9. Deliberately stubbed with "Coming soon" alerts, not wired to anything
   real (all consistent, honest placeholders — not silently broken):
   - Health Connect sync/import (Bodyweight Settings)
   - A bodyweight chart view (history screen's chart icon)
   - Session-history filtering (History screen's filter icon)
   - Progress photos (Dashboard Physique card, hamburger menu)
   - Dashboard customization row
   - Account settings, Gyms, Measurements (hamburger menu)
   - Renaming/deleting individual meal-slot entries
10. **Competitive feature-gap research** exists at
    `docs/feature-research/competitor-gap-analysis.md` — 17 candidate
    features from Hevy/MyFitnessPal/WHOOP/Strava/Fitbod with risk/benefit/
    effort, deliberately unranked. Worth a look for what's *not* on this
    TODO list yet but could be.

---

## 3. Pending backend migrations

All drafted, none applied. Full SQL compiled in one copy-pasteable file:
**[`docs/migrations-drafts/APPLY_ALL.md`](../migrations-drafts/APPLY_ALL.md)**
— apply in the numbered order given there (002 and 004 depend on earlier
ones; 003 is the largest, review it with the most care; 002 and 007 both
carry an explicit "verify this column/table shape exists first" caveat).

| # | Feature | Blocks |
|---|---|---|
| 001 | Bodyweight Settings | Settings persistence (currently session-only) |
| 002 | Workout Folders | `folder_id` on `workout_templates` — **touches a table the dashboard repo owns** |
| 003 | Nutrition Extensions | Custom Foods/Favorites/Supplements/Meal Templates (largest — 4 tables) |
| 004 | Leaderboards | `follows` table + `get_exercise_leaderboard` RPC — verify `set_logs.rpe`/`created_at` column names first |
| 005 | Cardio Tracking | `cardio_exercises`/`cardio_entries` |
| 006 | Sleep Tracking | `sleep_logs` |
| 007 | Social Discovery | `list_coach_roster` RPC — verify `profiles.coach_id`/`profiles.role` column names first |

---

## 4. Cross-repo testing

Once you're ready to test any of the above against the real dashboard app,
use **[`docs/qa/cross-repo-qa-checklist.md`](../qa/cross-repo-qa-checklist.md)**
— it's the test script for exactly this handoff: account provisioning,
workout assignment round-trip, the Form Checks join risk from §1/§2 above
as its own numbered case, coach↔client messaging, the shared exercises
catalog, RLS boundary negative tests, and which flows are blocked on which
migration from §3.

---

## 5. Verification status

Every change in this session was checked with:
- `npm run typecheck` — clean
- `npm run test` — 110/110 passing (`vitest`)
- Expo web preview (`npm start` equivalent via `expo start --web`) —
  boots with zero console errors as of the last commit

Not done: real-device/simulator click-through (see §2, item 2). If you're
picking this up next, that's the highest-value next step before shipping
anything here.
