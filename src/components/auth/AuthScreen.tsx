import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/auth/googleOAuth';
import Button from '../ui/Button';

type Mode = 'sign-in' | 'sign-up';

function InputField({
  icon,
  ...props
}: { icon: keyof typeof Ionicons.glyphMap } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="flex-row items-center bg-surface border border-border rounded-xl px-3 mb-3">
      <Ionicons name={icon} size={18} color="#6B7280" />
      <TextInput
        placeholderTextColor="#6B7280"
        className="flex-1 h-12 px-2.5 text-white"
        {...props}
      />
    </View>
  );
}

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.ok && !result.cancelled) {
      setError(result.error ?? 'Could not sign in with Google.');
    }
  };

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
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          className="items-center mb-10"
        >
          <View className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 items-center justify-center mb-4">
            <Ionicons name="barbell" size={30} color="#3B82F6" />
          </View>
          <Text className="text-3xl font-bold text-white">TRACE</Text>
          <Text className="text-sm text-gray-400 mt-1">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </Text>
        </MotiView>

        <MotiView
          key={mode}
          from={{ opacity: 0, translateX: isSignUp ? 16 : -16 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 250 }}
        >
          {isSignUp && (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <InputField
                  icon="person-outline"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  autoCapitalize="words"
                />
              </View>
              <View className="flex-1">
                <InputField
                  icon="person-outline"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          <InputField
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <InputField
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />

          {error && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-row items-center gap-1.5 mb-3"
            >
              <Ionicons name="alert-circle-outline" size={14} color="#F87171" />
              <Text className="text-sm text-red-400 flex-1">{error}</Text>
            </MotiView>
          )}

          <View className="mb-4">
            <Button onPress={() => void handleSubmit()} loading={loading} fullWidth size="lg">
              {isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </View>
        </MotiView>

        <View className="flex-row items-center gap-3 mb-4">
          <View className="flex-1 h-px bg-border" />
          <Text className="text-xs text-gray-500 font-medium">OR</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <View className="mb-4">
          <Button
            onPress={() => void handleGoogleSignIn()}
            loading={googleLoading}
            disabled={loading}
            variant="secondary"
            fullWidth
            size="lg"
            icon={<Ionicons name="logo-google" size={18} color="#E5E7EB" />}
          >
            Continue with Google
          </Button>
        </View>

        <Pressable
          onPress={() => {
            setMode(isSignUp ? 'sign-in' : 'sign-up');
            setError(null);
          }}
        >
          <Text className="text-sm text-gray-400 text-center">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text className="text-primary font-medium">{isSignUp ? 'Sign in' : 'Sign up'}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
