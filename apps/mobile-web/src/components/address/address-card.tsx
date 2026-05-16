import { Pressable, Text, View } from 'react-native';
import { Briefcase, Edit3, Home, MapPin, Trash2 } from 'lucide-react-native';
import type { Address } from '@xelnova/api';
import { Pill } from '@xelnova/ui-native';

interface AddressCardProps {
  address: Address;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  /** When provided, the whole card becomes pressable (used in checkout). */
  onPress?: () => void;
  /** Optional trailing element rendered in the top-right corner. */
  trailing?: React.ReactNode;
}

const iconForType = (type: string) => {
  if (type === 'OFFICE') return Briefcase;
  if (type === 'HOME') return Home;
  return MapPin;
};

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  onPress,
  trailing,
}: AddressCardProps) {
  const Icon = iconForType(address.type);

  const body = (
    <View className="bg-surface rounded-2xl border border-line-light p-4 gap-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-9 h-9 rounded-xl bg-promo-mint-50 items-center justify-center">
            <Icon size={16} color="#11ab3a" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
                {address.fullName}
              </Text>
              {address.isDefault ? (
                <Pill tone="primary" size="sm">
                  Default
                </Pill>
              ) : null}
              <Pill tone="neutral" size="sm">
                {address.type}
              </Pill>
            </View>
            <Text className="text-xs text-ink-secondary mt-0.5">
              {address.phone}
            </Text>
          </View>
        </View>
        {trailing}
      </View>

      <Text className="text-sm text-ink-secondary leading-relaxed">
        {[address.addressLine1, address.addressLine2, address.landmark]
          .filter(Boolean)
          .join(', ')}
      </Text>
      <Text className="text-sm text-ink-secondary">
        {`${address.city}, ${address.state} - ${address.pincode}`}
      </Text>

      {onEdit || onDelete || (!address.isDefault && onSetDefault) ? (
        <View className="flex-row gap-3 mt-2 pt-2 border-t border-line-light">
          {onEdit ? (
            <Pressable
              onPress={onEdit}
              className="flex-row items-center gap-1.5 active:opacity-60"
              hitSlop={6}
            >
              <Edit3 size={14} color="#0c831f" />
              <Text className="text-xs font-semibold text-primary-700">Edit</Text>
            </Pressable>
          ) : null}
          {!address.isDefault && onSetDefault ? (
            <Pressable
              onPress={onSetDefault}
              className="active:opacity-60"
              hitSlop={6}
            >
              <Text className="text-xs font-semibold text-primary-700">
                Set as default
              </Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              className="flex-row items-center gap-1.5 active:opacity-60 ml-auto"
              hitSlop={6}
            >
              <Trash2 size={14} color="#dc2626" />
              <Text className="text-xs font-semibold text-danger-600">Delete</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-90">
        {body}
      </Pressable>
    );
  }
  return body;
}
