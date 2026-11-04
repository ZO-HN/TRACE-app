# Login-free development preview

Status: maintained procedure. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: preview script and mobile development guards.

Run `npm run preview -- --port 8084` from TRACE-client and open the localhost URL printed by the command. The process enables `EXPO_PUBLIC_DEV_PREVIEW=1` for development. Use normal start/web commands without that flag for real login; release packaging removes development preview/autologin flags.

Preview supplies a synthetic trainee, does not load a real saved session, and disables outbox synchronization/cloud writes. Local entries belong to the preview identity and must not migrate into real accounts. Anonymous reads still follow RLS and can fail. Placeholder/coming-soon features remain incomplete.

Use this mode for layout/local interaction inspection. It does not establish authenticated reads/writes, assignment delivery, uploads, native permissions, or synchronization. Use [test accounts](../qa/test-account.md) and [mobile acceptance](../qa/mobile-acceptance.md) on staging for those paths.
