# TRACE Client — Agent Instructions

## What this repo is

**This is the native client app only** — one repo of two. TRACE is a single-coach platform: every account created here is a trainee, auto-enrolled to the one coach configured in `platform_settings.default_coach_id` on the shared Supabase backend (see the coach dashboard repo's `supabase/migrations/20260803000000_platform_settings_and_rls_fix.sql`). There is no coach-facing UI in this repo — roster management, program authoring, and coach-side chat all live in the separate dashboard repo.

Expo HAS CHANGED — read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any native/config code; a lot of Expo API surface shifts between SDK versions.

## Git policy (hard rule)

**All commits stay local. Never push to GitHub, never create PRs, never run remote git actions** — even if a command or workflow suggests it. Commit locally on `master` after each verified unit of work. Only an explicit, in-the-moment user request overrides this.

## Commands

- Dev: `npm start` (Metro/Expo dev server — `npm run ios` / `npm run android` for a specific target)
- Test: `npm run test` (Vitest — pure logic only, see below)
- Typecheck: `npm run typecheck` (`tsc --noEmit`)

Run typecheck + test before every commit.

## Key constraints

- `set_logs.estimated_1rm` is a GENERATED column — never include it in write payloads (`toSetLogInsert` in `src/lib/outbox/mapSetLog.ts` already omits it; keep it that way).
- `set_logs.weight_kg` is kilograms; the UI logs pounds — convert via `src/lib/units.ts`.
- `workout_sessions` RLS allows INSERT + SELECT only (no owner UPDATE) — sessions are insert-once from the client; `ensureSessionQueued` in `src/lib/outbox/outboxStore.ts` already encodes this (no-ops once synced).
- The outbox (`src/lib/outbox/`) is the only offline persistence layer. Its public contract (`putOutboxItem`/`getAllOutboxItems`/`getUnsyncedItems`/`deleteOutboxItem`/`clearOutbox`) is backend-agnostic by design — `src/lib/outbox/db.ts` lazily loads the real `expo-sqlite` driver (`sqliteDriver.ts`) via dynamic `import()`, specifically so plain Node/Vitest never has to parse `expo-sqlite`'s React Native dependency chain. Do not turn that back into a static top-level import — it will break `npm run test`. Tests inject `memoryDriver.ts` via `__setOutboxDriver()` instead.
- Same lazy-import pattern applies to `src/lib/outbox/sync.ts`'s `flushOutboxLive()` — it dynamically imports `../supabase` rather than importing it at module scope, for the same reason (`supabase.ts` pulls in AsyncStorage/the URL polyfill, both RN-only).
- Media (video/photos) goes to Cloudflare R2 via presigned URLs, never into Postgres or Supabase Storage — see the dashboard repo's `docs/adr/0001-media-storage.md`. `src/lib/storage/policy.ts`'s `MEDIA_POLICY` must stay in sync with the `r2-presign` edge function's server-side copy (in the dashboard repo's `supabase/functions/`).
- This repo has no web target configured (no `react-dom`/`react-native-web`) — it's native-only (iOS/Android via Expo). Don't add web support without a deliberate reason; the coach-facing web surface lives entirely in the dashboard repo.
- `.env.local` holds `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` (gitignored via `.env*.local`) — same Supabase project as the dashboard repo.
