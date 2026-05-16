import { Pressable, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Override the default `router.back()` behavior. */
  onBackPress?: () => void;
  /** Slot rendered on the right side of the header. */
  trailing?: React.ReactNode;
  /** Hide the back button (used for top-level screens). */
  hideBack?: boolean;
}

/**
 * Standard sub-screen header used in account, addresses, orders, and
 * checkout. Provides a consistent back button + title + optional right slot.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBackPress,
  trailing,
  hideBack,
}: ScreenHeaderProps) {
  const router = useRouter();
  return (
    <View className="bg-surface px-3 py-2.5 border-b border-line-light flex-row items-center gap-2">
      {!hideBack ? (
        <Pressable
          onPress={onBackPress ?? (() => router.back())}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-surface-muted"
          hitSlop={6}
        >
          <ArrowLeft size={22} color="#1a1a2e" />
        </Pressable>
      ) : (
        <View className="w-2" />
      )}
      <View className="flex-1">
        <Text className="text-base font-bold text-ink" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-ink-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}
