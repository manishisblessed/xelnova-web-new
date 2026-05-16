import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, type StyleProp, type TextStyle } from 'react-native';

export interface AnimatedCounterProps {
  /** Target numeric value. The component animates from the previous to this. */
  value: number;
  /** Animation duration in ms. Defaults to 700. */
  duration?: number;
  /** Locale for `Number#toLocaleString`. Defaults to `'en-IN'`. */
  locale?: string;
  /** Text classes (NativeWind). */
  className?: string;
  /** Text inline style. */
  style?: StyleProp<TextStyle>;
  /** Optional formatter — overrides `toLocaleString`. */
  format?: (n: number) => string;
}

/**
 * "Count-up" number that smoothly animates to its target value. Used
 * for loyalty coins, stat counters, and any place we want a slot-machine
 * "tick" feel rather than a popping number swap.
 *
 * The animation re-fires whenever `value` changes — this is intentional
 * so a fresh balance from the API gets the same treatment as the
 * initial mount.
 *
 * Note: keeps the React tree's `Text` re-rendering each tick. We sample
 * the Animated.Value via a listener and bump local state at most once
 * per animation frame; performance is fine for the small "1 of these
 * per screen" usage we have today.
 */
export function AnimatedCounter({
  value,
  duration = 700,
  locale = 'en-IN',
  className,
  style,
  format,
}: AnimatedCounterProps) {
  const animated = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  const lastTarget = useRef(0);

  useEffect(() => {
    const id = animated.addListener(({ value: v }) => {
      const rounded = Math.round(v);
      setDisplay((prev) => (prev === rounded ? prev : rounded));
    });
    return () => animated.removeListener(id);
  }, [animated]);

  useEffect(() => {
    Animated.timing(animated, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    lastTarget.current = value;
  }, [animated, duration, value]);

  const formatted = format
    ? format(display)
    : display.toLocaleString(locale);

  return (
    <Text className={className} style={style}>
      {formatted}
    </Text>
  );
}
