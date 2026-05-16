import { Pressable, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { cn } from '@xelnova/ui-native';

interface MenuRowProps {
  Icon: LucideIcon;
  /** Soft tinted background hex behind the icon. */
  iconColor?: string;
  iconBackground?: string;
  label: string;
  description?: string;
  /** Slot rendered to the right of the chevron (e.g. count badge). */
  trailing?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  className?: string;
}

export function MenuRow({
  Icon,
  iconColor = '#11ab3a',
  iconBackground = '#ecfdf3',
  label,
  description,
  trailing,
  onPress,
  destructive,
  className,
}: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 px-4 py-3.5 active:bg-surface-muted',
        className,
      )}
      hitSlop={4}
    >
      <View
        style={{ backgroundColor: destructive ? '#fef2f2' : iconBackground }}
        className="w-10 h-10 rounded-xl items-center justify-center"
      >
        <Icon size={18} color={destructive ? '#dc2626' : iconColor} />
      </View>
      <View className="flex-1">
        <Text
          className={cn(
            'text-sm font-semibold',
            destructive ? 'text-danger-600' : 'text-ink',
          )}
        >
          {label}
        </Text>
        {description ? (
          <Text className="text-xs text-ink-secondary mt-0.5" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing}
      <ChevronRight size={18} color={destructive ? '#dc2626' : '#8d95a5'} />
    </Pressable>
  );
}
