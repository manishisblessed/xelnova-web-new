import { ScrollView, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  Award,
  BadgePercent,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { PressableScale } from '@xelnova/ui-native';
import { useRequireAuth } from '../../lib/require-auth';

interface Chip {
  id: string;
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  href: Href;
  /** Auth-gated chip — shows for everyone but tap routes guests to login. */
  requiresAuth?: boolean;
}

const CHIPS: Chip[] = [
  {
    id: 'flash',
    Icon: Zap,
    iconColor: '#dc2626',
    iconBg: '#fef2f2',
    label: 'Flash deals',
    href: { pathname: '/search', params: { q: 'deals' } },
  },
  {
    id: 'budget',
    Icon: BadgePercent,
    iconColor: '#b07a00',
    iconBg: '#fffbeb',
    label: 'Under \u20B9299',
    href: { pathname: '/search', params: { q: 'affordable' } },
  },
  {
    id: 'new',
    Icon: Sparkles,
    iconColor: '#0c831f',
    iconBg: '#ecfdf3',
    label: 'New arrivals',
    href: { pathname: '/search', params: { q: 'new' } },
  },
  {
    id: 'loyalty',
    Icon: Award,
    iconColor: '#a78bfa',
    iconBg: '#f5f3ff',
    label: 'Loyalty',
    href: '/account/loyalty',
    requiresAuth: true,
  },
];

/**
 * Pattern A — service shortcut chips, rendered inside the marketplace
 * header. Mirrors the Flipkart/Amazon "vertical entry points" row at the
 * top of the home screen.
 *
 * Auth-gated chips show for everyone; the tap is routed through
 * `useRequireAuth` so guests bounce through `/(auth)/login?next=...` and
 * land on the target page after sign-in.
 */
export function ServiceChips() {
  const router = useRouter();
  const requireAuth = useRequireAuth();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
    >
      {CHIPS.map((chip) => (
        <PressableScale
          key={chip.id}
          pressScale={0.93}
          onPress={() => {
            if (chip.requiresAuth) {
              requireAuth(chip.href, () => router.push(chip.href));
            } else {
              router.push(chip.href);
            }
          }}
          className="flex-row items-center gap-2 bg-surface rounded-full pl-1.5 pr-3.5 h-9 border border-line-light"
        >
          <View
            style={{ backgroundColor: chip.iconBg }}
            className="w-7 h-7 rounded-full items-center justify-center"
          >
            <chip.Icon size={14} color={chip.iconColor} />
          </View>
          <Text className="text-xs font-bold text-ink">{chip.label}</Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}
