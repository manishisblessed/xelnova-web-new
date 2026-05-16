import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@xelnova/api';
import { Avatar, Button, Card, Input } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/lib/auth-context';
import { queryKeys } from '../../src/lib/query-keys';
import { isValidEmail, isValidIndianPhone, digitsOnly } from '../../src/lib/validation';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: () => usersApi.getProfile(),
    initialData: user ?? undefined,
    retry: false,
  });

  const profile = profileQuery.data;

  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setEmail(profile.email ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; email?: string; phone?: string }) =>
      usersApi.updateProfile(body),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.user.profile(), next);
      Alert.alert('Profile updated', 'Your changes have been saved.');
    },
    onError: (err: any) => {
      Alert.alert('Could not save', err?.message ?? 'Please try again.');
    },
  });

  const onSave = () => {
    const nextErrors: typeof errors = {};
    if (email && !isValidEmail(email)) nextErrors.email = 'Enter a valid email';
    if (phone && !isValidIndianPhone(phone)) nextErrors.phone = 'Enter a 10-digit mobile number';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateMutation.mutate({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Profile" subtitle="Manage your personal info" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card variant="flat" className="items-center gap-3 py-6">
          <Avatar uri={profile?.avatar} name={profile?.name} size="xl" />
        </Card>
        <Card variant="flat" className="gap-4">
          <Input
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            returnKeyType="next"
          />
          <Input
            label="Mobile number"
            value={phone}
            onChangeText={(v) => setPhone(digitsOnly(v, 10))}
            placeholder="10-digit number"
            keyboardType="phone-pad"
            error={errors.phone}
            returnKeyType="done"
          />
        </Card>
        <Button
          fullWidth
          size="lg"
          onPress={onSave}
          loading={updateMutation.isPending}
        >
          Save changes
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
