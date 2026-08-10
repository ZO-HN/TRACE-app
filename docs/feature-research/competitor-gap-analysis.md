# Competitive Feature Gap Analysis — TRACE vs. Top 5 Fitness Apps

**Purpose**: a research-only survey of features popular fitness apps have that
TRACE doesn't, for you to review and decide what (if anything) to integrate.
No recommendations or priority ranking are included — that's a call for a
human to make after reading the risk/benefit for each.

**Apps researched**: WHOOP (recovery/wearables), Strava (social/cardio),
MyFitnessPal (nutrition), Hevy (strength logging), Fitbod (AI workout
generation) — chosen as the most relevant blend for a strength + nutrition +
coached-fitness app like TRACE.

**Method**: web search, current as of Aug 2026. A feature is only listed
here if a search result explicitly confirmed the app has it — anything
unverified was dropped rather than guessed at.

**TRACE's current feature set** (for reference — what this was diffed
against): workout logging (sets/reps/weight/RPE, rest timer, form-check
video), workout templates/folders, offline-first outbox for logging without
connectivity, bodyweight tracking (history, moving average, reminders),
nutrition logging (free-text quick-add, Favorites/Custom/Supplements/Meal
templates, macro progress bars, meal slots), cardio tracking (custom
exercise catalog, per-day duration entries, weekly stats, PRs), sleep
tracking (bedtime/wake/quality, rolling averages), a rule-based (non-AI)
workout generator, personal records + muscle-volume analytics, per-exercise
leaderboards within a coach's roster, a Social tab (Feed/Connected/Discover
— Feed is currently an empty-state stub with no real post model), 1:1 chat
with the assigned coach, and push notifications.

---

## 1. Workout Logging

### Weight Plate Calculator
- **What**: Shows which plates to load per side to hit a target weight.
- **Source**: Hevy — built-in, kg/lb, customizable plates and bar weight.
- **Benefit**: Removes mental math mid-set, useful for coach-programmed
  weights TRACE already surfaces.
- **Risk**: Low complexity, but plate/bar inventories vary per gym — needs a
  per-user settings screen (available plates, bar weight) or it gives wrong
  advice. Pure local UI logic, no sync/outbox involvement.
- **Effort**: S

### Superset / Drop-set Grouping with Smart Auto-Scroll
- **What**: Group exercises as a superset; UI auto-advances to the next
  exercise when a set is marked done.
- **Source**: Hevy Pro — "Smart Superset Scrolling."
- **Benefit**: Supersets are common in coach programming; TRACE's logging
  appears to be linear per-exercise today.
- **Risk**: Touches the core `set_logs`/template data model (needs a
  grouping key) and rest-timer logic (rest applies per superset round, not
  per set). Real rework of the active-workout screen, not a bolt-on.
- **Effort**: M

### Progress Photos
- **What**: In-app photo capture/storage tied to a timeline.
- **Source**: Hevy — save/share progress photos.
- **Benefit**: Common trainee request; pairs naturally with the existing
  bodyweight history table.
- **Risk**: Must follow this repo's existing R2-presigned-URL media policy
  (`src/lib/storage/policy.ts`), not ad hoc storage. Privacy-sensitive
  (often revealing photos) — needs explicit access control (trainee-only vs.
  coach-visible) and real deletion handling, not just a soft flag.
- **Effort**: M

### Monthly/Periodic Training Reports
- **What**: Auto-generated summary comparing the month's volume, sets, time
  trained, and PRs vs. the prior period.
- **Source**: Hevy — monthly report feature.
- **Benefit**: Packages TRACE's existing PR/muscle-volume analytics into a
  periodic digest for trainee motivation and coach check-ins.
- **Risk**: Mostly aggregation over data TRACE already has — low data-model
  risk, but period boundaries need careful definition, and live computation
  could get expensive at scale vs. pre-aggregation.
- **Effort**: S–M

---

## 2. Nutrition

### Barcode Scanner for Food Logging
- **What**: Scan a product barcode to pull nutrition facts instantly.
- **Source**: MyFitnessPal — camera-based, Premium-gated since 2023.
- **Benefit**: TRACE's quick-add is free-text parsing only; barcode
  scanning is faster/more accurate for packaged food and is close to
  table-stakes for nutrition tracking.
- **Risk**: Needs a barcode→nutrition database — either a paid API (e.g.
  Nutritionix) or a free-but-less-complete one (Open Food Facts). This is
  an **ongoing data-licensing/maintenance cost**, not a one-time build.
  Camera permissions in Expo also needed.
- **Effort**: M–L

### AI Photo-Based Meal Logging ("Meal Scan")
- **What**: Photograph a plate; AI estimates foods and calories.
- **Source**: MyFitnessPal — added 2026 after acquiring Cal AI, alongside a
  Voice Log feature.
