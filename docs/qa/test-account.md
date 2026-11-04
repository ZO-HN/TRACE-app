# Mobile test login

Status: maintained staging procedure. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: `scripts/test-account.mjs` and current Auth/profile contract. Account creation is an explicit provisioning action against the chosen test project.

Use a dedicated trainee account in the same Supabase project as the app's
`EXPO_PUBLIC_SUPABASE_URL`. A new trainee must select a coach before accessing
the tabs. Coach accounts belong in the web dashboard.

## Create through the Supabase dashboard

1. Open the matching project, then Authentication > Users > Add user > Create new user.
2. Use a dedicated test email you control and a unique password of at least 12 characters.
3. Enable Auto Confirm User so email verification does not block testing.
4. Keep this email out of the coach allowlist. The database signup trigger creates
   the trainee profile automatically.
5. Enter the email and password on the mobile Sign in screen. Select your coach
   or enter their referral code when prompted.

## Create from the terminal

Requires Node 22+ and a Supabase service-role key for the intended test project.
From TRACE-client, create a git-ignored `.env.test.local` with:

```dotenv
TRACE_TEST_EMAIL=your-test-email@example.com
TRACE_TEST_PASSWORD=replace-with-a-unique-test-password
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

The script reads the app URL/public key from `.env.local`. Shell variables take
precedence. Check that URL before creating the account, then run:

```sh
npm run test-account:create
```

This creates an email-confirmed user through the Auth Admin API and checks login
and profile access using the public key and the user's own session. It does not
reset existing accounts, modify roles, or assign a coach. If creation succeeds
but verification fails, fix the reported problem and run verification again.

Never prefix the service-role key or test password with `EXPO_PUBLIC_`, import
this script into the app, or commit `.env.test.local`. Remove the admin key from
the file after provisioning. No admin key is needed for subsequent verification.

## Verify an existing account

Set `TRACE_TEST_EMAIL` and `TRACE_TEST_PASSWORD` in `.env.test.local`, including
for an account created in the dashboard, then run:

```sh
npm run test-account:verify
```

This verifies the real password flow, profile RLS access, trainee role, and whether
a coach is linked. It does not print passwords or session tokens. It does not
replace a device test: sign in, select a coach, restart the app to check session
persistence, then sign out and sign in again.

If email confirmation blocks login, confirm the dedicated test user in the
dashboard. If the profile is missing or inaccessible, investigate the canonical
TRACE migrations and signup trigger. If no coaches appear, configure a real
test coach through the dashboard's allowlist and onboarding workflow.

Record authenticated device results separately using the [mobile acceptance checklist](mobile-acceptance.md) and [shared release template](../../../TRACE/docs/templates/release.md).
