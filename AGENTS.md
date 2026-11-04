# Working in TRACE-client

This repository owns the Expo/React Native trainee app, local persistence, and device integrations. TRACE owns canonical SQL, shared backend functions, and cross-app contracts. Start with [mobile documentation](docs/README.md); sibling checkouts are the local convention.

## Read by change

- Feature behavior: [shared feature specifications](../TRACE/docs/features/README.md) and [current diagnosis](../TRACE/docs/qa/diagnosis-2026-10-31.md).
- Supabase writes/auth: [shared contract](../TRACE/docs/architecture/client-contract.md). Coordinate schema changes in TRACE; generate both type files there.
- SQLite, sync, account changes: [offline contract](../TRACE/docs/architecture/offline-sync.md).
- AI: [current provider setup](docs/development/ai-copilot.md) and [AI specification](../TRACE/docs/features/ai.md). Shared server-side AI is proposed, not installed.
- Media: [media contract](../TRACE/supabase/functions/r2-presign/README.md).
- Release/device work: [mobile acceptance](docs/qa/mobile-acceptance.md) and [mobile release procedure](docs/operations/mobile-release.md).

## System constraints

- Await durable local persistence before reporting workout/nutrition success. Preserve stable UUIDs, account ownership, pending records, and revision-aware acknowledgement.
- Keep delivery scoped to the captured authenticated trainee; preserve parent-before-child ordering. Resume-driven sync is not guaranteed OS background delivery.
- Separate loading, empty, unavailable, and failed states. Preserve recoverable input after failed writes; guard stale account responses and repeated taps.
- Keep backend/AI service credentials out of public app configuration. The current BYO-key mode has documented device-global storage limitations; account isolation must be addressed before claiming it.
- Use real catalog IDs and explicit unavailable states for missing assignments. Preserve unit/date semantics and recorded values.
- Preserve unrelated working-tree edits. Keep product/scope decisions explicit rather than inferring requirements from competitor material.

## Verification and completion

Run `npm test` and `npm run typecheck` for application changes. For shared contract changes, also run TRACE's database/type/contract checks against this checkout. Run `node ../TRACE/scripts/check-documentation.mjs` for documentation changes. Use [workflow](../TRACE/docs/development/workflow.md) for acceptance and reporting.

Use dedicated staging fixtures and [test-account setup](docs/qa/test-account.md) for authenticated QA. Preview, mocked providers, web exports, and APK creation do not establish native SQLite durability, real sign-in, private media access, push delivery, or live inference. Record those checks independently.
