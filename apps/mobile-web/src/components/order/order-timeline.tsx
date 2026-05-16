import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { ORDER_TIMELINE_STEPS, orderStatusConfig } from '../../lib/order-status';

interface OrderTimelineProps {
  status: string | null | undefined;
}

/**
 * Compact horizontal stepper showing where the order sits between Placed and
 * Delivered. For terminal states (Cancelled, Returned, Refunded) we render a
 * single neutral row instead.
 */
export function OrderTimeline({ status }: OrderTimelineProps) {
  const config = orderStatusConfig(status);
  if (config.step < 0) {
    return (
      <View
        style={{ backgroundColor: config.background }}
        className="rounded-2xl px-4 py-3 flex-row items-center gap-3"
      >
        <config.Icon size={18} color={config.color} />
        <Text style={{ color: config.color }} className="text-sm font-semibold">
          {config.label}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-surface rounded-2xl border border-line-light p-4">
      <View className="flex-row items-center">
        {ORDER_TIMELINE_STEPS.map((step, idx) => {
          const isComplete = idx < config.step;
          const isActive = idx === config.step;
          const isLast = idx === ORDER_TIMELINE_STEPS.length - 1;

          return (
            <View key={step.key} className="flex-1 items-center relative">
              <View className="flex-row items-center w-full">
                <View className="flex-1 items-end">
                  {idx > 0 ? (
                    <View
                      className={
                        isComplete || isActive
                          ? 'h-0.5 w-full bg-primary-500'
                          : 'h-0.5 w-full bg-line'
                      }
                    />
                  ) : null}
                </View>
                <View
                  className={
                    isComplete
                      ? 'w-7 h-7 rounded-full items-center justify-center bg-primary-500'
                      : isActive
                        ? 'w-7 h-7 rounded-full items-center justify-center bg-primary-50 border-2 border-primary-500'
                        : 'w-7 h-7 rounded-full items-center justify-center bg-surface-muted border border-line'
                  }
                >
                  {isComplete ? (
                    <Check size={14} color="#ffffff" />
                  ) : (
                    <View
                      className={
                        isActive
                          ? 'w-2 h-2 rounded-full bg-primary-500'
                          : 'w-1.5 h-1.5 rounded-full bg-line'
                      }
                    />
                  )}
                </View>
                <View className="flex-1 items-start">
                  {!isLast ? (
                    <View
                      className={
                        idx < config.step
                          ? 'h-0.5 w-full bg-primary-500'
                          : 'h-0.5 w-full bg-line'
                      }
                    />
                  ) : null}
                </View>
              </View>
              <Text
                className={
                  isComplete || isActive
                    ? 'text-[10px] font-semibold text-ink mt-2'
                    : 'text-[10px] text-ink-muted mt-2'
                }
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
