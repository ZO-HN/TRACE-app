# TRACE-client

Coach-first trainee app built with Expo, React Native and TypeScript. Repository: `ZO-HN/TRACE-app`; the local checkout is commonly named `TRACE-client`.

The companion [TRACE dashboard](https://github.com/ZO-HN/TRACE) owns **all** Supabase migrations and Edge Functions. Both apps target the same Supabase project; sessions are device-local and RLS controls access.

## Development

Install Node.js compatible with the Expo version in package.json, then run `npm ci`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Never put service-role keys in the app. Development auto-login is optional; do not build release bundles with its credentials configured.

```sh
npm start
npm run android
npm run ios
npm test
npm run typecheck
```

Trainees sign in and select a coach; existing invited trainees skip that selection. Coach accounts use the web dashboard. Missing configuration or inaccessible backend data must be investigated rather than treated as empty demo data.

## Data and offline support

Workout sessions, sets and nutrition entries are stored in SQLite before delivery. Queues are account-scoped; interrupted requests recover and retries are bounded. The global banner shows pending/failed entries and provides manual retry. Real workout content and profile data are cached per account for offline reopening. Download a workout once before using it offline; no placeholder exercise IDs are generated.

Session delivery requires TRACE's `sync_workout_session` RPC. Cardio writes only `cardio_entries`; steps write `wearable_biometrics.step_count`. Check-ins include `scheduled_for` and omit server-stamped `coach_id`. Cardio, steps, check-ins and media uploads currently require connectivity. Sync is foreground/app-resume driven, not an OS background service.

Shared programs are joined by token and copied with their private templates/items. A missing explicit workout is shown as unavailable rather than replaced with another workout.

## Schema and cross-repo checks

Keep the checkouts as sibling `TRACE` and `TRACE-client` directories, or set `TRACE_CLIENT_PATH` when running the commands below from TRACE:

```sh
npm run db:types
npm run db:types:check
npm run test:db
npm run test:contracts
```

`src/lib/database.types.ts` is generated from canonical migrations and must match the dashboard copy. Do not edit it manually. `docs/migrations-drafts/` is historical reference only: never apply those SQL files independently.

CI checks both repositories. The companion checkout defaults to `master`; workflow dispatch can select the coordinated branch/ref. Private companion repositories require a read-only `CROSS_REPO_READ_TOKEN` secret. No production credentials are used by the tests.

See [device and cross-repo QA](docs/qa/cross-repo-qa-checklist.md). Unit/SQL checks do not substitute for native SQLite, authentication, Realtime or R2 testing on staging.