- **Benefit**: Large friction reducer vs. TRACE's free-text parser,
  especially for home-cooked/unpackaged meals.
- **Risk**: Requires an LLM vision API call per log — real per-request cost
  and latency, and it needs connectivity (conflicts with the outbox's
  offline-first design for this one write path). Accuracy is inherently
  approximate; could mislead trainees on macros if not clearly labeled as
  an estimate. **Highest ongoing-cost feature on this list** — inference
  spend scales with DAU.
- **Effort**: L–XL

### Recipe Importer from URL
- **What**: Paste a recipe link; app parses ingredients/nutrition
  automatically.
- **Source**: MyFitnessPal — pulls from blogs/recipe sites/social media.
- **Benefit**: Extends TRACE's existing Custom Foods/Meal Templates without
  manual macro entry for home-cooked meals.
- **Risk**: Web scraping is brittle (schema.org Recipe markup isn't
  universal), multi-ingredient nutrition math has real edge cases (unit
  conversion, serving division), and scraping third-party sites is a
  legal/ToS gray area.
- **Effort**: M

---

## 3. Recovery / Wearables

### Daily Recovery Score (HRV + Sleep + Strain composite)
- **What**: A single morning readiness score (0–100%) blending overnight
  HRV, resting HR, and sleep quality.
- **Source**: WHOOP — core differentiator, computed from continuous
  wearable data.
- **Benefit**: TRACE already has sleep tracking; a recovery score would tie
  sleep + bodyweight + training load into one actionable number for the
  coach relationship.
- **Risk**: A phone alone can't measure HRV reliably — this needs either
  (a) a real wearable integration (HealthKit/Health Connect or third-party
  device APIs: WHOOP, Oura, Garmin — each its own auth/sync/data-freshness
  problem), or (b) a crude self-report proxy that won't be credible as a
  "recovery score."
- **Effort**: XL (real) / M (crude proxy)

### AI Daily Coaching Recommendation
- **What**: Given a recovery score, suggests a training intensity/strain
  target for the day.
- **Source**: WHOOP — Strain Target / AI Coach.
- **Benefit**: Could complement TRACE's rule-based generator with
  recovery-aware intensity suggestions.
- **Risk**: Fully dependent on the recovery-score feature existing first.
  Also risks appearing to give autonomous training advice that conflicts
  with the human coach's programming — needs careful framing to not
  undercut TRACE's single-coach model, which is central to the product.
- **Effort**: L (on top of recovery score)

### Wearable Device Integration (Apple Health / Health Connect / third-party)
- **What**: Auto-pull steps, heart rate, sleep, workouts from Apple Watch,
  WHOOP, Garmin, Fitbit, etc.
- **Source**: Fitbod (Apple Health, Apple Watch, Strava, Fitbit); WHOOP is
  wearable-first by nature.
- **Benefit**: Removes manual entry for sleep/cardio/steps — TRACE's
  biggest current friction point for those modules (all currently
  manual-entry only).
- **Risk**: Each provider is a separate SDK/OAuth integration with its own
  data model and rate limits. HealthKit/Health Connect need native module
  work beyond pure Expo managed workflow (config plugins or a dev client).
  This is **inbound** sync, a different problem than the outbox's
  outbound-write design — real ongoing maintenance as OS APIs shift.
- **Effort**: L–XL per provider

---

## 4. Social

### Activity Feed with Kudos/Likes and Comments
- **What**: Scrollable feed of followed users' activities with lightweight
  "kudos" (like) and comments.
- **Source**: Strava — core product; "Kudos Bombs" let a user kudos up to
  50 people at once.
- **Benefit**: This is the single most direct gap — TRACE's Social/Feed tab
  is explicitly an empty-state stub with no real post model today. This
  would give it one.
- **Risk**: Large multi-part build: shared-post data model, privacy
  controls (coach-only vs. roster vs. public visibility per post),
  moderation for comments, notification fan-out. Real scope-creep risk —
  "just add a feed" tends to balloon into its own subsystem.
- **Effort**: XL

### Segments / Route Leaderboards with "Crown" Competition
- **What**: Named course segments where every user's effort is timed and
  ranked (KOM/QOM-style).
- **Source**: Strava — 30M+ segments worldwide, core gamification loop.
- **Benefit**: TRACE already has per-exercise leaderboards; a segment
  concept could extend that pattern to cardio.
- **Risk**: Only meaningful with GPS-tracked routes — TRACE's cardio
  tracking is duration-entry based, not GPS. This means adding GPS route
  recording first: background location permissions, battery drain, map
  rendering, route-matching to detect "same segment." Not a bolt-on to
  existing cardio tracking — a new capability underneath it.
- **Effort**: XL

### Clubs/Groups
- **What**: User- or coach-created groups aggregating members' activities,
  with group challenges.
