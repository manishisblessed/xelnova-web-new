import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { CheckoutProvider } from '../../src/lib/checkout-context';
import { useAuth } from '../../src/lib/auth-context';

/**
 * Checkout shell. Defense-in-depth — the cart "Proceed to checkout"
 * button and the product page "Buy now" button already route guests
 * through `/(auth)/login?next=/checkout`, but anything else that pushes
 * into `/checkout/*` (deep links, share URLs) ends up here too. Bouncing
 * unauthenticated users back through login keeps the address book +
 * server cart calls inside this stack from 401-spamming.
 */
export default function CheckoutLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#11ab3a" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Redirect
        href={{
          pathname: '/(auth)/login',
          params: { next: '/checkout' },
        }}
      />
    );
  }

  return (
    <CheckoutProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#f8fafb' },
        }}
      />
    </CheckoutProvider>
  );
}
