import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Sparkles } from 'lucide-react-native';
import { hapticLight } from '../../lib/haptics';

const LOGO_SOURCE = require('../../../assets/icon.png') as number;

interface Props {
  onRefresh: () => void;
}

/**
 * "You're all caught up" footer that closes out the home feed. A
 * scattering of soft sparkles drifts behind the brand mark while the
 * tagline animates into place. Provides a final beat of polish so the
 * scroll doesn't end on a hard cut-off.
 */
export function EndOfFeed({ onRefresh }: Props) {
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: 1800,
            delay,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      );

    const a = loop(sparkle1, 0);
    const b = loop(sparkle2, 600);
    const c = loop(sparkle3, 1200);
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
    <View className="px-4 pt-6 pb-3 items-center">
      <View className="relative items-center justify-center">
        <Sparkle anim={sparkle1} top={-4} left={-22} size={10} />
        <Sparkle anim={sparkle2} top={-12} left={28} size={8} />
        <Sparkle anim={sparkle3} top={6} left={-32} size={6} />
        <Sparkle anim={sparkle2} top={-2} left={36} size={7} />

        <View
          className="w-14 h-14 rounded-2xl bg-surface items-center justify-center"
          style={{
            shadowColor: '#0c831f',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 10,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#e6f4ed',
          }}
        >
          <ExpoImage
            source={LOGO_SOURCE}
            style={{ width: 40, height: 40 }}
            contentFit="contain"
          />
        </View>
      </View>

      <Text className="text-base font-extrabold text-ink mt-3">
        {'You\u2019re all caught up'}
      </Text>
      <Text className="text-xs text-ink-secondary mt-1 text-center px-8 leading-5">
        {'That\u2019s everything we have for you today.\nPull down or tap below to refresh the feed.'}
      </Text>

      <Pressable
        onPress={() => {
          hapticLight();
          onRefresh();
        }}
        hitSlop={6}
        className="mt-4 flex-row items-center gap-1.5 bg-primary-50 active:bg-primary-100 rounded-full px-4 py-2 border border-primary-200"
      >
        <Sparkles size={14} color="#0c831f" />
        <Text className="text-xs font-extrabold text-primary-700 uppercase tracking-wider">
          Refresh feed
        </Text>
      </Pressable>

      <Text className="text-[10px] text-ink-muted mt-5 uppercase tracking-[2px]">
        {'xelnova \u00b7 shop. save. smile.'}
      </Text>
    </View>
  );
}

function Sparkle({
  anim,
  top,
  left,
  size,
}: {
  anim: Animated.Value;
  top: number;
  left: number;
  size: number;
}) {
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1, 0.9, 0.1],
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
        backgroundColor: '#f5b800',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}
