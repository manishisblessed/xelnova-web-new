import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift, Share2, Sparkles } from 'lucide-react-native';
import { notificationsApi } from '@xelnova/api';
import { PressableScale } from '@xelnova/ui-native';
import { useAuth } from '../../lib/auth-context';
import { queryKeys } from '../../lib/query-keys';
import { shareReferralCode } from '../../lib/share';

/**
 * Refer & earn CTA card. Always visible — for guests it routes them to
 * sign in (so they can pull a code), for authenticated users it shares
 * their code via the system share sheet.
 *
 * Uses a dual gradient + sparkle accents to read like a "premium"
 * marketing card without becoming visually loud.
 */
export function ReferAndEarn() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const referralQuery = useQuery({
    queryKey: queryKeys.loyalty.referral(),
    queryFn: () => notificationsApi.getReferralCode(),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30 * 60_000,
  });

  const handlePress = async () => {
    if (!isAuthenticated) {
      router.push({
        pathname: '/(auth)/login',
        params: { next: '/account/loyalty' },
      });
      return;
    }
    const code = (referralQuery.data as { code?: string } | undefined)?.code;
    if (code) {
      try {
        await shareReferralCode(code);
      } catch {
        router.push('/account/loyalty');
      }
      return;
    }
    router.push('/account/loyalty');
  };

  return (
    <View className="px-4">
      <PressableScale
        onPress={handlePress}
        pressScale={0.97}
        style={{
          borderRadius: 22,
          overflow: 'hidden',
          shadowColor: '#7c3aed',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={['#1a1a2c', '#2a1d4a', '#5b1d8a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 18 }}
        >
          <View className="flex-row items-start gap-3">
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.16)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Gift size={28} color="#ffd966" />
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-1 mb-0.5">
                <Sparkles size={12} color="#ffd966" />
                <Text className="text-[10px] font-extrabold uppercase tracking-wider text-[#ffd966]">
                  Refer & earn
                </Text>
              </View>
              <Text className="text-base font-extrabold text-white">
                Invite friends, earn 250 coins
              </Text>
              <Text className="text-xs text-white/80 mt-1 leading-5">
                Your friend gets a welcome bonus, you earn coins when they
                place their first order.
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-4 bg-white/12 rounded-xl px-3 py-2.5">
            <View className="flex-row items-center gap-2">
              <Share2 size={14} color="#ffffff" />
              <Text className="text-xs font-bold text-white">
                {isAuthenticated ? 'Share your code' : 'Sign in to share'}
              </Text>
            </View>
            <View className="bg-[#ffd966] rounded-full px-3 py-1">
              <Text className="text-[11px] font-extrabold text-[#3a1a00] uppercase tracking-wider">
                Invite now
              </Text>
            </View>
          </View>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}
