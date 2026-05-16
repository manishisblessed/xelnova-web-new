import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from '@xelnova/ui-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ImageGalleryProps {
  images: (string | null)[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const listRef = useRef<FlatList<string | null>>(null);

  const visible = images.length > 0 ? images : [null];

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActive(idx);
  };

  return (
    <View>
      <FlatList
        ref={listRef}
        data={visible}
        keyExtractor={(_, idx) => `img-${idx}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View
            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
            className="bg-surface items-center justify-center"
          >
            <Image
              uri={item}
              className="w-full h-full"
              contentFit="contain"
              transition={150}
            />
          </View>
        )}
      />
      {visible.length > 1 ? (
        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
          {visible.map((_, idx) => (
            <View
              key={idx}
              className={
                idx === active
                  ? 'h-1.5 w-5 rounded-full bg-primary-500'
                  : 'h-1.5 w-1.5 rounded-full bg-line'
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
