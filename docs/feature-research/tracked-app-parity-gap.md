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

These overlap heavily with items already in `competitor-gap-analysis.md`;
listed here only where Tracked's implementation adds a new detail worth
noting.

15. **Barcode scanning (50,000+ verified foods)** — same feature/risk as
    competitor-gap doc's "Barcode Scanner" (Effort M–L, needs a licensed
    food database — Open Food Facts free tier vs. a paid API like
    Nutritionix). Tracked's own reviews note their food database is
    *smaller* than dedicated apps like Cronometer — worth knowing this is a
    real, accepted tradeoff in the category, not a bar TRACE needs to clear
    perfectly.
16. **AI photo meal logging** — same as competitor-gap doc (Effort L–XL,
    per-request inference cost, conflicts with offline-first outbox design
    for that one write path).
17. **Voice logging (hands-free, mid-set exercise swap via voice)** — same
    class as competitor-gap doc's Voice Logging entry (Effort M), but
    Tracked's version is deeper: full conversational AI ("Roscoe") doing
    workout creation and session review via natural language, not just
    speech-to-text into the existing quick-add parser. The **STT-only**
    subset (speak a set/food entry, transcribe, feed existing parsers) is
    the M-effort version already scoped; the **conversational-AI-coach**
    subset (Roscoe-equivalent) is a materially larger, ongoing-cost
    undertaking — **Effort: XL**, and raises the same "undercuts the human
    coach relationship" tension flagged for Fitbod's AI generator in the
    other doc. Needs an explicit product decision before any build.
18. **Apple Health / Google Health Connect step & sleep sync** — same as
    competitor-gap doc's "Wearable Device Integration" (Effort L–XL per
    provider, native module work beyond Expo managed workflow). Tracked
    also merges Fitbit data specifically for steps/sleep — a second
    provider on top of platform health APIs, each its own OAuth flow.
19. **"Train Together" real-time coach-athlete session mode** — a live
    synchronized session where the coach watches/annotates in real time.
    No TRACE equivalent at all today, and it's genuinely cross-repo (coach
    side lives in the dashboard repo per `AGENTS.md`). This would need
    real-time infra (Supabase Realtime channels are already likely in use
    for chat — check `useDirectChat.ts`'s transport before assuming a new
    service is needed) plus UI on both repos. **Effort: L–XL,
    cross-repo, needs the dashboard repo's coach-side counterpart before
    this repo's half is even useful.**

---

## 3. Decisions that need you, before any Tier C work starts

Per this repo's scope (no coach-facing UI, native-only, offline-first via
the outbox, R2-only media, `AGENTS.md`'s hard git-local-only rule), these
aren't code decisions — they're product/business/infra calls:

1. **Food database provider** (#15/#16 upstream dependency) — Open Food
   Facts (free, smaller/community-maintained) vs. a paid API like
   Nutritionix (recurring cost, better coverage). Blocks barcode scanning
   and by extension AI photo meal logging.
2. **Whether an AI coach chat ("Roscoe"-equivalent) is in scope at all**
   (#17's conversational-AI subset) — this is the one item on this whole
   list with a real chance of feeling like it competes with the human coach
   TRACE is built around. Needs an explicit yes/no before any design work,
   not just an effort estimate.
3. **Wearable integration scope** (#18) — Apple Health + Health Connect
   alone (2 providers, both native-module work) vs. also Fitbit (3rd OAuth
   integration). Each is independently gate-able; recommend deciding
   provider-by-provider rather than as one bundled feature.
4. **"Train Together" real-time mode** (#19) — genuinely blocked on
   dashboard-repo work existing first; not actionable from this repo alone
   until that's scoped on the other side.
5. **Check-in templates** (#12) — same cross-repo split as above: template
   *authoring* is dashboard-repo scope, only the trainee-side *response*
   flow belongs here. Needs the dashboard repo's schema/RPC shape defined
   first (this repo can't invent the table shape unilaterally, same caution
   `AGENTS.md` gives for anything touching tables the dashboard repo owns).

---

## 4. Suggested next-session order (not prioritized by importance — by
what's safely startable without a cross-repo or external-vendor blocker)

Tier A items (#1–9) and Tier B items #10, #13 need nothing from outside this
repo and no new paid dependency — they're the safe next batch. Items
touching **live tables** (#2 warm-up flag, #6 net-carbs/sugar fields, #8
set-type) should get the same "verify column shape first" treatment the
pending migrations doc already gives migrations 002/004/007 — draft the
migration, don't apply it blind.

Everything in §3 stays blocked until you've made the calls listed there.
