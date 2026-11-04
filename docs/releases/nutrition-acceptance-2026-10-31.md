# Nutrition UI review and acceptance evidence

Owner: TRACE maintainers. Status: source review plus attributed local evidence; native/staging acceptance remains open. Original review: 2026-10-31, 23:38 SGT. Parser follow-up reviews: 2026-11-01, 00:07 and 10:56 SGT. The filename retains the original evidence date. Requirements: [nutrition specification](../../../TRACE/docs/features/nutrition.md), [offline contract](../../../TRACE/docs/architecture/offline-sync.md), [mobile acceptance](../qa/mobile-acceptance.md).

## Snapshot and evidence boundary

TRACE HEAD: `06675347e6b13085750cf319c3b66ffde4a6954e`. TRACE-client HEAD: `774ab9df80d423d76f4d5d5c134ba731d10339a9`. Both checkouts contain substantial uncommitted work, including unrelated changes: 64 TRACE and 133 TRACE-client porcelain status entries at the review snapshot, before this document/index addition. Counts include untracked directories rather than every contained file. These results concern changing working copies, not immutable releases or deployed builds.

Reviewer inspected current source, diffs, test definitions and the completed TRACE — UI chat (`01a191d9-59fb-7570-8ce9-2a9347c94d04`). Reviewer did not run application tests/typecheck, operate the preview, or perform native/staging operations. Only this review document and its index link are reviewer-owned edits.

At the 2026-11-01 follow-up, both HEADs were unchanged; dirty status counts were 65 TRACE and 133 TRACE-client entries. Application/test code remained read-only; only this independent record was updated. Broader working-copy changes prevent treating unchanged HEADs as proof of unchanged application bytes.

## Evidence inspected

| Evidence | Executor and result | Boundary |
| --- | --- | --- |
| Focused tests, 2026-10-31 23:26 SGT | UI chat: 8 files, 47 tests passed | Command below; controlled React/native/API/storage dependencies, not real SQLite or authenticated transport |
| `npm run typecheck` | UI chat: exit 0, `tsc --noEmit` | Completed before the final comma-boundary parser adjustment; the subsequent 47-test run covers that adjustment, with no later typecheck result inspected |
| Full-suite attempt | UI chat reported 345 passing and one navigation timeout; navigation passed in focused rerun | Not a clean full-suite pass; reviewer did not rerun it |
| Web preview | UI chat reported 320/360px inspection, local save, totals, pending status and persistence after reload | Fixture web evidence; no independent reviewer interaction or native/backend acceptance |
| Production export | UI chat reported interruption | No successful export established |
| Documentation checker | UI chat previously passed; reviewer result recorded below | Links/navigation only |

Original focused command executed by UI chat from TRACE-client:

```powershell
npm test -- tests/components/nutritionQuickEntry.test.ts tests/components/foodLogging.test.ts tests/hooks/nutritionCatalog.test.ts tests/hooks/tracking.test.ts tests/lib/parseQuickEntry.test.ts tests/lib/mealSlots.test.ts tests/lib/mapQuickEntry.test.ts tests/lib/navigation.test.ts
```

### Parser follow-up evidence inspected on 2026-11-01

The UI chat's `nutrition-parser-verification.txt`, dated 2026-10-31 SGT, is stored at `C:\Users\imint\.codex\visualizations\2026\10\31\01a191d9-59fb-7570-8ce9-2a9347c94d04\nutrition-parser-verification.txt`. Reviewer read that record and the same chat's command outputs. The UI first reproduced signed-exponent suffix extraction with a failing regression, then recorded sequential passes: focused tests (4 files, 80 tests), `npm run typecheck`, full `npm test` (63 files, 394 tests; start 2026-10-31 23:56:52 SGT), documentation checker and scoped `git diff --check`. This later clean full-suite result supersedes the earlier timeout as the latest inspected UI run; it does not establish native or backend acceptance. Reviewer did not execute these checks.

Follow-up focused command executed by UI chat:

```powershell
npm test -- tests/lib/parseQuickEntry.test.ts tests/lib/mapQuickEntry.test.ts tests/components/nutritionQuickEntry.test.ts tests/hooks/tracking.test.ts
```

At the 00:07 review, reviewer recomputed SHA-256 for all seven paths in the UI verification record: parser, parser tests, tracking-hook tests, Quick Add component tests, Quick Add source, nutrition logging hook, and shared nutrition specification. All matched. Key historical fingerprints for that snapshot are:

