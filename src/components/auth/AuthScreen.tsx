import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Mode = 'sign-in' | 'sign-up';

// Every account created here is a trainee — this app never sends a `role`
// in signup metadata, so handle_new_user() defaults it to 'trainee' and
// auto-assigns coach_id from platform_settings.default_coach_id.
export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      setError('First and last name are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { first_name: firstName.trim(), last_name: lastName.trim() },
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-white mb-1">TRACE</Text>
        <Text className="text-sm text-gray-400 mb-8">
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </Text>

        {isSignUp && (
          <View className="flex-row gap-3 mb-3">
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#6B7280"
              className="flex-1 h-12 bg-surface border border-border rounded-lg px-3 text-white"
              autoCapitalize="words"
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#6B7280"
              className="flex-1 h-12 bg-surface border border-border rounded-lg px-3 text-white"
              autoCapitalize="words"
            />
          </View>
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#6B7280"
          className="h-12 bg-surface border border-border rounded-lg px-3 text-white mb-3"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#6B7280"
          className="h-12 bg-surface border border-border rounded-lg px-3 text-white mb-3"
          secureTextEntry
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
        />

        {error && <Text className="text-sm text-red-400 mb-3">{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          className="h-12 bg-primary rounded-lg items-center justify-center mb-4 disabled:opacity-50"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">
              {isSignUp ? 'Create account' : 'Sign in'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(isSignUp ? 'sign-in' : 'sign-up');
            setError(null);
          }}
        >
          <Text className="text-sm text-gray-400 text-center">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text className="text-primary font-medium">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
