# Mobile build and release

Status: maintained procedure; store/native acceptance remains gated. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: current build/download scripts, app configuration and diagnosis D08/D21/D24.

## Build a testing artifact

Install the compatible Android SDK/JDK and dependencies. Run tests/typecheck; from TRACE-client use `npm run android:apk`, then `npm run android:download` for the narrow same-network transfer page. Use the URL printed for the active network; no fixed LAN address is a stable download link. The scripts output the ARM64 APK/checksum in `artifacts/`. Testing builds bundle JavaScript and do not need Metro.

`--reuse-native` reuses generated native configuration and is unsuitable after app/config/native-dependency changes. `--emulator-test` builds a separate x86_64 artifact rather than replacing the phone APK. Validate the exact output hash and architecture against the device. The download server is development tooling, not production distribution.

## Production gates

Select and verify intended package/bundle identity, versioning, signing ownership and protected credentials. The inspected Android release config uses a testing identity/debug signing; producing a release-mode APK does not establish store readiness. iOS needs its own signing/build environment and device acceptance.

Confirm backend compatibility with [cross-app rollout](../../../TRACE/docs/operations/cross-app-rollout.md). Remove development flags, verify real Auth redirects/providers, EAS/push credentials, webhook gateway auth, media policy and privacy/terms/store destinations. Execute [mobile acceptance](../qa/mobile-acceptance.md) and record staged rollout/rollback responsibility.

Create [release evidence](../../../TRACE/docs/templates/release.md) with exact app/backend revisions, artifact checksum/signing class, device results, deployment/distribution result and remaining gates. [Earlier Android evidence](../releases/android-testing-baseline.md) is a dated source, not verification of the current build.
