import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  BadgePercent,
  Bell,
  Camera,
  ChevronDown,
  Coins,
  MapPin,
  Mic,
  RotateCcw,
  ScanLine,
  Search,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { walletApi } from '@xelnova/api';
import { Avatar } from '@xelnova/ui-native';
import { useAuth } from '../lib/auth-context';
import { useRequireAuth } from '../lib/require-auth';
import { getCachedLocality, type CachedLocality } from '../lib/locality';
import { ServiceChips } from './home/service-chips';

const LOGO_SOURCE = require('../../assets/icon.png') as number;

interface MarketplaceHeaderProps {
  /** When false, search bar is inert (used by the search screen itself). */
  searchAsTrigger?: boolean;
  searchPlaceholder?: string;
  /** Hide the service chips row, e.g. on the search screen. */
  showServiceChips?: boolean;
  /** Hide the brand + promo strip rows when used inside a sub-screen. */
  showBrandStrip?: boolean;
  /**
   * Scroll position from the parent ScrollView. When provided, the
   * header collapses the brand + promo strip on scroll and adds a
   * subtle bottom shadow when the page has been scrolled at all.
   *
   * Wire it via `Animated.event(...)` on the ScrollView's `onScroll`.
   */
  scrollY?: Animated.Value;
}

/** Combined height of the promo strip + brand row that we collapse on scroll. */
const COLLAPSING_HEADER_HEIGHT = 82;
/** Scroll distance over which the collapse happens. */
const COLLAPSE_RANGE = 80;

const ACCOUNT_HREF: Href = '/account/profile';
const WALLET_HREF: Href = '/account/wallet';
const NOTIFICATIONS_HREF: Href = '/account/notifications';

/**
 * Sticky marketplace header used on Home + Search.
 *
 * Layout (Blinkit-aesthetic, Xelnova green + sunshine accent):
 *   Row 0 — yellow promo strip ("FREE DELIVERY OVER \u20B9499 \u00b7 EXTRA 5% OFF")
 *   Row 1 — Xelnova logo + wordmark · bell · brand identity row
 *   Row 2 — address pill (display-only) · wallet pill · avatar
 *   Row 3 — search pill with leading magnifier + trailing camera/mic/scan
 *   Row 4 — Pattern A service chips (Flash · Under \u20B9299 · New · Loyalty)
 *
 * The address pill never opens a picker — locality comes from the
 * install-time wizard's GPS grant (cached via `setCachedLocality`) so we
 * never re-prompt at the header level.
 */
export function MarketplaceHeader({
  searchAsTrigger = true,
  searchPlaceholder = 'Search for products, brands, stores',
  showServiceChips = true,
  showBrandStrip = true,
  scrollY,
}: MarketplaceHeaderProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const requireAuth = useRequireAuth();

  // Locality is cached as a tiny AsyncStorage blob; read it once and
  // re-read whenever auth state changes (a logged-in user with a default
  // address may overwrite the GPS-detected label).
  const [locality, setLocality] = useState<CachedLocality | null>(null);
  useEffect(() => {
    let alive = true;
    getCachedLocality().then((value) => {
      if (alive) setLocality(value);
    });
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  // Wallet pill is auth-only data; guests see "\u20B90".
  const walletQuery = useQuery({
    queryKey: ['wallet', 'balance'] as const,
    queryFn: () =>
      walletApi
        .getCustomerBalance()
        .catch(() => ({ balance: 0, walletId: null })),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  const balance = walletQuery.data?.balance ?? 0;

  const tone = locality?.tone ?? 'DELIVER TO';
  const label = locality?.label ?? 'India';

  const goToWallet = () =>
    requireAuth(WALLET_HREF, () => router.push(WALLET_HREF));
  const goToAccount = () =>
    requireAuth(ACCOUNT_HREF, () => router.push(ACCOUNT_HREF));
  const goToNotifications = () =>
    requireAuth(NOTIFICATIONS_HREF, () => router.push(NOTIFICATIONS_HREF));

  // Scroll-driven values. When the parent doesn't pass a `scrollY` we
  // skip the animation (interpolate of `undefined` would crash) and the
  // header behaves like a regular static block.
  const collapsingHeight = scrollY
    ? scrollY.interpolate({
        inputRange: [0, COLLAPSE_RANGE],
        outputRange: [COLLAPSING_HEADER_HEIGHT, 0],
        extrapolate: 'clamp',
      })
    : null;
  const collapsingOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, COLLAPSE_RANGE * 0.6],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : null;
  const shadowOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [0, 12, 60],
        outputRange: [0, 0.06, 0.18],
        extrapolate: 'clamp',
      })
    : null;

  return (
    <View className="bg-surface-brand">
      {showBrandStrip ? (
        <Animated.View
          style={
            collapsingHeight
              ? {
                  height: collapsingHeight,
                  opacity: collapsingOpacity ?? 1,
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          <PromoStrip />
          <BrandRow onBellPress={goToNotifications} />
        </Animated.View>
      ) : null}

      <View className="pt-1 pb-3 gap-2.5">
        {/* Row 2 — address + wallet + avatar */}
        <View className="flex-row items-center gap-2 px-4">
          <View className="flex-row items-center gap-1.5 flex-1">
            <MapPin size={16} color="#0c831f" />
            <View className="flex-1">
              <View className="flex-row items-center gap-1">
                <Text className="text-[10px] font-extrabold uppercase tracking-wide text-ink">
                  {tone}
                </Text>
                <ChevronDown size={12} color="#5a6478" />
              </View>
              <Text
                className="text-[13px] font-semibold text-ink-secondary"
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={goToWallet}
            className="flex-row items-center gap-1 bg-surface rounded-full pl-2 pr-3 h-8 border border-line-light active:bg-surface-muted"
            hitSlop={6}
          >
            <Wallet size={13} color="#b07a00" />
            <Text className="text-xs font-bold text-ink">
              {`\u20B9${formatBalance(balance)}`}
            </Text>
          </Pressable>

          <Pressable onPress={goToAccount} hitSlop={6}>
            <Avatar size="sm" name={user?.name} uri={user?.avatar} />
          </Pressable>
        </View>

        {/* Row 3 — search pill */}
        <Pressable
          onPress={searchAsTrigger ? () => router.push('/search') : undefined}
          className="mx-4 flex-row items-center gap-2 bg-surface rounded-full px-3.5 h-12 border border-line-light"
          disabled={!searchAsTrigger}
        >
          <Search size={18} color="#5a6478" />
          <Text className="flex-1 text-sm text-ink-muted" numberOfLines={1}>
            {searchPlaceholder}
          </Text>
          {searchAsTrigger ? (
            <View className="flex-row items-center gap-3 pl-1">
              <Pressable
                hitSlop={8}
                onPress={() =>
                  router.push({ pathname: '/search', params: { mode: 'image' } })
                }
              >
                <Camera size={18} color="#1a1a2e" />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  router.push({ pathname: '/search', params: { mode: 'voice' } })
                }
              >
                <Mic size={18} color="#1a1a2e" />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  router.push({ pathname: '/search', params: { mode: 'scan' } })
                }
              >
                <ScanLine size={18} color="#1a1a2e" />
              </Pressable>
            </View>
          ) : null}
        </Pressable>

        {/* Row 4 — service chips */}
        {showServiceChips ? <ServiceChips /> : null}
      </View>

      {/* Scroll-driven bottom shadow. Sits below the header and uses
          `shadowColor` + opacity so it stays soft on iOS and elevation
          on Android — just enough to separate the sticky header from the
          scrolled content underneath. */}
      {scrollY ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -8,
            height: 8,
            opacity: shadowOpacity ?? 0,
            backgroundColor: 'transparent',
            shadowColor: '#0c2a14',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 4,
          }}
        />
      ) : null}
    </View>
  );
}

