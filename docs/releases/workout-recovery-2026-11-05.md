# Repeated exercise workout recovery verification

Status: local source and automated mobile test verification; native/device acceptance remains open. Verified 2026-11-05, 16:21 SGT. Scope: restore locally queued set logs into the correct occurrence when a workout repeats the same exercise. This does not certify synchronization with a live backend.

## Evidence

- Checkout: `TRACE-client` at `9b123120bb8564e2522c1c15bc4acf4d78987449`; working changes are limited to the component regression and a required typed fixture correction.
- Focused: `npm test -- tests/lib/activeDraft.test.ts tests/components/workoutDraft.test.ts` — 2 files, 30 tests passed.
- Typecheck: `npm run typecheck` — passed.
- Full mobile suite: `npm test -- --maxWorkers=2` — 63 files, 434 tests passed.
- Component regression covers ambiguous repeated legacy matches: logger displays a recovery error, exposes no set completion action, and retains the cached draft and queued item.

## Source fingerprints

SHA-256 values at verification time:

| File | SHA-256 |
| --- | --- |
| `src/lib/workout/activeDraft.ts` | `BCBEDD001AC46A6066C331F6589B212AFA06F6280CE9E6E05404D5648CFBA84B` |
| `src/components/GymLogger.tsx` | `87589E28F20CFD9C68572B6C04AF356F190FCEBB58C82B96A1BEAEC9C6887384` |
| `tests/lib/activeDraft.test.ts` | `2BCF23FF81EE47D0E1CFC8F10BC3BF37D2C0D110960D07E06AAE3CFA45092211` |
| `tests/components/workoutDraft.test.ts` | `972DEBFA898AE95ED7CD04EFF48DC26CD83665AB659476746D6E3CA58E3494C6` |

## Acceptance boundary

The automated tests use a memory outbox driver and mocked AsyncStorage; they verify the recovery function and logger boundary only. No web preview or browser interaction, native device, SQLite kill/reopen, authenticated staging account, or live synchronization was exercised. Verify those paths against the intended native build and staging backend before treating device recovery or delivery as accepted.
