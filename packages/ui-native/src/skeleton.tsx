import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import { cn } from './cn';

export interface SkeletonProps extends Omit<ViewProps, 'children' | 'style'> {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  style?: ViewProps['style'];
  /** Disable the moving highlight (e.g. when many skeletons stack and the
   * sweep becomes visually noisy). Pulse stays on. */
  shimmer?: boolean;
}

const roundedClasses = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
} as const;

/**
 * Loading placeholder with a soft pulse + a horizontally translating
 * highlight bar (the "shimmer" sweep). Both animations use RN's core
 * `Animated` so we don't push extra deps into `@xelnova/ui-native`.
 *
 * The highlight is layout-aware — it translates from -width to +width
 * based on the measured layout box, so short skeletons (e.g. 60-px tag
 * pills) and tall ones (e.g. 240-px hero cards) shimmer at the same
 * pace.
 */
export function Skeleton({
  className,
  rounded = 'md',
  style,
  shimmer = true,
  ...rest
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  useEffect(() => {
    if (!shimmer || width === 0) return;
    sweep.setValue(0);
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep, shimmer, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <Animated.View
      onLayout={onLayout}
      style={[{ opacity }, style]}
      className={cn(
        'bg-surface-muted overflow-hidden',
        roundedClasses[rounded],
        className,
      )}
      {...(rest as ViewProps)}
    >
      {shimmer && width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: Math.max(80, width * 0.55),
            backgroundColor: 'rgba(255, 255, 255, 0.55)',
            transform: [{ translateX }, { skewX: '-15deg' }],
          }}
        />
      ) : null}
      <View />
    </Animated.View>
  );
}
