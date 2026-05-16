import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, ChevronRight, Coins } from 'lucide-react-native';
import { notificationsApi } from '@xelnova/api';
import { AnimatedCounter, PressableScale } from '@xelnova/ui-native';
import { useAuth } from '../../lib/auth-context';
import { queryKeys } from '../../lib/query-keys';
import { formatRupees } from '../../lib/format';

/**
 * 5-tier ladder. The first tier the user is short of becomes the "next"
 * goal; once they hit `Diamond` we collapse the bar to "Top tier".
 */
const TIERS: { name: string; min: number; color: string }[] = [
  { name: 'Bronze', min: 0, color: '#a16207' },
  { name: 'Silver', min: 500, color: '#71717a' },
  { name: 'Gold', min: 1500, color: '#ca8a04' },
  { name: 'Platinum', min: 3500, color: '#0e7490' },
  { name: 'Diamond', min: 7500, color: '#7c3aed' },
];

function pickTier(points: number) {
  let current = TIERS[0]!;
  for (const t of TIERS) {
    if (points >= t.min) current = t;
  }
  const next = TIERS.find((t) => t.min > points) ?? null;
  return { current, next };
}

/**
 * Loyalty progress strip. Shows the user's current coin balance and a
 * progress bar to the next tier. Hidden entirely for guests so the home
 * screen stays browse-first.
 */
export function LoyaltyProgress() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const balanceQuery = useQuery({
    queryKey: queryKeys.loyalty.balance(),
    queryFn: () => notificationsApi.getLoyaltyBalance(),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const points = (balanceQuery.data as { points?: number } | undefined)?.points ?? 0;
  const { current, next } = pickTier(points);

  const target = next
    ? Math.min(1, (points - current.min) / (next.min - current.min))
    : 1;

  const progress = useRef(new Animated.Value(0)).current;
  // Drives the gold shimmer that sweeps left → right across the bar
  // once the value lands. Loops every few seconds so the card has a
  // gentle "alive" pulse without becoming distracting.
  const shimmer = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);

  const handleBarLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    Animated.timing(progress, {
      toValue: target,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, target]);

  useEffect(() => {
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1300,
          delay: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    sweep.start();
    return () => sweep.stop();
  }, [shimmer]);

  if (!isAuthenticated) return null;
  if (balanceQuery.isLoading) return null;

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const remaining = next ? next.min - points : 0;

  return (
    <View className="px-4">
      <PressableScale
        onPress={() => router.push('/account/loyalty')}
        pressScale={0.97}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: current.color,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <LinearGradient
          colors={['#0a3d1a', '#11ab3a', '#42c662']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 16 }}
        >
          <View className="flex-row items-center gap-3">
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={24} color="#ffd966" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                {`${current.name} member`}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Coins size={14} color="#ffd966" />
                <AnimatedCounter
                  value={points}
                  className="text-lg font-extrabold text-white"
                />
                <Text className="text-xs font-semibold text-white/85 ml-0.5">
                  coins
                </Text>
                <View className="flex-1" />
                <Text className="text-[11px] font-bold text-white/85">
                  {`Worth ${formatRupees(points / 10)}`}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#ffffff" />
          </View>

          <View className="mt-3">
            <View
              onLayout={handleBarLayout}
              style={{
                height: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.2)',
                overflow: 'hidden',
              }}
            >
              <Animated.View
                style={{
                  width: widthInterpolated,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: '#ffd966',
                  overflow: 'hidden',
                }}
              >
                {barWidth > 0 ? (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      width: 60,
                      backgroundColor: '#ffffff',
                      opacity: shimmer.interpolate({
                        inputRange: [0, 0.15, 0.85, 1],
                        outputRange: [0, 0.55, 0.55, 0],
                      }),
                      transform: [
                        {
                          translateX: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-60, barWidth + 60],
                          }),
                        },
                        { skewX: '-20deg' },
                      ],
                    }}
                  />
                ) : null}
              </Animated.View>
            </View>
            <Text className="text-[11px] font-semibold text-white/90 mt-1.5">
              {next
                ? `${remaining.toLocaleString('en-IN')} coins to ${next.name}`
                : 'You\u2019re at the top tier — keep shopping for more rewards'}
            </Text>
          </View>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}
