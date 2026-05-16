import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/lib/auth-context';

/**
 * Root index — single source of truth for the launch redirect.
 *
 * The customer app is **guest-first**: anyone who launches the app lands on
 * the home tabs immediately. Sign-in is only required at the moment a user
 * tries to perform an authenticated action (e.g. checkout). The
 * `OnboardingGate` (mounted in `_layout.tsx`) handles first-launch redirects
 * to onboarding + permissions before this index renders.
 *
 * We still wait for `useAuth` to hydrate so the rest of the app — query
 * client, cart, wishlist — has a stable `isAuthenticated` value to react
 * to from frame 0.
 */
export default function Index() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#11ab3a" />
      </View>
    );
  }

  return <Redirect href="/(tabs)" />;
}
