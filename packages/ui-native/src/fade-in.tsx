import { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export interface FadeInProps {
  children: React.ReactNode;
  /** Vertical offset (px) to translate from. Defaults to 14. */
  offsetY?: number;
  /** Animation duration in ms. Defaults to 420. */
  duration?: number;
  /** Delay before starting (ms). Defaults to 0. */
  delay?: number;
  /** Style applied to the outer Animated.View. */
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * Fades + slides its children into place on mount. Used to give home /
 * search sections a soft "appearance" as the user scrolls and they
 * mount via list virtualization or as the page first paints.
 *
 * Pure RN core `Animated` so no extra deps. The animation runs once per
 * mount — there's no intersection-observer behaviour. That's good enough
 * for above-the-fold sections; for below-the-fold reveal we'd need a
 * `useInView` hook (Reanimated). Skipped for now to keep the install
 * surface small.
 */
export function FadeIn({
  children,
  offsetY = 14,
  duration = 420,
  delay = 0,
  style,
  className,
}: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offsetY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, opacity, translateY]);

  return (
    <Animated.View
      style={[{ opacity, transform: [{ translateY }] }, style]}
      className={className}
    >
      {children}
    </Animated.View>
  );
}
