# TRACE-client: trainee mobile app

Expo/React Native/TypeScript trainee app for TRACE fitness coaching. Repository identity: `ZO-HN/TRACE-app`; local checkout: `TRACE-client`. Maintained by TRACE maintainers; documentation updated 2026-10-31.

[Mobile documentation](docs/README.md) · [Agent instructions](AGENTS.md) · [Whole-project documentation](../TRACE/docs/README.md) · [Coach repository](https://github.com/ZO-HN/TRACE)

## Run locally

Use a Node version compatible with Expo and CI (currently 24), then `npm ci`. Create git-ignored `.env.local`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Run `npm start`, `npm run android`, `npm run ios` on the appropriate host, or `npm run web`. Use `npm test` / `npm run typecheck` for local application checks. Keep service-role/storage/provider service secrets out of public app configuration. Real login uses a dedicated [test trainee](docs/qa/test-account.md); [login-free preview](docs/development/local-preview.md) blocks cloud writes/sync and is only a development fixture.

## Data and backend ownership

TRACE owns all canonical migrations and shared functions. Both apps target one Supabase project with independent sessions and backend-enforced permissions. [Offline contract](../TRACE/docs/architecture/offline-sync.md) covers SQLite workout/nutrition writes, stable IDs, account-scoped queues and foreground/resume delivery. First-time workout download and cardio/steps/check-ins/media require connectivity. Failed local work remains available for retry.

Shared types are generated from TRACE with `npm run db:types`; `db:types:check`, `test:db`, and `test:contracts` run there against the matching mobile checkout. Keep siblings `TRACE` / `TRACE-client` or set `TRACE_CLIENT_PATH` in TRACE. Read [shared contract](../TRACE/docs/architecture/client-contract.md) before changing payloads or permissions.

## Build, verify and release

Use [mobile release](docs/operations/mobile-release.md) for Android testing builds/downloads and production gates, [mobile acceptance](docs/qa/mobile-acceptance.md) for device checks, and [cross-app rollout](../TRACE/docs/operations/cross-app-rollout.md) for backend compatibility. Prior [Android evidence](docs/releases/android-testing-baseline.md) is dated, not a current download or production sign-off.

Current mobile AI setup is [documented separately](docs/development/ai-copilot.md); shared server AI is proposed. Inspect the [current diagnosis](../TRACE/docs/qa/diagnosis-2026-10-31.md) before declaring features complete. Run `node ../TRACE/scripts/check-documentation.mjs` for documentation links/navigation.
