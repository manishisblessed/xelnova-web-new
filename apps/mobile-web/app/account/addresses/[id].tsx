import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@xelnova/api';
import { ScreenHeader } from '../../../src/components/screen-header';
import {
  AddressForm,
  type AddressFormValues,
} from '../../../src/components/address/address-form';
import { queryKeys } from '../../../src/lib/query-keys';

export default function EditAddressScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: addresses, isLoading } = useQuery({
    queryKey: queryKeys.user.addresses(),
    queryFn: () => usersApi.getAddresses(),
    retry: false,
  });

  const address = addresses?.find((a) => a.id === id);

  const updateMutation = useMutation({
    mutationFn: (values: AddressFormValues) =>
      usersApi.updateAddress(id as string, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.addresses() });
      router.back();
    },
    onError: (e: any) => Alert.alert('Could not save', e?.message ?? 'Try again.'),
  });

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Edit address" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!address) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Edit address" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-ink">
            Address not found
          </Text>
          <Text className="text-sm text-ink-secondary mt-1 text-center">
            It may have been removed already.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Edit address" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <AddressForm
            initial={address}
            submitting={updateMutation.isPending}
            onSubmit={(values) => updateMutation.mutate(values)}
            onCancel={() => router.back()}
            submitLabel="Save changes"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