- **Source**: Strava — club membership is in the free tier.
- **Benefit**: Maps naturally onto a single coach's roster as an implicit
  "club," reinforcing community without opening up to full public social.
- **Risk**: Smaller if scoped to "your coach's roster" (which TRACE already
  models); larger if opened to arbitrary user-created groups. Still needs
  membership models, activity aggregation, and permission boundaries.
- **Effort**: M (roster-scoped) / L (open groups)

---

## 5. AI / Automation

### AI-Generated Adaptive Workouts
- **What**: Exercises/sets/reps/loads generated per-session from recent
  history, stated recovery, and available equipment — not a static
  template.
- **Source**: Fitbod — core mechanism, balances "muscle freshness" and
  progression algorithmically.
- **Benefit**: TRACE's generator is explicitly rule-based/non-AI today —
  direct capability gap vs. a category leader.
- **Risk**: Most likely feature on this list to create **product tension**
  with TRACE's core identity as a human-coach-programmed platform — an AI
  generator competing with the coach's authored programs needs careful
  scoping (e.g. only for unprogrammed days) so it doesn't undercut the
  coach relationship. Also needs a real fatigue/freshness model per muscle
  group, a nontrivial algorithm design problem even before any ML/LLM use.
- **Effort**: L–XL

### Muscle Recovery/Fatigue Heatmap
- **What**: Visual map of which muscle groups are fresh vs. fatigued based
  on recent volume and time since last worked.
- **Source**: Fitbod — feeds its workout generator.
- **Benefit**: TRACE already computes muscle-volume analytics; a fatigue
  overlay is a natural extension usable standalone (a read-only insight)
  without needing full AI generation.
- **Risk**: The fatigue-decay formula (how long a muscle "needs" to
  recover) is a judgment call with no universally agreed model — risk of
  feeling arbitrary to serious lifters unless the assumptions are
  transparent. Lower engineering risk than full AI generation since it's
  derived from data TRACE already has (`set_logs`).
- **Effort**: M

---

## 6. Analytics / Other

### Sleep Need / Sleep Debt Modeling
- **What**: Instead of raw duration, computes a personalized "sleep need"
  from recent strain and rolling sleep debt.
- **Source**: WHOOP — described as where it differentiates most clearly.
- **Benefit**: TRACE's sleep tracking currently shows simple rolling
  averages; a debt/need model is a meaningfully deeper layer on data
  already collected, with no new integration required.
- **Risk**: Self-contained (pure computation over existing sleep + workout
  data), but WHOOP's algorithm is proprietary and can't be copied — this
  means designing an original, simpler heuristic and being explicit with
  users that it's an estimate, not clinical-grade.
- **Effort**: M

### Voice Logging
- **What**: Speak a food or set entry instead of typing/tapping.
- **Source**: MyFitnessPal — "Voice Log," added 2026 alongside Meal Scan.
- **Benefit**: Faster hands-free logging mid-workout or mid-meal-prep;
  applies to both nutrition quick-add and set logging.
- **Risk**: Needs speech-to-text feeding the same free-text parsing TRACE's
  quick-add already does — the real new surface is the STT integration
  (on-device via Expo's speech APIs, or cloud STT with cost/latency/offline
  tradeoffs). Given the outbox's offline-first design, on-device STT
  specifically matters if this needs to work without connectivity.
- **Effort**: M

---

## Summary Table

| Feature | Category | Source app(s) | Effort |
|---|---|---|---|
| Weight plate calculator | Workout Logging | Hevy | S |
| Superset/drop-set grouping | Workout Logging | Hevy | M |
| Progress photos | Workout Logging | Hevy | M |
| Monthly training reports | Workout Logging | Hevy | S–M |
| Barcode scanner | Nutrition | MyFitnessPal | M–L |
| AI photo meal logging | Nutrition | MyFitnessPal | L–XL |
| Recipe URL importer | Nutrition | MyFitnessPal | M |
| Daily recovery score | Recovery/Wearables | WHOOP | XL (real) / M (proxy) |
| AI daily coaching recommendation | Recovery/Wearables | WHOOP | L |
| Wearable device integration | Recovery/Wearables | Fitbod, WHOOP | L–XL per provider |
| Activity feed w/ kudos & comments | Social | Strava | XL |
| Segments/route leaderboards | Social | Strava | XL |
| Clubs/groups | Social | Strava | M–L |
| AI adaptive workout generator | AI/Automation | Fitbod | L–XL |
| Muscle fatigue heatmap | AI/Automation | Fitbod | M |
| Sleep need/debt modeling | Analytics | WHOOP | M |
| Voice logging | Analytics/Other | MyFitnessPal | M |

**No priority ranking is included by design** — this is the raw research
set for you to review and decide what (if anything) to integrate.
