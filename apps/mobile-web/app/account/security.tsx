import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { usersApi } from '@xelnova/api';
import { Button, Input } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/lib/auth-context';
import { queryKeys } from '../../src/lib/query-keys';

export default function SecurityScreen() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: () => usersApi.getProfile(),
    initialData: user ?? undefined,
    retry: false,
  });

  const provider = (profileQuery.data as { authProvider?: string } | undefined)
    ?.authProvider;
  const requiresCurrent = provider === 'EMAIL' || !provider;
  const ctaLabel = requiresCurrent ? 'Update password' : 'Set a password';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirm?: string;
  }>({});

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.changePassword({
        currentPassword: requiresCurrent ? currentPassword : undefined,
        newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      Alert.alert('Password updated', 'Use your new password next time you sign in.');
    },
    onError: (e: Error) =>
      Alert.alert('Could not update', e?.message ?? 'Please try again.'),
  });

  const onSubmit = () => {
    const next: typeof errors = {};
    if (requiresCurrent && !currentPassword) {
      next.currentPassword = 'Required';
    }
    if (!newPassword || newPassword.length < 8) {
      next.newPassword = 'Use at least 8 characters';
    }
    if (newPassword !== confirm) {
      next.confirm = 'Passwords do not match';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Account security" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-promo-mint-50 border border-primary-200 rounded-2xl p-4 flex-row gap-3">
            <ShieldCheck size={18} color="#0c831f" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-primary-700">
                Strong passwords protect your account
              </Text>
              <Text className="text-xs text-primary-700 leading-relaxed mt-0.5">
                Use at least 8 characters and avoid reusing passwords from other
                services.
              </Text>
            </View>
          </View>

          {!requiresCurrent ? (
            <Text className="text-xs text-ink-secondary">
              {`You signed up with ${provider?.toLowerCase() ?? 'a third-party provider'}. ` +
                'Set a password so you can also sign in with your email.'}
            </Text>
          ) : null}

          {requiresCurrent ? (
            <Input
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Your current password"
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              leftIcon={<Lock size={16} color="#5a6478" />}
              error={errors.currentPassword}
            />
          ) : null}
          <Input
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            leftIcon={<Lock size={16} color="#5a6478" />}
            error={errors.newPassword}
          />
          <Input
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat the new password"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            leftIcon={<Lock size={16} color="#5a6478" />}
            error={errors.confirm}
          />

          <Button
            size="lg"
            fullWidth
            onPress={onSubmit}
            loading={mutation.isPending}
            className="mt-2"
          >
            {ctaLabel}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
