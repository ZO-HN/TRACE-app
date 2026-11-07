import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function EmailCodeSignIn() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const active = useRef(false);
  const mounted = useRef(false);
  const nextSend = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(Math.max(0, Math.ceil((nextSend.current - Date.now()) / 1000))), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const request = async () => {
    if (active.current || Date.now() < nextSend.current) return;
    const address = (sentTo ?? email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setError('Enter the email used for your coach invitation.'); return; }
    active.current = true; setBusy(true); setError(null);
    try {
      const { error: failure } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } });
      if (failure) throw failure;
      if (!mounted.current) return;
      setSentTo(address); setCode(''); nextSend.current = Date.now() + 60000; setCooldown(60);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Could not send a sign-in code. Try again.');
    } finally { active.current = false; if (mounted.current) setBusy(false); }
  };
  const verify = async () => {
    if (active.current || !sentTo) return;
    if (!/^\d{6,10}$/.test(code.trim())) { setError('Enter the code from your email.'); return; }
    active.current = true; setBusy(true); setError(null);
    try {
      const { error: failure } = await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: 'email' });
      if (failure) throw failure;
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Could not verify this code. Try again or request a new code.');
    } finally { active.current = false; if (mounted.current) setBusy(false); }
  };
  return <View className="border border-border rounded-xl p-4 mb-4 gap-3">
    <Text className="font-semibold text-white">Joined through a coach invitation?</Text>
    <Text className="text-sm text-gray-400">Use the same email to sign in without a password. Complete your coach invitation first.</Text>
    {!sentTo ? <TextInput accessibilityLabel="Invitation email" value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email used for onboarding" placeholderTextColor="#9CA3AF" className="border border-border rounded-lg p-3 text-white" /> : <>
      <Text className="text-sm text-gray-400">Enter the code sent to {sentTo}.</Text>
      <TextInput accessibilityLabel="Email sign-in code" value={code} onChangeText={setCode} editable={!busy} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} className="border border-border rounded-lg p-3 text-white" />
    </>}
    {error && <Text accessibilityRole="alert" className="text-sm text-red-400">{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy || (!sentTo && cooldown > 0)} onPress={() => void (sentTo ? verify() : request())}><Text className="text-primary">{busy ? 'Please wait…' : sentTo ? 'Verify code' : cooldown > 0 ? `Wait ${cooldown}s to send a code` : 'Send sign-in code'}</Text></Pressable>
    {sentTo && <>
      <Pressable accessibilityRole="button" disabled={busy || cooldown > 0} onPress={() => void request()}><Text className="text-primary">{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setSentTo(null); setCode(''); setError(null); }}><Text className="text-gray-400">Use another email</Text></Pressable>
    </>}
  </View>;
}
