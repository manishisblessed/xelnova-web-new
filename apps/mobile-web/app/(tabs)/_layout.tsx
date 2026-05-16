import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Heart,
  Home as HomeIcon,
  Search,
  ShoppingCart,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../src/lib/auth-context';
import { useCartQuery } from '../../src/lib/use-cart';
import { hapticSelection } from '../../src/lib/haptics';

const ACTIVE = '#0c831f';
const INACTIVE = '#5a6478';

/**
 * Tab shell. Renders for guests and authed users alike — the customer
 * app is browse-first and only gates auth at action time. Per-tab
 * screens decide what to show for guests (home & search are fully
 * public; cart & wishlist back onto a local guest store; account
 * renders a sign-in CTA).
 */
export default function TabsLayout() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={ACTIVE} />
      </View>
    );
  }

  return <CustomerTabs />;
}

function CustomerTabs() {
  const insets = useSafeAreaInsets();
  const { data: cart } = useCartQuery();
  const cartCount = cart?.summary?.itemCount ?? 0;

  // Android with `edgeToEdgeEnabled: true` draws under the gesture bar,
  // so we must reserve `insets.bottom` worth of padding to keep the
  // tap zones above the system area. Without this, taps near the icons
  // get intercepted by Android.
  const bottomInset =
    Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom;

  // Light selection haptic on every tab press. Wired via `screenListeners`
  // so all 5 tabs share the same handler — no need to repeat per-screen.
  const tabListeners = {
    tabPress: () => hapticSelection(),
  } as const;

  return (
    <Tabs
      screenListeners={tabListeners}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e8ecf1',
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset + 4,
          // Subtle shadow lift so the tab bar reads as a separate
          // surface above the page (matches Amazon/Flipkart visuals).
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={HomeIcon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Search} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <CartTabIcon color={color} focused={focused} count={cartCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Heart} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: LucideIcon;
  color: string;
  focused: boolean;
}) {
  return (
    <Icon
      color={color}
      size={focused ? 26 : 24}
      strokeWidth={focused ? 2.5 : 2}
    />
  );
}

/**
 * Custom cart tab icon with a hand-rolled badge that springs up when
 * the count grows. We can't reach this animation through React
 * Navigation's static `tabBarBadge` prop, so the badge lives inside the
 * `tabBarIcon` slot.
 */
function CartTabIcon({
  color,
  focused,
  count,
}: {
  color: string;
  focused: boolean;
  count: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const previousCount = useRef(count);

  useEffect(() => {
    if (count > previousCount.current) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.4,
          useNativeDriver: true,
          tension: 280,
          friction: 6,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 220,
          friction: 8,
        }),
      ]).start();
    }
    previousCount.current = count;
  }, [count, scale]);

  return (
    <View>
      <ShoppingCart
        color={color}
        size={focused ? 26 : 24}
        strokeWidth={focused ? 2.5 : 2}
      />
      {count > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: -6,
            right: -10,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: '#11ab3a',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale }],
            shadowColor: '#0c831f',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              color: '#ffffff',
              fontSize: 10,
              fontWeight: '800',
              lineHeight: 12,
            }}
          >
            {count > 99 ? '99+' : count}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