| Source | SHA-256 |
| --- | --- |
| `src/lib/nutrition/parseQuickEntry.ts` | `f642dea5f79c7d1aaf4c57a3fa3d8545eb0a4a25e1e078109db70df7af267f52` |
| `src/components/nutrition/QuickAddTab.tsx` | `f81682793ea7a967e5848ea9dee21aa0e788395438b1abeccf2ad1a54e73aaa4` |
| `src/hooks/useNutritionLogs.ts` | `9172c41c05363379dd46f49ea890ae870c64e6af2b69989edd98dd893663a56e` |

The focused tests use the actual parser; hook tests use controlled API responses and in-memory outbox storage; component tests stub the logging hook. No browser/device/staging/export verification was added by this parser repair.

### Final duplicate-validation review: 2026-11-01, 10:56 SGT

The same UI verification file now contains an appended `2026-11-01: negative-duplicate validation-order repair` section. Reviewer inspected that section, the UI chat's completed report, final parser/Quick Add/hook source, regression definitions and owning specification. Both HEADs remain those recorded above; current dirty status counts are 75 TRACE and 134 TRACE-client entries. No application checks were executed by reviewer.

UI recorded the pre-repair regression failure for `20g protein, -25g protein` (45 passed, 1 failed; 00:22:43 SGT), followed by 98 passing focused tests across four files (00:23:31 SGT) and passing `npm run typecheck`. Its default-worker `npm test` was interrupted with exit 1 after slow execution reported workout-draft/navigation failures; no final failure diagnostics or suite summary were captured, so neither a pass nor a certified cause is claimed for that run. The subsequently completed `npm test -- --maxWorkers=2` passed 412 tests across 63 files (00:31:41 SGT; 165.25 seconds), with no source or timeout changes between these full-run attempts. These are attributed UI results inspected through its surviving record, not independently rerun checks. UI also recorded passing documentation and scoped whitespace checks.

Reviewer recomputed all seven SHA-256 values and matched the latest appended UI fingerprints. The final parser is `a6664dff8723df3ee538e3b9c7747847967c58c2e3747c3b12889bb53723f40e`; parser tests `a51e7f31ecf7bde4d025987218a8df9cda7337732a487077a7d2191434e015bf`; tracking-hook tests `46aaa54794aa7465dab07d51b61efcc6538d44eec71bf14d860249ec6a9d54d1`; component tests `5e3707b596a273aab99852c323f61c4c128d034f7f36491ea4f059be18b66bd8`; specification `d59f2910c3c7afd678c7026e83885a64d88b6d3fb35d9160f0f285c2cffbb64e`. Quick Add and logging-hook fingerprints remain unchanged from the earlier table.

Every recognized occurrence now passes format, finiteness and non-negative validation before first-value selection and calorie rounding. Invalid occurrences set an entry-wide error even after an earlier valid duplicate; supported positive duplicates retain the first value. Reviewed coverage includes all four fields, either duplicate order, mixed labels, negative dot/comma fractions, signed/unsigned exponents, malformed separator sequences and overflow. Quick Add and the hook continue to block parser errors before saving; input remains recoverable. **No further parser defect identified within the reviewed contract.** This conclusion is source/test-definition review plus attributed UI-run evidence, not exhaustive free-text fuzzing or native/backend acceptance; unsupported format choices are not additional defects. All non-parser gaps below remain open.

## Source review and actionable cases

