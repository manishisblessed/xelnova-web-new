import { View } from 'react-native';
import { cn } from './cn';

export interface DividerProps {
  /** `solid` (default) draws a 1px line; `dashed` simulates a dashed border. */
  variant?: 'solid' | 'dashed';
  /** Vertical spacing applied via `my-*` Tailwind classes. */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const spacingMap = {
  none: '',
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
} as const;

/**
 * Plain horizontal separator. Used inside cards and form sections to
 * visually group related fields without adding shadow noise.
 */
export function Divider({
  variant = 'solid',
  spacing = 'sm',
  className,
}: DividerProps) {
  return (
    <View
      className={cn(
        'h-px w-full',
        variant === 'dashed' ? 'bg-line border-t border-dashed border-line' : 'bg-line-light',
        spacingMap[spacing],
        className,
      )}
    />
  );
}
