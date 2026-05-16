import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Truck,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { Button } from '@xelnova/ui-native';
import { markOnboarded } from '../src/lib/local-history';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    Icon: Sparkles,
    iconColor: '#0c831f',
    iconBg: '#ecfdf3',
    title: 'Discover thousands of products',
    body: 'Browse curated collections from trusted brands and local stores — all in one place.',
  },
  {
    Icon: Truck,
    iconColor: '#1f8f89',
    iconBg: '#e6f7f6',
    title: 'Fast, reliable delivery',
    body: 'Track every order in real time. Express delivery available in select cities.',
  },
  {
    Icon: ShieldCheck,
    iconColor: '#b07a00',
    iconBg: '#fffbeb',
    title: 'Easy returns, secure payments',
    body: 'Hassle-free returns and refunds. Pay with UPI, cards, wallet, or cash on delivery.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / SCREEN_WIDTH);
    if (next !== index) setIndex(next);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: SCREEN_WIDTH * (index + 1),
        animated: true,
      });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await markOnboarded();
    // Permissions wizard runs next on first launch (handled by OnboardingGate);
    // otherwise we drop straight onto the home tabs as a guest.
    router.replace('/permissions');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable onPress={finish} hitSlop={8}>
          <Text className="text-sm font-semibold text-ink-secondary">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {SLIDES.map((slide, i) => (
          <View
            key={i}
            style={{ width: SCREEN_WIDTH }}
            className="flex-1 items-center justify-center px-8"
          >
            <View
              style={{ backgroundColor: slide.iconBg }}
              className="w-32 h-32 rounded-full items-center justify-center mb-8"
            >
              <slide.Icon size={56} color={slide.iconColor} />
            </View>
            <Text className="text-2xl font-bold text-ink text-center">
              {slide.title}
            </Text>
            <Text className="text-base text-ink-secondary text-center mt-3 leading-relaxed">
              {slide.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="px-6 pb-6 pt-4 gap-5">
        <View className="flex-row justify-center gap-2">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${
                i === index ? 'w-6 bg-primary-500' : 'w-2 bg-line-light'
              }`}
            />
          ))}
        </View>
        <Button size="lg" fullWidth onPress={next}>
          {index === SLIDES.length - 1 ? 'Get started' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
}
