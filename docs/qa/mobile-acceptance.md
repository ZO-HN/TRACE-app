# Mobile acceptance

Status: maintained checklist; not executed by documentation consolidation. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: earlier mobile QA, Android evidence, current code and [diagnosis](../../../TRACE/docs/qa/diagnosis-2026-10-31.md).

## Preparation

Use the intended native build on dedicated staging accounts following [test login](test-account.md). Run tests/typecheck and [shared acceptance](../../../TRACE/docs/qa/cross-app-acceptance.md). Login-free [preview](../development/local-preview.md) is only a fixture. Record device/OS/network, app revisions/dirty state, backend migrations/functions and account roles/coach relationships.

## Device-specific checks

- [ ] Navigate every intended route, back/tab transitions, retry sign-out, and switch accounts. Reject stale responses and preserve the correct user's data.
- [ ] Complete offline workout/nutrition force-quit/reopen/retry and storage-failure cases from shared acceptance. Verify real SQLite, not only in-memory queue tests.
- [ ] Recover stable session/set drafts; finish explicitly; rest timers reconcile wall-clock time after background/resume. Foreground sync is not guaranteed background delivery.
- [ ] Nutrition dates survive midnight/retry; server echoes deduplicate; full-day totals include all entries. Verify invalid/fractional meal slots, extra-slot persistence and actual correction/edit/delete behavior; unmet cases remain gaps.
- [ ] Favorites/templates/custom foods expose rejected reads/saves and partial failure; repeated taps/retries do not duplicate successful items.
- [ ] Workout library search includes collapsed folders; empty folders remain usable; rename/move/delete confirm the intended operation and preserve workouts after folder deletion.
- [ ] Steps/cardio/water/sleep/bodyweight persist only after successful writes. Check finite values, duration precision, units, target dates, and failed-fetch recovery.
- [ ] Weight accepts intended dot/comma decimals in both units; verify past dates, invalid/future dates, replacement confirmation, note limits and history refresh. Manual dated entry is not bulk import.
- [ ] Camera/photos/microphone/files handle permission refusal, selection cancellation and initiating errors; upload and authorized playback reopen correctly for supported kinds.
- [ ] Check-ins render required types/primary-secondary muscles/null exercises correctly; standalone versus per-set media stays distinct.
- [ ] Chat has populated history and pagination; notifications honor quiet/mute settings, register real tokens and open intended screens from background/terminated state.
- [ ] AI setup/errors/credential switching/photo review/transcription follow [AI acceptance](../../../TRACE/docs/features/ai.md) on actual configured models/devices.
- [ ] Verify keyboard/decimal entry, safe areas, wrapped exercise/RPE labels, readable tab states, touch targets and long-list responsiveness on small/large devices.
- [ ] Verify populated follow/roster/leaderboard privacy flows across accounts. Gyms, measurements, wearable imports and inbox/feed placeholders remain explicit until implemented and accepted.
- [ ] Repeat platform-specific cases on intended Android and iOS targets; an Android web export does not establish either native platform.

Record pass/fail/not run with observed behavior and errors using the [release template](../../../TRACE/docs/templates/release.md). Build output and [prior Android evidence](../releases/android-testing-baseline.md) do not sign off a new working tree.
