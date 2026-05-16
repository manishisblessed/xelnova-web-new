import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react-native';
import { usersApi } from '@xelnova/api';
import { Button, EmptyState, RadioCard } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { StepIndicator } from '../../src/components/checkout/step-indicator';
import { queryKeys } from '../../src/lib/query-keys';
import { useCheckout } from '../../src/lib/checkout-context';

export default function CheckoutAddressScreen() {
  const router = useRouter();
  const { selectedAddressId, setAddress } = useCheckout();

  const { data: addresses, isLoading } = useQuery({
    queryKey: queryKeys.user.addresses(),
    queryFn: () => usersApi.getAddresses(),
    retry: false,
  });

  // Pre-select default (or first) address on first load.
  useEffect(() => {
    if (!addresses || selectedAddressId) return;
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (def) setAddress(def);
  }, [addresses, selectedAddressId, setAddress]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Checkout" />
      <StepIndicator active={1} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      ) : !addresses || addresses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<MapPin size={40} color="#11ab3a" />}
            title="Add a delivery address"
            subtitle="We'll use this for shipping and order updates."
            action={
              <Button onPress={() => router.push('/account/addresses/new')}>
                Add address
              </Button>
            }
          />
        </View>
      ) : (
        <>
          <FlatList
            data={addresses}
            keyExtractor={(a) => a.id}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
            renderItem={({ item }) => {
              const lines = [
                item.addressLine1,
                item.addressLine2,
                item.landmark,
              ]
                .filter(Boolean)
                .join(', ');
              const description = `${lines}\n${item.city}, ${item.state} - ${item.pincode}\n${item.phone}`;
              return (
                <RadioCard
                  selected={selectedAddressId === item.id}
                  onPress={() => setAddress(item)}
                  title={`${item.fullName} \u00b7 ${item.type}${item.isDefault ? ' \u00b7 Default' : ''}`}
                  description={description}
                />
              );
            }}
            ListFooterComponent={
              <Pressable
                onPress={() => router.push('/account/addresses/new')}
                className="mt-2 flex-row items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-line bg-surface active:bg-surface-muted"
              >
                <Plus size={16} color="#1a1a2e" />
                <Text className="text-sm font-semibold text-ink">
                  Add a new address
                </Text>
              </Pressable>
            }
          />

          <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line-light px-4 pt-3 pb-6">
            <Button
              fullWidth
              size="lg"
              disabled={!selectedAddressId}
              onPress={() => router.push('/checkout/review')}
            >
              Continue to review
            </Button>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
