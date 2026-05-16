import { Linking, Pressable, Text, View } from 'react-native';
import { ExternalLink, Truck } from 'lucide-react-native';
import type { OrderShipment } from '@xelnova/api';
import { shipmentStatusLabel } from '../../lib/order-status';

interface ShipmentTrackerProps {
  shipment: OrderShipment;
}

function formatDateTime(iso: string | undefined | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ShipmentTracker({ shipment }: ShipmentTrackerProps) {
  const history = shipment.statusHistory ?? [];

  return (
    <View className="bg-surface rounded-2xl border border-line-light p-4 gap-3">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-promo-mint-50 items-center justify-center">
          <Truck size={18} color="#11ab3a" />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] uppercase tracking-wide text-ink-muted">
            Shipment
          </Text>
          <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
            {shipmentStatusLabel(shipment.shipmentStatus)}
          </Text>
          {shipment.courierProvider ? (
            <Text className="text-xs text-ink-secondary mt-0.5">
              {`${shipment.courierProvider}${shipment.awbNumber ? ` \u00b7 ${shipment.awbNumber}` : ''}`}
            </Text>
          ) : null}
        </View>
        {shipment.trackingUrl ? (
          <Pressable
            onPress={() => Linking.openURL(shipment.trackingUrl!).catch(() => {})}
            className="flex-row items-center gap-1 active:opacity-60"
            hitSlop={8}
          >
            <Text className="text-xs font-semibold text-primary-700">Track</Text>
            <ExternalLink size={14} color="#0c831f" />
          </Pressable>
        ) : null}
      </View>

      {history.length > 0 ? (
        <View className="border-t border-line-light pt-3 gap-3">
          {history.slice(0, 6).map((event, idx) => (
            <View key={`${event.status}-${idx}`} className="flex-row gap-3">
              <View className="items-center pt-1">
                <View
                  className={
                    idx === 0
                      ? 'w-2.5 h-2.5 rounded-full bg-primary-500'
                      : 'w-2.5 h-2.5 rounded-full bg-line'
                  }
                />
                {idx < Math.min(history.length, 6) - 1 ? (
                  <View className="w-px flex-1 bg-line-light my-1" />
                ) : null}
              </View>
              <View className="flex-1 pb-1">
                <Text className="text-sm font-semibold text-ink">
                  {shipmentStatusLabel(event.status)}
                </Text>
                {event.location ? (
                  <Text className="text-xs text-ink-secondary">
                    {event.location}
                  </Text>
                ) : null}
                {formatDateTime(event.timestamp) ? (
                  <Text className="text-[11px] text-ink-muted mt-0.5">
                    {formatDateTime(event.timestamp)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