interface PromoMessage {
  Icon: LucideIcon;
  text: string;
}

const PROMO_MESSAGES: PromoMessage[] = [
  { Icon: Truck, text: 'FREE DELIVERY OVER \u20B9499' },
  { Icon: BadgePercent, text: 'EXTRA 5% OFF YOUR FIRST ORDER' },
  { Icon: RotateCcw, text: '30-DAY EASY RETURNS' },
  { Icon: Coins, text: 'EARN COINS ON EVERY ORDER' },
];

const PROMO_INTERVAL_MS = 4500;

/**
 * Yellow promo strip that auto-cycles through 4 benefit messages with a
 * vertical fade/slide transition. Sits on accent-100 so it reads as a
 * sunshine band against the mint header below.
 *
 * Animation: each tick fades the current message out and slides it up
 * 8 px while the next message fades in from below. Drives both opacity
 * and translateY off a single `Animated.Value` so the spring runs on
 * the native driver.
 */
function PromoStrip() {
  const [index, setIndex] = useState(0);
  const fadeOut = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(fadeOut, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setIndex((current) => (current + 1) % PROMO_MESSAGES.length);
        // Reset off-screen and fade back in.
        fadeOut.setValue(0);
      });
    }, PROMO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fadeOut]);

  const opacity = fadeOut.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const translateY = fadeOut.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const message = PROMO_MESSAGES[index]!;
  const Icon = message.Icon;

  return (
    <View className="bg-accent-100 px-4 py-1.5 flex-row items-center gap-2 overflow-hidden">
      <Icon size={12} color="#8a5f00" />
      <Animated.View
        style={{
          flex: 1,
          opacity,
          transform: [{ translateY }],
        }}
      >
        <Text className="text-[11px] font-bold text-accent-900" numberOfLines={1}>
          {message.text}
        </Text>
      </Animated.View>
      <View className="flex-row gap-1">
        {PROMO_MESSAGES.map((_, idx) => (
          <View
            key={idx}
            className={
              idx === index
                ? 'w-2 h-1.5 rounded-full bg-accent-700'
                : 'w-1.5 h-1.5 rounded-full bg-accent-300'
            }
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Brand identity row — Xelnova logo + wordmark on the left, a notification
 * bell on the right. Lives on the mint header tint so the brand reads as
 * "settled" into the marketplace shell.
 */
function BrandRow({ onBellPress }: { onBellPress: () => void }) {
  return (
    <View className="px-4 pt-2 pb-1 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View className="w-9 h-9 rounded-xl overflow-hidden bg-surface items-center justify-center">
          <ExpoImage
            source={LOGO_SOURCE}
            style={{ width: 32, height: 32 }}
            contentFit="contain"
          />
        </View>
        <View>
          <Text className="text-base font-extrabold text-primary-700 leading-tight">
            xelnova
          </Text>
          <Text className="text-[9px] uppercase tracking-[1px] text-accent-700 font-bold leading-tight">
            shop. save. smile.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onBellPress}
        hitSlop={8}
        className="w-9 h-9 rounded-full bg-surface items-center justify-center border border-line-light active:bg-surface-muted"
      >
        <Bell size={16} color="#1a1a2e" />
      </Pressable>
    </View>
  );
}

function formatBalance(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '0';
  if (amount >= 1000) {
    const k = amount / 1000;
    return `${k.toFixed(k < 10 ? 1 : 0)}k`;
  }
  return Math.round(amount).toString();
}
