# nut-ai Integration Handoff — 2026-08-12

Scoping doc for whoever (human or agent) picks up nutrition photo-scanning
next. This is a **plan for what to build**, not a build log — pair it with
[`docs/handoff/trace-client-handoff-2026-08-10.md`](trace-client-handoff-2026-08-10.md)
for the current state of the nutrition tab this integration extends.

---

## 1. Why this handoff exists

This session produced an architecture map of TRACE-client (published as an
artifact, not checked into this repo) and, separately, explored a sibling
repo at `C:\Users\imint\nut-ai\` — an open-source Expo/RN app that already
solves AI photo-based calorie tracking. The two are related enough, and
nut-ai's solution clean enough, that it's worth documenting a path to reuse
its logic rather than reinventing gram-estimation and food-matching from
scratch.

**Governing principle: TRACE's architecture stays primary.** nut-ai is a
donor of proven, portable *logic* — gram reconciliation, food-name
resolution, sanity clamping, confidence bands, adaptive-goal math — not a
donor of app structure. Nothing about TRACE's outbox pattern, its
Supabase-backed multi-user model, its use of Zustand for the outbox only,
or its expo-router navigation changes. nut-ai's pure-logic packages plug
into TRACE's existing seams (hooks, `src/lib/`, the outbox, the
mapper-per-write-path pattern already used by
`src/lib/outbox/mapSetLog.ts`) the same way any other feature in this
codebase gets built.

The AI/vision-provider call itself (which model, which API key handling)
is **out of scope for this doc** — that layer is already being built
separately elsewhere in the app. This doc is only about the deterministic
math and data modeling nut-ai has already solved, and where it lands once
a payload exists to feed it.

---

## 2. What nut-ai actually does (for context)

`nut-ai` is a monorepo: `apps/mobile` (its own Expo app) plus ~11
RN-free, pure-TypeScript `packages/*` (enforced by a purity lint script in
that repo). Its core idea: a vision LLM only *perceives* — it identifies
food items, form, and size cues, returned as strict JSON validated against
a Zod schema (`packages/core-schema/src/vision-payload.ts`). It never
outputs a calorie number itself. Separate deterministic packages then
compute grams and look up real nutrient values. Status there: alpha —
photo scan → review → correct → log → track works; on-device inference is
not shipped.

---

## 3. What's being adopted, and what it replaces/extends in TRACE

| nut-ai package | Adopted as | Notes |
|---|---|---|
| `core-schema` (`VisionPayloadZ`) | Target contract | Not copied verbatim — this is the *shape to match* for whatever TRACE's own AI call returns, since TRACE owns its own provider integration. |
| `gram-engine` | Net-new capability | Reconciliation ladder, density/volume/yield tables. Nothing in TRACE does this today — this is the actual value-add of the whole integration. |
| `resolver` | Net-new, needs adapting | Food-name → DB row matching (FTS5 + six-signal scoring). Must be re-pointed at whatever food data source TRACE decides on — **open decision, not resolved here** (bundled dataset vs. a Supabase table). |
| `clamp` | Net-new, cheap | Atwater sanity check on model output. Pure function, ports directly. |
| `confidence` | Net-new, cheap | Error-band / uncertainty propagation — lets TRACE show a scanned entry as high/medium/low confidence instead of presenting AI output as fact. Pure function, ports directly. |
| `totals` | Extends existing | Macro reconciliation + rounding + a deterministic health-score formula. Extends the nutrition summary, doesn't replace anything currently there. |
| `goals` | **Flagged — needs a decision** | BMR/TDEE (Mifflin-St Jeor, Katch-McArdle) + adaptive EWMA targets. TRACE nutrition today shows 0%/hardcoded goals with no goal-setting feature at all (per the 2026-08-10 handoff). Before wiring this in, check whether any coach-assigned targets exist or are planned in the dashboard repo — this either supplements or competes with those, and that has to be decided, not assumed. |

**Explicitly not adopted:** nut-ai's local-only SQLite/no-server model, its
account-less design, its own app shell/navigation/screens. None of that
fits a coached, multi-user, Supabase-backed platform. Calling this out
directly rather than silently omitting it, since it's the part of nut-ai's
architecture most likely to tempt a shortcut (e.g. "just bundle its
SQLite DB") that would fight this repo's existing patterns.

---

## 4. Where it lands in TRACE's existing structure

```
src/lib/nutriscan/            (new)
  core-schema.ts / gram-engine/ / resolver/ / clamp.ts / confidence.ts / totals/ / goals/
                               vendored + adapted from nut-ai's packages/*.
                               Data-access seams made dependency-injected,
                               following the pattern already used by
                               outbox/driver.ts and storage/uploadMedia.ts —
                               NOT nut-ai's SQLite-specific implementations.

src/lib/nutrition/mapNutriScan.ts   (new)
                               Maps ported-package output → nutrition_logs
                               insert payload. Respects the existing
                               no-meal_slot-column approximation already
                               documented in src/lib/nutrition/mealSlots.ts.

app/nutrition/scan.tsx        (new route)  scan → review/correct → log
app/nutrition/review.tsx      (new route)  reuses useMediaUpload, MediaViewer
                               — no new upload mechanism, same R2 path
                               form-checks already uses.

src/hooks/useNutritionTotals.ts   (new, alongside useNutritionLogs)
src/hooks/useAdaptiveGoals.ts     (new, alongside useLogFood)
```

Writes go through the outbox like every other write in this app — no
bespoke sync path for scanned meals.

---

## 5. Sequencing / dependencies

- The in-progress AI/API layer (being built separately, elsewhere in the
  app) needs to exist and produce a payload TRACE can map into something
  `gram-engine`/`resolver` can consume.
- The food-database decision (bundle a dataset vs. query a Supabase table)
  blocks `resolver` specifically — **this is the first open question to
  resolve**, before porting that package.
- None of the 7 pending nutrition-adjacent migrations (see the
  2026-08-10 handoff §3, especially draft `003` Nutrition Extensions) need
  to be applied first. This integration writes to the already-live
  `nutrition_logs` table, same as manual entry does today.

---

## 6. Suggested build order

1. Vendor + adapt the pure packages first (`clamp`, `confidence`,
   `gram-engine`, `totals` — testable in isolation, no UI, no AI call
   needed to verify the math).
2. `resolver`, once the food-database decision is made.
3. `mapNutriScan.ts` mapping layer.
4. Scan/review screens (`app/nutrition/scan.tsx`, `review.tsx`).
5. Wire `totals`/`goals` into the nutrition dashboard via the new hooks.
6. Port relevant nut-ai tests (property-based + corpus-style) into
   `tests/lib/`, following this repo's pure-logic-only testing convention
   from `AGENTS.md`.

---

## 7. Open decisions (flagged, not resolved here)

1. **Food-database source for `resolver`** — bundle a dataset in the app,
   or back it with a Supabase table?
2. **Adaptive goals vs. coach-assigned targets** — does `goals`'s
   EWMA-based adaptive target supplement or replace anything coach-set in
   the dashboard repo? Requires checking that repo before deciding.
3. **Coach visibility** — do `goals`/`totals` outputs (adaptive targets,
   health score) stay client-local, or should the coach dashboard see
   them too? Affects whether this needs any new Supabase columns beyond
   `nutrition_logs`.

---

## 8. Verification status

This is a planning/handoff document — no code was written, no tests run.
Package boundaries described above were verified by direct exploration of
`C:\Users\imint\nut-ai\` this session (its `packages/*` purity is enforced
by that repo's own `scripts/check-node-purity.mjs`, confirming these are
genuinely portable). Checked against this repo's constraints in
`AGENTS.md` (generated `estimated_1rm` column, outbox lazy-import
requirement, R2-not-Postgres media policy) — nothing above conflicts with
any of them.
