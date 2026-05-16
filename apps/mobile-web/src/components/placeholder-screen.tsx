import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@xelnova/ui-native';

interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
  emoji?: string;
}

/**
 * Tiny inline placeholder for tabs that aren't built yet (Phase 0). Each tab
 * is replaced screen-by-screen in later phases.
 */
export function PlaceholderScreen({
  title,
  subtitle,
  emoji = '🛠️',
}: PlaceholderScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-1 items-center justify-center px-6">
        <Card variant="tinted" tint="mint" className="w-full items-center py-10">
          <Text className="text-5xl">{emoji}</Text>
          <Text className="mt-4 font-display text-2xl font-extrabold text-ink">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-2 text-center text-sm text-ink-secondary">
              {subtitle}
            </Text>
          ) : null}
        </Card>
      </View>
    </SafeAreaView>
  );
}
