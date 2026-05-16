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
import { Lock, Mail } from 'lucide-react-native';
import { Button, Input } from '@xelnova/ui-native';
import { useAuth } from '../../src/lib/auth-context';
import { deserializeNext } from '../../src/lib/require-auth';

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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();
  const nextHref = deserializeNext(params.next);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.replace(nextHref);
    } catch (err) {
      setError(getErrorMessage(err, 'Sign in failed. Please try again.'));
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
        <View className="flex-1 justify-center px-6 py-10">
          <View className="mb-8">
            <Text className="font-display text-4xl font-extrabold text-ink">
              Welcome back
            </Text>
            <Text className="mt-2 text-base text-ink-secondary">
              Sign in to continue shopping on Xelnova.
            </Text>
          </View>

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
            <Input
              label="Password"
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              leftIcon={<Lock size={18} color="#5a6478" />}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable className="self-end">
                <Text className="text-sm font-semibold text-primary-600">
                  Forgot password?
                </Text>
              </Pressable>
            </Link>

            {error ? (
              <View className="rounded-xl bg-danger-50 px-3 py-2.5">
                <Text className="text-sm text-danger-700">{error}</Text>
              </View>
            ) : null}

            <Button
              size="lg"
              fullWidth
              loading={busy}
              onPress={onSubmit}
              className="mt-2"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </View>

          <View className="mt-8 flex-row items-center justify-center gap-1.5">
            <Text className="text-sm text-ink-secondary">New to Xelnova?</Text>
            <Link
              href={{
                pathname: '/(auth)/register',
                params: params.next ? { next: params.next } : {},
              }}
              asChild
            >
              <Pressable>
                <Text className="text-sm font-semibold text-primary-600">
                  Create an account
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
