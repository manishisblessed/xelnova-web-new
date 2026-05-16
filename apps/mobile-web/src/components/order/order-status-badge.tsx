import { Text, View } from 'react-native';
import { orderStatusConfig } from '../../lib/order-status';

interface OrderStatusBadgeProps {
  status: string | null | undefined;
  /** `lg` for the order detail header, `md` (default) for cards. */
  size?: 'md' | 'lg';
}

export function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const config = orderStatusConfig(status);
  const padding = size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-1';
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <View
      style={{ backgroundColor: config.background }}
      className={`flex-row items-center self-start gap-1.5 rounded-full ${padding}`}
    >
      <config.Icon size={size === 'lg' ? 14 : 12} color={config.color} />
      <Text style={{ color: config.color }} className={`${textSize} font-semibold`}>
        {config.label}
      </Text>
    </View>
  );
}