- Daily hierarchy, meal-specific entry, parsed-value review, loading/error/empty states and pending/failed delivery copy match the focused specification. [Daily reads](../../src/hooks/useNutritionLogs.ts) page by local-day boundaries, scope remote rows and outbox records to the account, cancel obsolete reads, and deduplicate IDs. Tests inspect 501 entries and pending/server overlap; real backend pagination and account switching remain unexecuted by this reviewer.
- **Earlier parser findings resolved:** current [parser](../../src/lib/nutrition/parseQuickEntry.ts) captures the whole numeric-looking token, rejects signed/unsigned scientific notation and repeated/mixed separators through `ParsedMacros.error`, and preserves negative fractions for rejection. Inspected cases include `1e+3`, `1e-3`, `1e309`, `1,2,3`, and valid/invalid mixtures in either order, including a malformed later occurrence of a macro. These have regression coverage in the attributed passing UI checks. The old signed-exponent P2 is resolved, not an open defect.
- **Quick Add integration inspected:** `hasAnyMacro` rejects parser errors; [QuickAddTab](../../src/components/nutrition/QuickAddTab.tsx) displays that error, disables Save and retains text. The [logging hook](../../src/hooks/useNutritionLogs.ts) independently rejects invalid input before generating/enqueuing a record. Tests inspect these boundaries with controlled dependencies. Plain dot/comma decimals and a leading plus remain supported; rejecting leading-decimal shorthand or scientific notation is an explicit format choice, not a regression.
- **Later-negative-duplicate P2 resolved at the 10:56 follow-up:** the 00:07 source review identified that `20g protein, -25g protein` and `150 kcal, -0.1 kcal` ignored a later negative duplicate. UI subsequently reproduced the first example in a failing test. Current source validates every occurrence's sign before duplicate selection/rounding and sets an entry-wide error; parser/hook/component regressions cover rejection and retained input. The earlier reproduction is retained as historical evidence, not a current defect. Reviewer did not execute application tests or alter application/test files.
- **Saved-meal retry boundary:** [MealTemplatesTab](../../src/components/nutrition/MealTemplatesTab.tsx) awaits each local save and retains completed-item counts in a component ref. The inspected test proves retry of remaining items while mounted. Switching tabs, closing or restarting discards the count; retrying the whole meal can repeat already saved items with new IDs. This improves the prior fire-and-forget path but is not restart-safe batch delivery. Test second-item failure followed by tab switch/reopen; any durable batch solution needs separately assigned scope.
- **Existing aggregate-write gap:** [template creation](../../src/hooks/useMealTemplates.ts) still inserts parent then items separately. Item failure leaves a parent; retry uses a fresh parent ID. Transactional, ownership-checked, idempotent creation is separate backend work, not implemented by the UI change.
- **Date boundary:** [outbox enqueue](../../src/lib/outbox/outboxStore.ts) captures the timestamp before delivery; retries preserve that payload. Display grouping uses the current device timezone, and [NutritionLogger](../../src/components/NutritionLogger.tsx) has no explicit midnight clock subscription. Verify idle-midnight and background/resume behavior. Original local date across travel remains an explicit policy/schema decision, not verified functionality.
- **Existing catalog scale gap:** [catalog reads](../../src/hooks/useNutritionCatalog.ts) remain unpaginated. Loading/error/account-response handling improves; completeness beyond the backend row limit and catalog search remain separate scope. Weekly/recent insights also retain bounded-history reads; whole-day pagination does not establish complete insight history.

## Required acceptance before a broader claim

1. On intended Android/iOS builds: save offline, force quit/reopen, reconnect, verify one server row and correct authorized coach summary. Include lost responses, disk failure, exhausted retry, account switch and unchanged historical values after catalog edits.
2. Verify 501+ entries against real day bounds, later-page failure, server echoes, late account responses, midnight, timezone changes and saved meal-slot restoration. Reject unrelated coach/trainee reads through real Auth/RLS.
3. Verify saved-meal partial failure in place and after navigation/restart; record the partial-success boundary. Inject template-child failure separately; do not certify atomic creation.
4. Check small-screen/native keyboard avoidance, multiline/decimal input, template-name footer, large text, screen-reader labels/announcements, meal expansion, tab selection and web keyboard focus. Camera/microphone/provider behavior remains separate unverified integration evidence.

Record device/OS/network, exact build/source state and backend versions with observed results. No native-device, staging, production deployment, or full release readiness is certified here. This review adds no schema/deployment requirement; any later backend repair follows the shared rollout contract.

Reviewer executed `node ../TRACE/scripts/check-documentation.mjs` from TRACE-client on 2026-10-31: exit 0; 44 Markdown files, 319 local links, all reachable from the shared index. This establishes documentation navigation only.

After the 2026-11-01 follow-up update, reviewer executed the same documentation command: exit 0; 45 Markdown files, 342 local links, all reachable from the shared index. The shared documentation inventory includes other chats' changes. No application suites, browser/device sessions or exports were run by this reviewer.

After the 2026-11-01 10:56 review update, reviewer executed the same documentation command: exit 0; 47 Markdown files, 360 local links, all reachable from the shared index. Only this independent acceptance record was edited during this follow-up; application/tests and other workers' evidence were read-only.
