import { loadEnvFile } from 'node:process';
import { createClient } from '@supabase/supabase-js';

for (const file of ['.env.test.local', '.env.local']) {
  try { loadEnvFile(file); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.test.local or your shell. See docs/qa/test-account.md.`);
  return value;
}

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

async function main() {
  const mode = process.argv[2];
  if (!['create', 'verify'].includes(mode)) throw new Error('Usage: node scripts/test-account.mjs create|verify');
  const url = required('EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = required('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const email = required('TRACE_TEST_EMAIL').trim().toLowerCase();
  const password = required('TRACE_TEST_PASSWORD');
  if (password.length < 12) throw new Error('Use a test password with at least 12 characters.');

  if (mode === 'create') {
    const admin = createClient(url, required('SUPABASE_SERVICE_ROLE_KEY'), options);
    console.log(`Creating test trainee on ${new URL(url).host}...`);
    const { error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { first_name: 'TRACE', last_name: 'Tester' },
    });
    if (error) throw new Error(`Account creation failed: ${error.message}. Existing accounts are never reset; use test-account:verify to check one.`);
    console.log('Account created. Verifying login through the public client...');
  }

  const client = createClient(url, anonKey, options);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed: ${error.message}`);
  try {
    const { data: profile, error: profileError } = await client.from('profiles')
      .select('id, role, coach_id').eq('id', data.user.id).single();
    if (profileError) throw new Error(`Login succeeded, but profile access failed: ${profileError.message}`);
    if (profile.role !== 'trainee') throw new Error('This account is a coach. Use a separate test email outside the coach allowlist.');
    console.log(`Verified email/password login and trainee profile for ${email}.`);
    console.log(profile.coach_id
      ? 'Coach linked: the app should open the trainee tabs.'
      : 'Next: sign in on the app and select your coach or enter their referral code.');
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
