import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { cn } from './cn';

export type SectionAccentTone =
  | 'primary'
  | 'accent'
  | 'danger'
  | 'teal'
  | 'lavender'
  | 'none';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** "See all" / "View more" CTA. Hidden if not provided. */
  actionLabel?: string;
  onActionPress?: () => void;
  /** Use larger title for hero sections (home top), default for rails. */
  size?: 'sm' | 'md' | 'lg';
  /** Color of the underline accent under the title. Defaults to `primary`. */
  accent?: SectionAccentTone;
  className?: string;
}

const titleSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
} as const;

const ACCENT_COLOR: Record<Exclude<SectionAccentTone, 'none'>, string> = {
  primary: '#11ab3a',
  accent: '#f5b800',
  danger: '#dc2626',
  teal: '#1f8f89',
  lavender: '#a78bfa',
};

/**
 * Header used at the top of every home/search section. The title gets a
 * colored underline that slides from 0-px to 28-px on mount, giving each
 * section a subtle "reveal" without stealing attention. The "See all"
 * CTA's chevron nudges right on press for tactile feedback.
 *
 * The underline color rotates by section (set per call site via the
 * `accent` prop) so the home page reads as a row of distinctly themed
 * sections rather than one uniform list.
 */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  size = 'md',
  accent = 'primary',
  className,
}: SectionHeaderProps) {
  const width = useRef(new Animated.Value(0)).current;
  const chevron = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: 28,
      duration: 350,
      useNativeDriver: false,
      delay: 80,
    }).start();
  }, [width]);

  const onPressIn = () => {
    Animated.spring(chevron, {
      toValue: 4,
      tension: 200,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(chevron, {
      toValue: 0,
      tension: 220,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const accentColor =
    accent === 'none' ? 'transparent' : ACCENT_COLOR[accent];

  return (
    <View
      className={cn('flex-row items-end justify-between px-4 mb-3', className)}
    >
      <View className="flex-1 pr-3">
        <Text className={cn('font-extrabold text-ink', titleSizes[size])}>
          {title}
        </Text>
        {accent !== 'none' ? (
          <Animated.View
            style={{
              width,
              height: 3,
              borderRadius: 2,
              backgroundColor: accentColor,
              marginTop: 4,
            }}
          />
        ) : null}
        {subtitle ? (
          <Text className="text-xs text-ink-secondary mt-1">{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          className="flex-row items-center active:opacity-60"
          hitSlop={8}
        >
          <Text className="text-sm font-semibold text-primary-600">
            {actionLabel}
          </Text>
          <Animated.View style={{ transform: [{ translateX: chevron }] }}>
            <ChevronRight size={16} color="#0c831f" />
          </Animated.View>
        </Pressable>
      ) : null}
    </View>
  );
}
