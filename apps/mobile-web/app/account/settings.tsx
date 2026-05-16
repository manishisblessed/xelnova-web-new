import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  Bell,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { MenuRow } from '../../src/components/account/menu-row';
import { useAuth } from '../../src/lib/auth-context';
import {
  getPushPermissionGranted,
  registerForPushNotificationsAsync,
} from '../../src/lib/push-notifications';

const PRIVACY_URL = 'https://xelnova.in/privacy';
const TERMS_URL = 'https://xelnova.in/terms';
const CONTACT_URL = 'https://xelnova.in/contact';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [pushSwitching, setPushSwitching] = useState(false);

  useEffect(() => {
    let alive = true;
    getPushPermissionGranted()
      .then((granted) => alive && setPushGranted(granted))
      .catch(() => alive && setPushGranted(false));
    return () => {
      alive = false;
    };
  }, []);

  const togglePush = async () => {
    if (pushSwitching) return;
    if (pushGranted) {
      Alert.alert(
        'Disable notifications',
        'You can turn notifications back on from your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open settings',
            onPress: () => Linking.openSettings().catch(() => {}),
          },
        ],
      );
      return;
    }
    setPushSwitching(true);
    try {
      const token = await registerForPushNotificationsAsync();
      const granted = await getPushPermissionGranted();
      setPushGranted(granted);
      if (!token && !granted) {
        Alert.alert(
          'Permission required',
          'Enable notifications from your device settings to receive order and offer alerts.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => Linking.openSettings().catch(() => {}),
            },
          ],
        );
      }
    } finally {
      setPushSwitching(false);
    }
  };

  const onLogout = () =>
    Alert.alert('Sign out?', 'You will need to log in again to view your orders.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'For your security, account deletion is processed by our team. Open a support ticket and we\'ll handle it within 48 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open ticket',
          style: 'destructive',
          onPress: () => router.push('/account/support/new'),
        },
      ],
    );
  };

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <SectionGroup title="Notifications" className="mt-4">
          <View className="flex-row items-center gap-3 px-4 py-3.5">
            <View
              style={{ backgroundColor: '#eff6ff' }}
              className="w-10 h-10 rounded-xl items-center justify-center"
            >
              <Bell size={18} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink">
                Push notifications
              </Text>
              <Text className="text-xs text-ink-secondary mt-0.5">
                {pushGranted
                  ? 'Order updates and offers will arrive instantly'
                  : 'Disabled in system settings'}
              </Text>
            </View>
            <Switch
              value={!!pushGranted}
              onValueChange={togglePush}
              disabled={pushSwitching}
              trackColor={{ false: '#cbd5e0', true: '#11ab3a' }}
              thumbColor="#ffffff"
            />
          </View>
        </SectionGroup>

        <SectionGroup title="Account" className="mt-4">
          <MenuRow
            Icon={Lock}
            label="Change password"
            description="Update your sign-in password"
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            onPress={() => router.push('/account/security')}
          />
          <MenuRow
            Icon={ShieldCheck}
            label="Profile details"
            description={user?.email ?? user?.phone ?? 'Edit your details'}
            onPress={() => router.push('/account/profile')}
          />
        </SectionGroup>

        <SectionGroup title="About" className="mt-4">
          <MenuRow
            Icon={FileText}
            label="Terms of service"
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            trailing={<ExternalLink size={14} color="#8d95a5" />}
            onPress={() => open(TERMS_URL)}
          />
          <MenuRow
            Icon={ShieldCheck}
            label="Privacy policy"
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            trailing={<ExternalLink size={14} color="#8d95a5" />}
            onPress={() => open(PRIVACY_URL)}
          />
          <MenuRow
            Icon={Mail}
            label="Contact us"
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            trailing={<ExternalLink size={14} color="#8d95a5" />}
            onPress={() => open(CONTACT_URL)}
          />
          <MenuRow
            Icon={Globe}
            label="Language"
            description="English (India)"
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            onPress={() =>
              Alert.alert(
                'Coming soon',
                'Additional languages will be available in a future update.',
              )
            }
          />
          <MenuRow
            Icon={Info}
            label="App version"
            description={`Xelnova v${version}`}
            iconColor="#5a6478"
            iconBackground="#f1f5f9"
            onPress={undefined}
          />
        </SectionGroup>

        <SectionGroup title="Danger zone" className="mt-4">
          <MenuRow
            Icon={LogOut}
            label="Sign out"
            destructive
            onPress={onLogout}
          />
          <MenuRow
            Icon={Trash2}
            label="Delete my account"
            description="Permanently remove your account and data"
            destructive
            onPress={onDeleteAccount}
          />
        </SectionGroup>

        <Text className="text-center text-[11px] text-ink-muted mt-6">
          {`Xelnova \u00b7 v${version}`}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionGroup({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <View className={className}>
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold px-4 mb-2">
        {title}
      </Text>
      <View className="bg-surface mx-4 rounded-2xl border border-line-light overflow-hidden">
        {children}
      </View>
    </View>
  );
}
