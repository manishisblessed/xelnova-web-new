import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { cn } from './cn';

export interface StarsProps {
  /** Current rating value, 0..5. Half-stars round up to filled when displayed. */
  value: number;
  /** Receive a new value 1..5 when the user taps a star. Omit for read-only. */
  onChange?: (value: number) => void;
  size?: number;
  /** Foreground color for filled stars. */
  color?: string;
  className?: string;
}

/**
 * Five-star rating row. When `onChange` is provided each star is tappable;
 * otherwise it renders as a read-only display (used in summaries).
 */
export function Stars({
  value,
  onChange,
  size = 20,
  color = '#f5b800',
  className,
}: StarsProps) {
  const stars = [1, 2, 3, 4, 5];
  const interactive = typeof onChange === 'function';

  return (
    <View className={cn('flex-row items-center', className)}>
      {stars.map((idx) => {
        const filled = idx <= Math.round(value);
        const StarNode = (
          <Star
            size={size}
            color={filled ? color : '#cdd1d8'}
            fill={filled ? color : 'transparent'}
          />
        );
        if (interactive) {
          return (
            <Pressable
              key={idx}
              onPress={() => onChange?.(idx)}
              hitSlop={4}
              className="px-0.5 active:opacity-60"
            >
              {StarNode}
            </Pressable>
          );
        }
        return (
          <View key={idx} className="px-0.5">
            {StarNode}
          </View>
        );
      })}
    </View>
  );
}
