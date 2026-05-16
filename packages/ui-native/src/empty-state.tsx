import { Text, View } from 'react-native';
import { cn } from './cn';

export interface EmptyStateProps {
  /** Optional emoji or short pictograph. */
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Optional CTA element (Button) rendered below text. */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('items-center justify-center py-12 px-6', className)}>
      {icon ? <View className="mb-3">{icon}</View> : null}
      <Text className="text-base font-semibold text-ink text-center">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-sm text-ink-secondary text-center mt-1.5 leading-relaxed">
          {subtitle}
        </Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
