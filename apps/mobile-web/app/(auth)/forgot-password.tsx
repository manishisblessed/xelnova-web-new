import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Button, Input } from '@xelnova/ui-native';
import { useAuth } from '../../src/lib/auth-context';

interface ApiErrorShape {
  response?: { data?: { message?: string } };
  message?: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as ApiErrorShape;
    if (e.response?.data?.message) return e.response.data.message;
    if (e.message) return e.message;
  }
  return fallback;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter the email on your account.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await forgotPassword(email);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send reset email.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="bg-surface"
      >
        <View className="flex-1 px-6 py-10">
          <Pressable
            onPress={() => router.back()}
            className="mb-6 h-10 w-10 items-center justify-center rounded-full bg-surface-muted"
          >
            <ArrowLeft size={20} color="#1a1a2e" />
          </Pressable>

          <View className="mb-8">
            <Text className="font-display text-3xl font-extrabold text-ink">
              Reset your password
            </Text>
            <Text className="mt-2 text-base text-ink-secondary">
              Enter your email and we&apos;ll send a reset link.
            </Text>
          </View>

          {done ? (
            <View className="rounded-2xl bg-success-50 p-4">
              <Text className="font-semibold text-success-700">
                Check your inbox
              </Text>
              <Text className="mt-1 text-sm text-success-600">
                If an account exists for {email}, we&apos;ve sent a reset link.
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable className="mt-4 self-start">
                  <Text className="text-sm font-semibold text-primary-600">
                    Back to sign in
                  </Text>
                </Pressable>
              </Link>
            </View>
          ) : (
            <View className="gap-4">
              <Input
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={18} color="#5a6478" />}
              />

              {error ? (
                <View className="rounded-xl bg-danger-50 px-3 py-2.5">
                  <Text className="text-sm text-danger-700">{error}</Text>
                </View>
              ) : null}

              <Button size="lg" fullWidth loading={busy} onPress={onSubmit}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
