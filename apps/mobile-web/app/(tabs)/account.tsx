import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  Bell,
  ChevronRight,
  Coins,
  Heart,
  HelpCircle,
  Lock,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Wallet,
} from 'lucide-react-native';
import { notificationsApi } from '@xelnova/api';
import {
  AnimatedCounter,
  Avatar,
  Button,
  Card,
  FadeIn,
  PressableScale,
} from '@xelnova/ui-native';
import { useAuth } from '../../src/lib/auth-context';
import { useRequireAuth } from '../../src/lib/require-auth';
import { MenuRow } from '../../src/components/account/menu-row';
import { queryKeys } from '../../src/lib/query-keys';

export default function AccountTab() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const requireAuth = useRequireAuth();

  // Loyalty is auth-only — guests would 401. Gate the query so we don't
  // even fire it.
  const loyaltyQuery = useQuery({
    queryKey: queryKeys.loyalty.balance(),
    queryFn: () => notificationsApi.getLoyaltyBalance(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  const points = (loyaltyQuery.data as { points?: number } | undefined)?.points;

  /** Wraps a navigation in the auth-required gate when needed. */
  const gate = (href: Href, requiresAuth: boolean) => () => {
    if (requiresAuth) {
      requireAuth(href, () => router.push(href));
    } else {
      router.push(href);
    }
  };

  const onLogout = () => {
    Alert.alert(
      'Sign out?',
      'You can keep browsing as a guest, but your saved cart and wishlist will move to local storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Stay on the account tab — it auto-switches to guest mode.
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-raised" edges={['top']}>
      <View className="bg-surface px-4 py-3 border-b border-line-light flex-row items-center justify-between">
        <Text className="text-lg font-bold text-ink">Account</Text>
        <Text
          className="text-xs font-semibold text-primary-600"
          onPress={() => router.push('/account/settings')}
        >
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {isAuthenticated ? (
          <UserCard
            name={user?.name ?? null}
            email={user?.email ?? user?.phone ?? null}
            avatar={user?.avatar ?? null}
            points={points}
          />
        ) : (
          <GuestCard
            onSignIn={() => router.push('/(auth)/login')}
            onCreate={() => router.push('/(auth)/register')}
          />
        )}

        <SectionGroup title="Your activity" className="mt-5" delay={120}>
          <MenuRow
            Icon={Package}
            label="My orders"
            description="Track, return or replace"
            iconColor="#0c831f"
            iconBackground="#ecfdf3"
            onPress={gate('/account/orders', true)}
          />
          <MenuRow
            Icon={Heart}
            label="Wishlist"
            description="Items you saved for later"
            iconColor="#dc2626"
            iconBackground="#fef2f2"
            onPress={() => router.push('/wishlist')}
          />
          <MenuRow
            Icon={RotateCcw}
            label="Returns & refunds"
            description="View and track your returns"
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            onPress={gate('/account/returns', true)}
          />
        </SectionGroup>

        <SectionGroup title="Rewards" className="mt-4" delay={180}>
          <MenuRow
            Icon={Award}
            label="Loyalty & rewards"
            description={
              typeof points === 'number'
                ? `${points.toLocaleString('en-IN')} pts \u00b7 redeem and refer`
                : 'Earn points on every order'
            }
            iconColor="#b07a00"
            iconBackground="#fffbeb"
            onPress={gate('/account/loyalty', true)}
          />
          <MenuRow
            Icon={Wallet}
            label="Wallet"
            description="Refunds & store credit"
            iconColor="#0c831f"
            iconBackground="#ecfdf3"
            onPress={gate('/account/wallet', true)}
          />
        </SectionGroup>

        <SectionGroup title="Preferences" className="mt-4" delay={240}>
          <MenuRow
            Icon={UserIcon}
            label="Profile details"
            description="Name, email, phone"
            onPress={gate('/account/profile', true)}
          />
          <MenuRow
            Icon={MapPin}
            label="Saved addresses"
            description="Add or edit delivery addresses"
            iconColor="#1f8f89"
            iconBackground="#e6f7f6"
            onPress={gate('/account/addresses', true)}
          />
          <MenuRow
            Icon={Bell}
            label="Notifications"
            description="App and order alerts"
            iconColor="#2563eb"
            iconBackground="#eff6ff"
            onPress={gate('/account/notifications', true)}
          />
          <MenuRow
            Icon={Lock}
            label="Account security"
            description="Change password"
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            onPress={gate('/account/security', true)}
          />
        </SectionGroup>

        <SectionGroup title="Help" className="mt-4" delay={300}>
          <MenuRow
            Icon={HelpCircle}
            label="Support"
            description="Tickets, FAQ and contact"
            iconColor="#a78bfa"
            iconBackground="#f5f3ff"
            onPress={gate('/account/support', true)}
          />
          <MenuRow
            Icon={Settings}
            label="App settings"
            description="Notifications, language, legal"
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            onPress={() => router.push('/account/settings')}
          />
          {isAuthenticated ? (
            <MenuRow
              Icon={LogOut}
              label="Sign out"
              destructive
              onPress={onLogout}
            />
          ) : null}
        </SectionGroup>

        <Text className="text-center text-[11px] text-ink-muted mt-6">
          {'Xelnova \u00b7 v1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function UserCard({
  name,
  email,
  avatar,
  points,
}: {
  name: string | null;
  email: string | null;
  avatar: string | null;
  points: number | undefined;
}) {
  const router = useRouter();
  return (
    <View className="px-4 pt-4">
      <PressableScale
        onPress={() => router.push('/account/loyalty')}
        pressScale={0.98}
        style={{
          borderRadius: 22,
          overflow: 'hidden',
          shadowColor: '#0c831f',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={['#0a3d1a', '#11ab3a', '#42c662']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 18 }}
        >
          <View className="flex-row items-center gap-3">
            <View
              style={{
                borderRadius: 999,
                padding: 3,
                backgroundColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <Avatar uri={avatar} name={name} size="lg" />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-extrabold text-white"
                numberOfLines={1}
              >
                {name || 'Customer'}
              </Text>
              <Text className="text-xs text-white/80" numberOfLines={1}>
                {email || 'Signed in'}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <ShieldCheck size={11} color="#ffd966" />
                <Text className="text-[10px] font-extrabold uppercase tracking-wider text-[#ffd966]">
                  Verified customer
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#ffffff" />
          </View>

          {typeof points === 'number' ? (
            <View className="flex-row items-center gap-2 mt-3 bg-white/15 rounded-xl px-3 py-2.5">
              <Coins size={16} color="#ffd966" />
              <AnimatedCounter
                value={points}
                className="text-base font-extrabold text-white"
              />
              <Text className="text-xs font-semibold text-white/85">coins</Text>
              <View className="flex-1" />
              <View className="flex-row items-center gap-1">
                <Award size={12} color="#ffd966" />
                <Text className="text-[11px] font-bold text-[#ffd966]">
                  Tap to redeem
                </Text>
              </View>
            </View>
          ) : null}
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

function GuestCard({
  onSignIn,
  onCreate,
}: {
  onSignIn: () => void;
  onCreate: () => void;
}) {
  return (
    <View className="px-4 pt-4">
      <Card
        variant="tinted"
        tint="mint"
        className="overflow-hidden"
      >
        <View className="flex-row items-start gap-3">
          <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
            <Sparkles size={22} color="#0c831f" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-ink">
              Welcome to Xelnova
            </Text>
            <Text className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
              Sign in to track orders, save items, redeem coins and check out
              faster.
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2 mt-4">
          <Button
            size="md"
            className="flex-1"
            onPress={onSignIn}
            rightIcon={<ChevronRight size={16} color="#ffffff" />}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            size="md"
            className="flex-1"
            onPress={onCreate}
          >
            Create account
          </Button>
        </View>
      </Card>
    </View>
  );
}

function SectionGroup({
  title,
  className,
  delay = 0,
  children,
}: {
  title: string;
  className?: string;
  /** Stagger delay for the group's fade-in animation. */
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <FadeIn delay={delay} offsetY={10}>
      <View className={className}>
        <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold px-4 mb-2">
          {title}
        </Text>
        <View
          className="bg-surface mx-4 rounded-2xl border border-line-light overflow-hidden"
          style={{
            shadowColor: '#0c831f',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          {children}
        </View>
      </View>
    </FadeIn>
  );
}
