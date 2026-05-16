import { Text, View } from 'react-native';
import { cn } from './cn';

export type TagChipVariant = 'soft' | 'outline';

export interface TagChipProps {
  label: string;
  variant?: TagChipVariant;
  className?: string;
}

/**
 * Blinkit-style attribute chip surfaced on product cards (e.g. "No Palm Oil",
 * "IPX5", "Long Grain"). Always single-line, deliberately small, never the
 * primary affordance.
 */
export function TagChip({ label, variant = 'soft', className }: TagChipProps) {
  return (
    <View
      className={cn(
        'self-start rounded-md px-1.5 py-0.5',
        variant === 'soft' && 'bg-surface-muted',
        variant === 'outline' && 'border border-line bg-surface',
        className,
      )}
    >
      <Text
        numberOfLines={1}
        className="text-[10px] font-medium text-ink-secondary"
      >
        {label}
      </Text>
    </View>
  );
}
