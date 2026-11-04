# Android testing evidence baseline

Status: dated evidence, not production sign-off. Owner: TRACE maintainers. Consolidated: 2026-10-31. Original observations: 2026-10-23. Source: previous Android checkpoint and latest diagnosis, hashes credited in the [source register](../../../TRACE/docs/sources.md). Artifact existence/hash and device behavior were not rechecked during documentation work.

## Recorded artifact

The checkpoint recorded a development-key-signed ARM64 APK, package `com.anonymous.traceclient`, version 1.0.0, minimum Android API 24, size 53,911,880 bytes, SHA-256 `597ab198c0ee1932b1cb0bad773c683c011fb0f6f580403c13a749a796345ad4`. It reported signature-v2 and 16-KB alignment checks. These are source-record observations, not a newly built or store-ready artifact.

The prior run reported 338 tests/61 files, TypeScript and web-export checks, and 11 disposable SQL scenarios. It covered dated weigh-ins, decimal handling, draft/rest-timer recovery, account guards, library/folder interactions and selected failure paths. The [31 October diagnosis](../../../TRACE/docs/qa/diagnosis-2026-10-31.md) gives later source/evidence boundaries. Neither count proves all features or native flows pass.

## Native evidence limits

The ARM64 artifact installed in an x86 emulator but could not find the x86 native library at startup; that does not prove a phone crash or successful phone launch. A separate x86_64 build reached native sign-in, but emulator System UI instability prevented a clean interactive sign-off. That artifact predates later decimal/precision changes. Authenticated physical-device acceptance was not established; iOS was not verified.

## Carry-forward gates

Dedicated signed-in staging flows, current-revision phone installation, SQLite kill/reopen/sync, camera/mic/media, notification provisioning/receipts/open behavior, release identity/signing and distribution remain required. Follow [mobile release](../operations/mobile-release.md) and [mobile acceptance](../qa/mobile-acceptance.md), then create a new evidence record. Historic local preview/LAN URLs have been removed; use current tool output.
