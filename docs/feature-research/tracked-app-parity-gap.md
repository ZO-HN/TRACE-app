# Feature Trace: "Tracked" (com.tracked.mobile) → TRACE-client Parity TODO

**Purpose**: full feature/spec trace of the real "Tracked" app (Workout &
Nutrition, tracked.gg — iOS/Android, ~50k+ downloads, 4.9★), compared
screen-by-screen against TRACE-client's current architecture, compiled into
an implementation TODO list. This supersedes nothing — it complements
[`competitor-gap-analysis.md`](competitor-gap-analysis.md) (Hevy/MFP/WHOOP/
Strava/Fitbod), since Tracked is the single closest analog: same product
shape (strength training + nutrition + coaching, offline-first, single-coach
relationship model).

**Sources**:
- [tracked.gg](https://www.tracked.gg/) — marketing site, full feature list
- [App Store listing](https://apps.apple.com/us/app/tracked-strength-training/id6450913418) — description, changelog (v7.3.7), pricing
- [Google Play listing](https://play.google.com/store/apps/details?id=com.tracked.mobile&hl=en_US)

**Method**: Both public store listings were fetched directly; no login,
scraping of user data, or account creation was performed. Everything below
is publicly marketed feature copy — not reverse-engineered from the app
binary or API.

**Stop point**: this document goes as far as **spec + architectural mapping
+ effort/risk**. Anything that needs a decision only the repo owner can make
— which paid API to license, whether to take on a new native module, pricing
tier choices, whether a feature undercuts the single-coach model — is
flagged and left as a TODO rather than silently decided. That's the
"needs a user manual" stop condition per your instruction: read §3 before
implementing anything below it.

---

## 1. What Tracked has, TRACE already has (parity confirmed)

No action needed — already shipped, just noting confirmed overlap so you
know it's not accidentally missing:

| Tracked feature | TRACE equivalent |
|---|---|
| Set logging (weight/reps), rest timer | `GymLogger`, `set_logs`, existing rest timer |
| RIR/RPE tracking | Already in `set_logs` schema |
| Bodyweight tracking, 10-day highs/lows, trend smoothing | `/bodyweight/history`, `movingAverage.ts`, `trend.ts` |
| Workout folders, drag-organize | `src/lib/workout/folders.ts`, `/workouts/folders/new` |
| Progressive overload / PR tracking | `usePersonalRecords.ts` |
| Muscle group volume tracking | `useMuscleAnalytics.ts`, `analytics/muscleBars.ts` |
| Cardio tracking (duration, weekly stats) | `/cardio/*`, `cardio/summary.ts` |
| Sleep tracking (bedtime/wake/quality, rolling avg) | `/sleep`, `sleep/summary.ts` |
| Video form checks with coach feedback | `form_checks` table, `/form-checks/*` |
| Client-to-coach messaging | `useDirectChat.ts`, `(tabs)/messages.tsx` |
| Offline-first logging, syncs when reconnected | The entire outbox layer (`src/lib/outbox/`) |
| Step tracking (health platform) | Stubbed, not live — see §2 |
| Nutrition macro tracking, meal logging | `/nutrition`, `useNutritionLogs.ts` |

---

## 2. Gaps — ranked by how directly they extend existing architecture

### Tier A — extends a data model/hook that already exists, no new subsystem

1. **RIR shown as an auto-regulated suggestion color cue** — Tracked shows
   AI-suggested weight/reps in blue during logging. TRACE has RIR data
   already in `set_logs`; this is a **UI-only** affordance (a "last time you
   hit X reps at Y RIR, try Z" hint), not real AI — a simple lookback query
   against existing rows. **Effort: S.**
2. **Warm-up set exclusion from muscle volume calcs** — Tracked explicitly
   excludes warm-up sets from muscle-volume math (per their v7.3.7
   changelog). Check whether `useMuscleAnalytics.ts` / `muscleBars.ts`
   already distinguish a warm-up flag on `set_logs`; if not, this is a
   **schema gap** (needs an `is_warmup` boolean) plus an analytics filter
   fix. **Effort: S**, but touches the live `set_logs` table — same caution
   class as migration 002/007's "verify column shape first" caveat.
3. **Set failure marking** — Tracked lets you mark a set as failed (distinct
   from just logging fewer reps than planned). Small addition to the active
   workout screen + a boolean/enum on `set_logs`. **Effort: S.**
4. **Rep-range-organized PR view** — Tracked's PR view groups records by rep
   range (1RM vs. 5RM vs. 10RM+) rather than one single PR per exercise.
   `usePersonalRecords.ts` likely already has the raw data; this is a
   presentation change to the PR screen. **Effort: S.**
5. **Weekly nutrition summary (comparative)** — Tracked shows a weekly
   nutrition summary comparing to prior weeks. TRACE has daily macro bars
   only. Pure aggregation over `nutrition_logs`, no new table.
   **Effort: S–M**, same pattern as competitor-gap doc's "Monthly training
   reports" (also flagged there, S–M).
6. **Net carbs toggle + sugar tracking** — Tracked's nutrition entry
   supports a net-carbs display toggle and dedicated sugar field. Check if
   `nutrition/types.ts` already carries fiber/sugar fields (macro tracking
   likely already stores basic macros); if the columns exist this is a
   display toggle, if not it's a schema addition to the live
   `nutrition_logs` table (same caution as gap #2). **Effort: S.**
7. **Water intake logging + widget** — No water tracking exists in TRACE
   today. Needs a small table (`water_logs`: user_id, date, amount_ml) or a
   column on an existing daily-summary row, plus a dashboard card similar to
   the existing Bodyweight/Steps quick-log pattern already proven in
   `app/(tabs)/index.tsx`. **Effort: S–M.**
8. **Isometric hold tracking** — a set type where you log duration instead
   of reps (planks, wall-sits). Needs a `set_type` discriminator on
   `set_logs` (reps vs. duration) and a conditional input in the active
   workout UI. **Effort: S–M**, live-table schema change (same caution
   class).
9. **Readiness score (multi-factor, not wearable-dependent)** — Tracked's
   "readiness scoring combining multiple factors" reads as a **crude
   composite** (recent sleep + bodyweight trend + training load), distinct
   from WHOOP's HRV-based recovery score already flagged as XL/real in
   `competitor-gap-analysis.md`. TRACE already has sleep, bodyweight, and
   volume data — this is the **M-effort "crude proxy" option** from that
   doc's Recovery section, now confirmed as a real shipped pattern (not
   speculative) by a direct competitor. **Effort: M.**

### Tier B — new small subsystem, but self-contained (no external API/cost)

10. **Progress photos with full-screen comparison + date correction** —
    Already flagged in `competitor-gap-analysis.md` (Effort M) — Tracked's
    version confirms the exact shape: side-by-side comparison view, and a
    "date correction" affordance (photo taken date ≠ upload date). Must
    follow `src/lib/storage/policy.ts`'s R2-presigned pattern per
    `AGENTS.md`, with explicit trainee/coach visibility control per the
    original doc's risk note.
11. **Training phase planning / "Roadmap"** — Tracked has an explicit
    goal-based training-phase planner. The handoff doc (§2 item 9 in
    `trace-client-handoff-2026-08-10.md`) already notes "no 'roadmap'
    concept exists anywhere in this codebase" as a deliberate stub in
    Bodyweight Settings — this confirms it's a real competitor feature, not
    a nice-to-have guess. Needs a new `training_phases`/`goals` table
    (start date, end date, target metric, target value) and a UI section,
    likely surfaced from both Bodyweight Settings and Training tab.
    **Effort: M.**
12. **Check-in templates (weekly/biweekly/monthly) with charted answers
    over time** — a coach-defined recurring questionnaire the trainee fills
    out, distinct from the 1:1 chat and form checks. Needs a
    `checkin_templates` + `checkin_responses` table pair and a client-side
    form renderer. This is **coach-authoring-facing** functionality, which
    per `AGENTS.md` "There is no coach-facing UI in this repo" — the
    template *authoring* belongs in the dashboard repo; TRACE-client would
    only need the **response/fill-out + history chart** side.
    **Effort: M, cross-repo dependency.**
13. **Quiet hours for notifications** — per-user notification muting window
    plus muting by group (personal vs. coaching alerts, per Tracked's
    changelog). Local settings + a check in `usePushNotifications.ts`
    before firing. **Effort: S.**
14. **Gym directory with availability info** — lowest-priority Tracked
    feature for TRACE's single-coach model (a coach's trainees likely train
    at a known set of gyms, not browsing a directory). Flagging for
    completeness but **not recommended to prioritize** — would need a gyms
    table + real-world data source (hours, equipment) TRACE has no existing
    pipeline for. **Effort: L, low benefit for this product's model.**

### Tier C — needs a new native capability, external API, or recurring cost

**2026-08-12 decision: barcode scanning and "Train Together" real-time
coach mode are cut from scope — not being built.** Removed below rather
than left as dead TODOs. AI photo meal logging and voice logging were
re-scoped around a BYO-key AI copilot (see status notes) instead of a
TRACE-hosted/paid integration, which unblocked them. Wearable sync stays
on the list — the repo owner will integrate it later.

15. ~~Barcode scanning~~ — **cut from scope.**
16. **AI photo meal logging** — **shipped**, re-scoped: instead of a
    TRACE-hosted/paid vision API, this uses the user's own AI copilot key
    (see below) — `src/lib/ai/mealPhotoScan.ts`, wired into
    `QuickAddTab`'s "Scan photo with AI" button. No per-request cost to
    this app, no conflict with the offline-first outbox (the scan is a
    one-off online action that fills the existing text field; the actual
    log write still goes through the outbox as normal).
17. **Voice logging** — **partially shipped.** The BYO-key AI copilot
    (`src/lib/ai/client.ts`, `app/ai-copilot/*`) resolved the product-
    tension question below: since the user brings and pays for their own
    key, it isn't a TRACE-hosted "Roscoe" competing with the coach — it's
    an opt-in personal tool, framed in its own system prompt as
    explicitly deferring to the human coach on programming. The
    **conversational chat** half is shipped (`app/ai-copilot/index.tsx`).
    The **STT-only voice-to-set/food entry** half (speak instead of type,
    mid-workout) is not yet built — most OpenAI-compatible endpoints also
    expose an audio-transcription route, so this is buildable the same
    way meal-photo scanning was; just hasn't been done yet.
18. **Apple Health / Google Health Connect (+ Fitbit) step & sleep sync**
    — **deferred, not cut.** Repo owner will integrate this later. Still
    Effort: L–XL per provider (native module work beyond Expo managed
    workflow, each provider its own OAuth/data-freshness problem) — see
    `competitor-gap-analysis.md`'s Recovery/Wearables section for the
    full breakdown. No client-side work started; picking up here means
    starting with a provider choice (Apple Health + Health Connect first
    is the natural pair, Fitbit as a later third).
19. ~~"Train Together" real-time coach-athlete session mode~~ — **cut
    from scope.**

---

## 3. Decisions that need you

1. ~~Food database provider~~ — moot, barcode scanning cut from scope.
2. ~~Whether an AI coach chat is in scope~~ — **resolved**: yes, but as a
   BYO-key personal copilot (user supplies their own API key/endpoint,
   stored on-device only), not a TRACE-hosted or TRACE-paid assistant.
   Shipped.
3. **Wearable integration scope** (#18) — still open, but not blocking:
   the repo owner is picking this up later. When that starts: Apple
   Health + Health Connect alone (2 providers) vs. also Fitbit (3rd OAuth
   integration) — recommend deciding provider-by-provider rather than as
   one bundled feature.
4. ~~"Train Together" real-time mode~~ — moot, cut from scope.
5. ~~Check-in templates~~ — moot, already shipped (see §1).

---

## 4. Status summary (as of 2026-08-12)

- **Tier A (all 9 items): shipped** — data layer (draft migration 008)
  and UI wired into `GymLogger`, `TrainingScreen`, `Dashboard`,
  `NutritionLogger`.
- **Tier B: shipped**, except the gym directory (never recommended —
  low benefit for a single-coach model, not built). Draft migration 009
  covers progress photos, roadmap goals, and notification quiet hours.
  Check-in templates were already live from a prior session.
- **Tier C: barcode scanning and Train Together cut from scope.** AI
  photo meal logging and AI chat shipped via the BYO-key copilot. Voice
  logging (STT half) and wearable sync remain open — wearable sync is
  explicitly deferred to the repo owner, not scheduled for an agent
  session.
