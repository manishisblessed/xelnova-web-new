import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  MapPin,
  Mic,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { Button } from '@xelnova/ui-native';
import { markPermissionsCompleted } from '../src/lib/local-history';
import { tryDetectAndCacheLocality } from '../src/lib/locality';
import {
  getCameraPermission,
  getLocationPermission,
  getMicrophonePermission,
  getNotificationPermission,
  openAppSettings,
  requestCameraPermission,
  requestLocationPermission,
  requestMicrophonePermission,
  requestNotificationPermission,
  type PermissionResult,
  type PermissionState,
} from '../src/lib/permissions';

type Key = 'location' | 'notifications' | 'camera' | 'microphone';

interface RowSpec {
  key: Key;
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  fetch: () => Promise<PermissionResult>;
  request: () => Promise<PermissionResult>;
}

const ROWS: RowSpec[] = [
  {
    key: 'location',
    Icon: MapPin,
    iconColor: '#0c831f',
    iconBg: '#ecfdf3',
    title: 'Location',
    body: 'Set your delivery address and see what ships fast to your area.',
    fetch: getLocationPermission,
    request: requestLocationPermission,
  },
  {
    key: 'notifications',
    Icon: Bell,
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    title: 'Notifications',
    body: 'Get order updates, delivery tracking and offer alerts.',
    fetch: getNotificationPermission,
    request: requestNotificationPermission,
  },
  {
    key: 'camera',
    Icon: Camera,
    iconColor: '#b07a00',
    iconBg: '#fffbeb',
    title: 'Camera',
    body: 'Search products by photo, snap return photos and update your avatar.',
    fetch: getCameraPermission,
    request: requestCameraPermission,
  },
  {
    key: 'microphone',
    Icon: Mic,
    iconColor: '#a78bfa',
    iconBg: '#f5f3ff',
    title: 'Microphone',
    body: 'Search hands-free with voice — say what you need.',
    fetch: getMicrophonePermission,
    request: requestMicrophonePermission,
  },
];

type Status = PermissionState | 'requesting';

type StatusMap = Record<Key, Status>;

const initialStatus: StatusMap = {
  location: 'undetermined',
  notifications: 'undetermined',
  camera: 'undetermined',
  microphone: 'undetermined',
};

/**
 * First-launch permissions wizard.
 *
 * Routed to from `OnboardingGate` once `hasOnboarded()` is true but
 * `hasCompletedPermissions()` is still false. We never re-prompt
 * automatically — the flag is sticky regardless of whether each row was
 * granted, denied, or skipped. Users can change grants any time from
 * `/account/settings`.
 */
export default function PermissionsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusMap>(initialStatus);

  // Refresh statuses on mount (covers the case where the user already
  // granted some permissions through the OS settings before reaching us).
  useEffect(() => {
    let alive = true;
    Promise.all(ROWS.map((r) => r.fetch())).then((results) => {
      if (!alive) return;
      setStatus((prev) => {
        const next: StatusMap = { ...prev };
        ROWS.forEach((r, idx) => {
          next[r.key] = results[idx].state;
        });
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  const onRequest = useCallback(async (row: RowSpec) => {
    setStatus((prev) => ({ ...prev, [row.key]: 'requesting' }));
    const result = await row.request();
    setStatus((prev) => ({ ...prev, [row.key]: result.state }));
    if (result.blocked) {
      // OS won't ask again — surface settings as the next step.
      openAppSettings();
      return;
    }
    // Cache the detected locality once so the marketplace header has
    // something to render without re-prompting on every launch.
    if (row.key === 'location' && result.state === 'granted') {
      tryDetectAndCacheLocality().catch(() => {});
    }
  }, []);

  const finish = useCallback(async () => {
    await markPermissionsCompleted();
    router.replace('/(tabs)');
  }, [router]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable onPress={finish} hitSlop={8}>
          <Text className="text-sm font-semibold text-ink-secondary">Skip</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <View
          style={{ backgroundColor: '#ecfdf3' }}
          className="w-16 h-16 rounded-full items-center justify-center mb-5"
        >
          <ShieldCheck size={28} color="#0c831f" />
        </View>
        <Text className="font-display text-3xl font-extrabold text-ink leading-tight">
          Set up Xelnova for you
        </Text>
        <Text className="mt-2 text-base text-ink-secondary leading-relaxed">
          Tap each row to enable. You can change these any time from Settings.
          We never ask again.
        </Text>

        <View className="mt-6 gap-3">
          {ROWS.map((row) => (
            <PermissionRow
              key={row.key}
              row={row}
              status={status[row.key]}
              onRequest={() => onRequest(row)}
            />
          ))}
        </View>
      </ScrollView>

      <View className="px-6 pb-6 pt-2">
        <Button size="lg" fullWidth onPress={finish}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

function PermissionRow({
  row,
  status,
  onRequest,
}: {
  row: RowSpec;
  status: Status;
  onRequest: () => void;
}) {
  const isGranted = status === 'granted';
  const isRequesting = status === 'requesting';
  const isDenied = status === 'denied';

  return (
    <Pressable
      onPress={isGranted || isRequesting ? undefined : onRequest}
      className="bg-surface border border-line-light rounded-2xl p-4 flex-row items-start gap-3 active:bg-surface-muted"
      disabled={isGranted || isRequesting}
    >
      <View
        style={{ backgroundColor: row.iconBg }}
        className="w-12 h-12 rounded-xl items-center justify-center"
      >
        <row.Icon size={22} color={row.iconColor} />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-ink">{row.title}</Text>
          {isGranted ? (
            <View className="flex-row items-center gap-1 bg-success-50 rounded-full px-2 py-0.5">
              <Check size={12} color="#047857" />
              <Text className="text-[11px] font-semibold text-success-700">
                Allowed
              </Text>
            </View>
          ) : null}
          {isDenied ? (
            <View className="bg-danger-50 rounded-full px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-danger-700">
                Tap to open settings
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-sm text-ink-secondary leading-relaxed mt-1">
          {row.body}
        </Text>
      </View>

      {isGranted ? null : (
        <ChevronRight size={20} color="#8d95a5" style={{ marginTop: 4 }} />
      )}
    </Pressable>
  );
}
