import { Text, View } from 'react-native';
import { Tag } from 'lucide-react-native';
import { cn } from './cn';
import { Image, type ImageFallbackTone } from './image';
import { PressableScale } from './pressable-scale';

export interface CategoryTileData {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface CategoryTileProps {
  category: CategoryTileData;
  onPress?: () => void;
  /** `circle` for home strip (round image); `square` for search/all-categories grid. */
  shape?: 'circle' | 'square';
  /** Soft pastel background tint behind the image. */
  tint?: 'mint' | 'teal' | 'sunshine' | 'peach' | 'lavender' | 'warm' | 'none';
  className?: string;
}

const tintClasses: Record<NonNullable<CategoryTileProps['tint']>, string> = {
  mint: 'bg-promo-mint-50',
  teal: 'bg-promo-teal-50',
  sunshine: 'bg-promo-sunshine-50',
  peach: 'bg-promo-peach-50',
  lavender: 'bg-promo-lavender-50',
  warm: 'bg-surface-warm',
  none: 'bg-surface-muted',
};

const tintToFallbackTone: Record<
  NonNullable<CategoryTileProps['tint']>,
  ImageFallbackTone
> = {
  mint: 'mint',
  teal: 'teal',
  sunshine: 'sunshine',
  peach: 'peach',
  lavender: 'lavender',
  warm: 'sunshine',
  none: 'mono',
};

export function CategoryTile({
  category,
  onPress,
  shape = 'square',
  tint = 'none',
  className,
}: CategoryTileProps) {
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  return (
    <PressableScale
      onPress={onPress}
      pressScale={0.92}
      className={cn('items-center gap-1.5', className)}
      hitSlop={4}
    >
      <View
        className={cn(
          'w-16 h-16 items-center justify-center overflow-hidden',
          radius,
          tintClasses[tint],
        )}
      >
        <Image
          uri={category.imageUrl}
          className="w-full h-full"
          contentFit="contain"
          fallbackLabel={category.name}
          fallbackTone={tintToFallbackTone[tint]}
          fallbackIcon={Tag}
        />
      </View>
      <Text
        className="text-[11px] text-ink text-center max-w-[72px]"
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </PressableScale>
  );
}
