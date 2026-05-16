import { Alert, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react-native';
import { usersApi, type Address } from '@xelnova/api';
import { Button, EmptyState } from '@xelnova/ui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import { AddressCard } from '../../../src/components/address/address-card';
import { queryKeys } from '../../../src/lib/query-keys';

export default function AddressesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: addresses, isLoading } = useQuery({
    queryKey: queryKeys.user.addresses(),
    queryFn: () => usersApi.getAddresses(),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.addresses() });
    },
    onError: (e: any) => Alert.alert('Could not delete', e?.message ?? 'Try again.'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => usersApi.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.addresses() });
    },
    onError: (e: any) => Alert.alert('Could not update', e?.message ?? 'Try again.'),
  });

  const confirmDelete = (addr: Address) => {
    Alert.alert(
      'Delete address?',
      `Remove ${addr.fullName}'s address at ${addr.city}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(addr.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title="Saved addresses"
        subtitle={
          addresses ? `${addresses.length} saved` : 'Where should we deliver?'
        }
      />

      {!isLoading && (!addresses || addresses.length === 0) ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<MapPin size={40} color="#11ab3a" />}
            title="No addresses yet"
            subtitle="Add a delivery address to speed up checkout."
            action={
              <Button onPress={() => router.push('/account/addresses/new')}>
                Add address
              </Button>
            }
          />
        </View>
      ) : (
        <FlatList
          data={addresses ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}
          renderItem={({ item }) => (
            <AddressCard
              address={item}
              onEdit={() =>
                router.push({
                  pathname: '/account/addresses/[id]',
                  params: { id: item.id },
                })
              }
              onDelete={() => confirmDelete(item)}
              onSetDefault={() => setDefaultMutation.mutate(item.id)}
            />
          )}
        />
      )}

      {addresses && addresses.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-surface border-t border-line-light">
          <Button
            fullWidth
            size="lg"
            leftIcon={<Plus size={18} color="#ffffff" />}
            onPress={() => router.push('/account/addresses/new')}
          >
            Add new address
          </Button>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
