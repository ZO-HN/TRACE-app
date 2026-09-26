import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
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
            <Ionicons name="barbell" size={30} color="#4ADE80" />
          </View>
          <Text className="text-3xl font-bold text-white">TRACE</Text>
          <Text className="text-sm text-gray-400 mt-1">Sign in to your account</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateX: -16 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 250 }}
        >
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
            autoComplete="current-password"
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
              Sign in
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

        <Text className="text-sm text-gray-400 text-center">
          Need an account? Ask your coach for an invite link.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
