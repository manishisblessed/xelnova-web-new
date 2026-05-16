import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, type LucideIcon } from 'lucide-react-native';
import { PressableScale } from '@xelnova/ui-native';

interface Props {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryHref: Href;
  secondaryLabel?: string;
  secondaryHref?: Href;
  /** Two-stop gradient stops for the icon halo. */
  halo?: [string, string];
  /** Tone color for the icon + accent text. */
  accent?: string;
}

/**
 * Centered "empty state" used for cart / wishlist when there's nothing
 * to show. Wraps the bare icon in a soft halo gradient with three
 * pulsing sparkles around it, then a CTA button + optional secondary
 * text link. Reads as a "moment" rather than a placeholder.
 *
 * Uses RN core `Animated` only — no extra deps.
 */
export function BrandedEmptyState({
  Icon,
  title,
  subtitle,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  halo = ['#dcfce7', '#bbf7d0'],
  accent = '#0c831f',
}: Props) {
  const router = useRouter();
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: 1600,
            delay,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      );

    const a = loop(sparkle1, 0);
    const b = loop(sparkle2, 500);
    const c = loop(sparkle3, 1000);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [sparkle1, sparkle2, sparkle3]);

  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="items-center justify-center mb-5">
        <Sparkle anim={sparkle1} top={-12} left={-30} size={10} color={accent} />
        <Sparkle anim={sparkle2} top={6} left={36} size={8} color={accent} />
        <Sparkle anim={sparkle3} top={-22} left={32} size={6} color={accent} />
        <Sparkle anim={sparkle2} top={32} left={-26} size={7} color={accent} />

        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            overflow: 'hidden',
            shadowColor: accent,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <LinearGradient
            colors={halo}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={36} color={accent} />
            </View>
          </LinearGradient>
        </View>
      </View>

      <Text className="text-lg font-extrabold text-ink text-center">
        {title}
      </Text>
      <Text className="text-sm text-ink-secondary text-center mt-1.5 leading-relaxed">
        {subtitle}
      </Text>

      <PressableScale
        onPress={() => router.push(primaryHref)}
        pressScale={0.94}
        haptic="medium"
        style={{
          marginTop: 24,
          borderRadius: 999,
          overflow: 'hidden',
          shadowColor: accent,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={['#11ab3a', '#0c831f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 24,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles size={16} color="#ffffff" />
          <Text className="text-sm font-extrabold text-white uppercase tracking-wider">
            {primaryLabel}
          </Text>
        </LinearGradient>
      </PressableScale>

      {secondaryLabel && secondaryHref ? (
        <Text
          onPress={() => router.push(secondaryHref)}
          className="text-xs font-semibold text-ink-secondary mt-4 underline"
        >
          {secondaryLabel}
        </Text>
      ) : null}
    </View>
  );
}

function Sparkle({
  anim,
  top,
  left,
  size,
  color,
}: {
  anim: Animated.Value;
  top: number;
  left: number;
  size: number;
  color: string;
}) {
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 1, 0.2],
  });
  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1.1, 0.6],
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}
