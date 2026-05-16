import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { ChevronUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../../lib/haptics';

interface Props {
  /** Drives visibility — fade-in once user has scrolled past `threshold`. */
  scrollY: Animated.Value;
  /** Scroll distance (px) at which the FAB starts to appear. */
  threshold?: number;
  /** Called when the user taps the FAB. Should scroll the parent to 0. */
  onPress: () => void;
}

/**
 * Bottom-right floating action button that appears once the user has
 * scrolled past `threshold` pixels. Driven directly off the parent's
 * `scrollY` animated value so it stays in sync without any bridge
 * round-trips.
 *
 * The visibility transition crossfades opacity AND scales/translates
 * the button up, so it feels like the button "rises" into place rather
 * than abruptly popping.
 */
export function ScrollToTopFAB({
  scrollY,
  threshold = 480,
  onPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const press = useRef(new Animated.Value(1)).current;

  // Listener-based fallback so we can disable hit detection cleanly
  // when fully invisible — `pointerEvents` is a prop, not an animatable
  // value, so we toggle it via state-less ref to avoid extra re-renders.
  const wrapperRef = useRef<View>(null);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const visible = value > threshold * 0.5;
      wrapperRef.current?.setNativeProps({
        pointerEvents: visible ? 'box-none' : 'none',
      });
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, threshold]);

  const opacity = scrollY.interpolate({
    inputRange: [threshold * 0.4, threshold, threshold + 40],
    outputRange: [0, 0.85, 1],
    extrapolate: 'clamp',
  });
  const translateY = scrollY.interpolate({
    inputRange: [threshold * 0.4, threshold + 40],
    outputRange: [16, 0],
    extrapolate: 'clamp',
  });
  const scale = scrollY.interpolate({
    inputRange: [threshold * 0.4, threshold + 40],
    outputRange: [0.6, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      ref={wrapperRef}
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 16,
        // Offset above the bottom tab bar (~64-px tab + bottom inset).
        bottom: insets.bottom + 78,
      }}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }, { scale }, { scale: press }],
          shadowColor: '#0c831f',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <Pressable
          onPress={() => {
            hapticLight();
            onPress();
          }}
          onPressIn={() => {
            Animated.spring(press, {
              toValue: 0.92,
              useNativeDriver: true,
              tension: 280,
              friction: 12,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(press, {
              toValue: 1,
              useNativeDriver: true,
              tension: 240,
              friction: 8,
            }).start();
          }}
          hitSlop={6}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#11ab3a',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#ffffff',
          }}
        >
          <ChevronUp size={22} color="#ffffff" strokeWidth={2.4} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
