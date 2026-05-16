import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';

export interface AnimatedHeartProps {
  /** Filled state. Pulse fires whenever this flips from `false` → `true`. */
  active: boolean;
  /** Tap handler. Fired immediately, before any animation completes. */
  onToggle: () => void;
  size?: number;
  /** Color of the heart when not active. */
  inactiveColor?: string;
  /** Color of the heart + ring when active. */
  activeColor?: string;
  /** Disabled hit target — keeps the visual state but ignores taps. */
  disabled?: boolean;
  /** Style applied to the outer Pressable wrapper. */
  style?: StyleProp<ViewStyle>;
  /** Tailwind class merged into the wrapper. */
  className?: string;
  /** Override the default 32-px hit slop. */
  hitSlop?: number;
}

/**
 * Heart icon with a "like" pop:
 *  - On press, the icon springs from 1 → 1.35 → 1 with a tight spring.
 *  - When `active` flips false → true (i.e. the user just liked it), an
 *    expanding ring radiates outward and fades, mirroring the Instagram
 *    / Twitter "like" affordance.
 *
 * The heart fill/stroke color is animated via the icon `color`/`fill`
 * props (not natively interpolatable), so the color flip is instant —
 * the scale/ring carry the motion.
 */
export function AnimatedHeart({
  active,
  onToggle,
  size = 22,
  inactiveColor = '#1a1a2e',
  activeColor = '#ef4444',
  disabled,
  style,
  className,
  hitSlop = 8,
}: AnimatedHeartProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const prevActive = useRef(active);

  useEffect(() => {
    if (active && !prevActive.current) {
      ring.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1.35,
            useNativeDriver: true,
            tension: 320,
            friction: 6,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 220,
            friction: 8,
          }),
        ]),
        Animated.timing(ring, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!active && prevActive.current) {
      Animated.spring(scale, {
        toValue: 0.85,
        useNativeDriver: true,
        tension: 280,
        friction: 10,
      }).start(() => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 240,
          friction: 8,
        }).start();
      });
    }
    prevActive.current = active;
  }, [active, ring, scale]);

  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 2.4],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.25, 0],
  });

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        onToggle();
      }}
      hitSlop={hitSlop}
      style={style}
      className={className}
    >
      <Animated.View
        style={{
          width: size + 8,
          height: size + 8,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            borderWidth: 2,
            borderColor: activeColor,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }}
        />
        <Heart
          size={size}
          color={active ? activeColor : inactiveColor}
          fill={active ? activeColor : 'transparent'}
          strokeWidth={active ? 0 : 2}
        />
      </Animated.View>
    </Pressable>
  );
}
