import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { cn } from '@xelnova/ui-native';

interface StepIndicatorProps {
  /** 1-based active step. Steps before are marked complete, after are inactive. */
  active: 1 | 2 | 3;
  className?: string;
}

const STEPS = [
  { key: 1, label: 'Address' },
  { key: 2, label: 'Review' },
  { key: 3, label: 'Pay' },
] as const;

export function StepIndicator({ active, className }: StepIndicatorProps) {
  return (
    <View
      className={cn(
        'bg-surface px-4 py-2.5 border-b border-line-light',
        className,
      )}
    >
      <View className="flex-row items-center">
        {STEPS.map((step, idx) => {
          const isComplete = step.key < active;
          const isActive = step.key === active;
          const isLast = idx === STEPS.length - 1;
          return (
            <View key={step.key} className="flex-row items-center flex-1">
              <View className="flex-row items-center gap-2">
                <View
                  className={
                    isComplete
                      ? 'w-6 h-6 rounded-full items-center justify-center bg-primary-500'
                      : isActive
                        ? 'w-6 h-6 rounded-full items-center justify-center bg-primary-50 border-2 border-primary-500'
                        : 'w-6 h-6 rounded-full items-center justify-center bg-surface-muted border border-line'
                  }
                >
                  {isComplete ? (
                    <Check size={12} color="#ffffff" />
                  ) : (
                    <Text
                      className={
                        isActive
                          ? 'text-[11px] font-bold text-primary-700'
                          : 'text-[11px] font-bold text-ink-muted'
                      }
                    >
                      {step.key}
                    </Text>
                  )}
                </View>
                <Text
                  className={
                    isComplete || isActive
                      ? 'text-xs font-semibold text-ink'
                      : 'text-xs text-ink-muted'
                  }
                >
                  {step.label}
                </Text>
              </View>
              {!isLast ? (
                <View
                  className={
                    isComplete
                      ? 'h-0.5 flex-1 bg-primary-500 mx-2'
                      : 'h-0.5 flex-1 bg-line mx-2'
                  }
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
