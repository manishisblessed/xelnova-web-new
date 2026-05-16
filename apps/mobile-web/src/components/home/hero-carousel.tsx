import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from '@xelnova/ui-native';
import { useQuery } from '@tanstack/react-query';
import { productsApi, type Banner } from '@xelnova/api';
import { queryKeys } from '../../lib/query-keys';
import { resolveImageUrl } from '../../lib/image-url';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.5);
const SLIDE_INTERVAL_MS = 4000;
/**
 * How far the background image is allowed to drift relative to the card
 * during the swipe. Small enough to feel premium, big enough to read.
 */
const PARALLAX_RANGE = 32;

interface Slide {
  id: string;
  image: string | null;
  title: string;
  subtitle?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
}

const FALLBACK_SLIDES: Slide[] = [
  {
    id: 'fallback-1',
    image:
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=70',
    title: 'Big Festive Sale',
    subtitle: 'Up to 70% off across electronics, fashion & more',
    ctaText: 'Shop now',
    ctaLink: '/products',
  },
  {
    id: 'fallback-2',
    image:
      'https://images.unsplash.com/photo-1611605698335-8b1569810432?auto=format&fit=crop&w=1200&q=70',
    title: 'Daily essentials',
    subtitle: 'Fresh deals every day',
    ctaText: 'Explore',
    ctaLink: '/products',
  },
];

export function HeroCarousel() {
  const { data: banners } = useQuery({
    queryKey: queryKeys.banners('hero'),
    queryFn: () => productsApi.getBanners('hero'),
    staleTime: 5 * 60_000,
  });

  const slides: Slide[] = useMemo(() => {
    if (!banners || banners.length === 0) return FALLBACK_SLIDES;
    return banners
      .filter((b: Banner) => b.isActive)
      .map((b: Banner) => ({
        id: b.id,
        image: resolveImageUrl(b.image),
        title: b.title,
        subtitle: b.subtitle,
        ctaText: b.ctaText,
        ctaLink: b.ctaLink,
      }));
  }, [banners]);

  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  // Tracks whether the user is mid-swipe so we don't auto-advance on
  // top of their drag and fight the gesture.
  const userInteracting = useRef(false);

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true },
      ),
    [scrollX],
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
    setActiveIndex(index);
    userInteracting.current = false;
  };

  // Auto-advance — pauses while the user is actively dragging.
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      if (userInteracting.current) return;
      setActiveIndex((current) => {
        const next = (current + 1) % slides.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <View className="px-4">
      <Animated.FlatList
        ref={listRef as never}
        data={slides}
        keyExtractor={(s: Slide) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          userInteracting.current = true;
        }}
        onMomentumScrollEnd={onMomentumEnd}
        // FlatList's `scrollToIndex` needs a known item layout to be
        // accurate when paged programmatically.
        getItemLayout={(_, idx) => ({
          length: CARD_WIDTH + 12,
          offset: (CARD_WIDTH + 12) * idx,
          index: idx,
        })}
        ItemSeparatorComponent={() => <View className="w-3" />}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + 12),
            index * (CARD_WIDTH + 12),
            (index + 1) * (CARD_WIDTH + 12),
          ];
          const imageTranslate = scrollX.interpolate({
            inputRange,
            outputRange: [PARALLAX_RANGE, 0, -PARALLAX_RANGE],
            extrapolate: 'clamp',
          });
          const overlayOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
            <Pressable
              className="rounded-2xl overflow-hidden bg-surface-muted"
              style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
            >
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  transform: [{ translateX: imageTranslate }],
                }}
              >
                <Image
                  uri={item.image}
                  className="w-full h-full"
                  contentFit="cover"
                  fallbackTone="sunshine"
                  fallbackLabel={item.title.slice(0, 2)}
                />
              </Animated.View>
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: CARD_HEIGHT * 0.65,
                }}
              />
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  bottom: 16,
                  opacity: overlayOpacity,
                }}
              >
                <Text className="text-white text-xl font-bold" numberOfLines={2}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text className="text-white/85 text-xs mt-1" numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                ) : null}
                {item.ctaText ? (
                  <View className="self-start bg-accent-500 rounded-md px-3 py-1 mt-2">
                    <Text className="text-xs font-bold text-ink uppercase tracking-wide">
                      {item.ctaText}
                    </Text>
                  </View>
                ) : null}
              </Animated.View>
            </Pressable>
          );
        }}
      />
      <View className="flex-row justify-center gap-1.5 mt-3">
        {slides.map((s, idx) => (
          <View
            key={s.id}
            className={
              idx === activeIndex
                ? 'h-1.5 w-5 rounded-full bg-primary-500'
                : 'h-1.5 w-1.5 rounded-full bg-line'
            }
          />
        ))}
      </View>
    </View>
  );
}
