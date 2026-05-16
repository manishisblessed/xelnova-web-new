import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof params.token === 'string' ? params.token : '';

  const onSubmit = async () => {
    if (!token) {
      setError('Reset link is missing or expired. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset password.'));
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
              Set a new password
            </Text>
            <Text className="mt-2 text-base text-ink-secondary">
              Choose a password you don&apos;t use anywhere else.
            </Text>
          </View>

          {done ? (
            <View className="rounded-2xl bg-success-50 p-4">
              <Text className="font-semibold text-success-700">
                Password updated
              </Text>
              <Text className="mt-1 text-sm text-success-600">
                You can now sign in with your new password.
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable className="mt-4 self-start">
                  <Text className="text-sm font-semibold text-primary-600">
                    Go to sign in
                  </Text>
                </Pressable>
              </Link>
            </View>
          ) : (
            <View className="gap-4">
              <Input
                label="New password"
                placeholder="At least 8 characters"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={18} color="#5a6478" />}
              />
              <Input
                label="Confirm password"
                placeholder="Re-enter your new password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                value={confirm}
                onChangeText={setConfirm}
                leftIcon={<Lock size={18} color="#5a6478" />}
              />

              {error ? (
                <View className="rounded-xl bg-danger-50 px-3 py-2.5">
                  <Text className="text-sm text-danger-700">{error}</Text>
                </View>
              ) : null}

              <Button size="lg" fullWidth loading={busy} onPress={onSubmit}>
                {busy ? 'Saving…' : 'Update password'}
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
