import { Pressable, Text, View } from 'react-native';
import { cn } from './cn';

export interface RadioCardProps {
  selected: boolean;
  onPress?: () => void;
  /** Slot rendered above the title. Useful for an icon. */
  leading?: React.ReactNode;
  title: string;
  description?: string;
  /** Slot rendered to the right of the title (e.g. price). */
  trailing?: React.ReactNode;
  /** Free-form content rendered below the description (e.g. nested fields). */
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Selectable card with a radio dot in the top-right corner. Used for address
 * picker, payment method picker, and shipping speed picker. Layout is
 * deliberately minimal so consumers can stack additional content via
 * `children`.
 */
export function RadioCard({
  selected,
  onPress,
  leading,
  title,
  description,
  trailing,
  children,
  disabled,
  className,
}: RadioCardProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className={cn(
        'rounded-2xl bg-surface border-2 p-4 active:opacity-90',
        selected ? 'border-primary-500' : 'border-line-light',
        disabled && 'opacity-50',
        className,
      )}
    >
      <View className="flex-row items-start gap-3">
        {leading ? <View className="pt-0.5">{leading}</View> : null}
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink">{title}</Text>
              {description ? (
                <Text className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                  {description}
                </Text>
              ) : null}
            </View>
            {trailing ? <View>{trailing}</View> : null}
          </View>
          {children ? <View className="mt-3">{children}</View> : null}
        </View>
        <View
          className={cn(
            'w-5 h-5 rounded-full border-2 items-center justify-center',
            selected ? 'border-primary-500' : 'border-line',
          )}
        >
          {selected ? (
            <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
