import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * `@xelnova/ui-native` is platform-only and never imports `expo-haptics`
 * directly (so it stays usable from the web package too). Apps that
 * want press-time haptics register a handler once at startup via
 * `setHapticsHandler`. `PressableScale` then forwards the requested
 * intensity to that handler when its `haptic` prop is set.
 */
export type HapticIntensity = 'selection' | 'light' | 'medium' | 'heavy';

let registeredHandler: ((intensity: HapticIntensity) => void) | null = null;

/** Wire the app's haptics implementation into `@xelnova/ui-native`. */
export function setHapticsHandler(
  handler: ((intensity: HapticIntensity) => void) | null,
): void {
  registeredHandler = handler;
}

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Target scale factor while pressed. Defaults to 0.96. */
  pressScale?: number;
  /** Custom spring tension. Defaults to a tight, fast spring. */
  tension?: number;
  /** Custom spring friction. Higher = less bouncy. */
  friction?: number;
  /** Style applied to the outer Animated.View. */
  style?: StyleProp<ViewStyle>;
  /** Tailwind class. NativeWind style merging is delegated to consumer. */
  className?: string;
  /**
   * Trigger a haptic tap on press in. Defaults to `'selection'` — set to
   * `false` to opt out (e.g. when the consumer fires its own haptic in
   * `onPress`).
   */
  haptic?: HapticIntensity | false;
}

/**
 * Pressable that springs the scale of its child down on `pressIn` and
 * back to 1 on `pressOut`. Used app-wide for product cards, rich tiles,
 * service chips and any tappable surface where we want haptic-feeling
 * feedback without drowning the screen in animations.
 *
 * Uses RN's core `Animated` (native driver) so the spring runs off the
 * UI thread and stays smooth even mid-scroll.
 */
export function PressableScale({
  pressScale = 0.96,
  tension = 250,
  friction = 14,
  style,
  className,
  haptic = 'selection',
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      tension,
      friction,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        springTo(pressScale);
        if (haptic && registeredHandler) {
          try {
            registeredHandler(haptic);
          } catch {
            // Haptics are pure feedback — never let them break a press.
          }
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        springTo(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View
        style={[{ transform: [{ scale }] }, style]}
        className={className}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
