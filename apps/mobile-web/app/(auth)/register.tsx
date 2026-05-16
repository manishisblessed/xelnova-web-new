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
import { Lock, Mail, Phone, User } from 'lucide-react-native';
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

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();
  const nextHref = deserializeNext(params.next);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register(name, email, password, phone.trim() || undefined);
      router.replace(nextHref);
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
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
              Create your account
            </Text>
            <Text className="mt-2 text-base text-ink-secondary">
              Join Xelnova in under a minute.
            </Text>
          </View>

          <View className="gap-4">
            <Input
              label="Full name"
              placeholder="Aarav Sharma"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              value={name}
              onChangeText={setName}
              leftIcon={<User size={18} color="#5a6478" />}
            />
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
              label="Phone (optional)"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              value={phone}
              onChangeText={setPhone}
              leftIcon={<Phone size={18} color="#5a6478" />}
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              leftIcon={<Lock size={18} color="#5a6478" />}
            />

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
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </View>

          <View className="mt-8 flex-row items-center justify-center gap-1.5">
            <Text className="text-sm text-ink-secondary">
              Already have an account?
            </Text>
            <Link
              href={{
                pathname: '/(auth)/login',
                params: params.next ? { next: params.next } : {},
              }}
              asChild
            >
              <Pressable>
                <Text className="text-sm font-semibold text-primary-600">
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
