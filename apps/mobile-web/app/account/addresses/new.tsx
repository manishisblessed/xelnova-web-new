import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@xelnova/api';
import { ScreenHeader } from '../../../src/components/screen-header';
import { AddressForm } from '../../../src/components/address/address-form';
import { queryKeys } from '../../../src/lib/query-keys';

export default function NewAddressScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: usersApi.addAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.addresses() });
      router.back();
    },
    onError: (e: any) => Alert.alert('Could not save', e?.message ?? 'Try again.'),
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Add address" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <AddressForm
            submitting={createMutation.isPending}
            onSubmit={(values) => createMutation.mutate(values)}
            onCancel={() => router.back()}
            submitLabel="Save address"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
