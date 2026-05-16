import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale, SectionHeader } from '@xelnova/ui-native';

interface Occasion {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  /** Two-stop gradient stops for the tile. */
  gradient: [string, string];
  /** Search query to send to /search. */
  query: string;
}

const OCCASIONS: Occasion[] = [
  {
    id: 'birthday',
    title: 'Birthdays',
    subtitle: 'Make it memorable',
    emoji: '\uD83C\uDF82',
    gradient: ['#fff0f6', '#ffc1d8'],
    query: 'birthday gift',
  },
  {
    id: 'anniversary',
    title: 'Anniversary',
    subtitle: 'Crafted with love',
    emoji: '\uD83D\uDC9D',
    gradient: ['#fff5e9', '#ffd5a3'],
    query: 'anniversary gift',
  },
  {
    id: 'wedding',
    title: 'Weddings',
    subtitle: 'Gifts that last',
    emoji: '\uD83D\uDC8D',
    gradient: ['#f4f0ff', '#cdbcff'],
    query: 'wedding gift',
  },
  {
    id: 'festive',
    title: 'Festive picks',
    subtitle: 'Diwali \u2022 Holi \u2022 Eid',
    emoji: '\uD83E\uDDE8',
    gradient: ['#fff7d6', '#ffd966'],
    query: 'festive',
  },
  {
    id: 'home-warming',
    title: 'New home',
    subtitle: 'House-warming sets',
    emoji: '\uD83C\uDFE1',
    gradient: ['#e9faf0', '#a6e3bd'],
    query: 'home decor',
  },
  {
    id: 'baby',
    title: 'New baby',
    subtitle: 'Soft, safe, sweet',
    emoji: '\uD83D\uDC76',
    gradient: ['#eaf4ff', '#a6c8ff'],
    query: 'baby gift',
  },
];

/**
 * 2-row grid of occasion tiles. Each tile routes to a curated `/search`
 * with a relevant keyword. Visuals lean into emoji + gradient so we don't
 * need bespoke artwork per occasion to ship the section.
 */
export function OccasionTiles() {
  const router = useRouter();

  return (
    <View>
      <SectionHeader
        title="Shop for the occasion"
        subtitle="Find the perfect gift, fast"
        accent="lavender"
      />
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-1.5">
          {OCCASIONS.map((o) => (
            <View key={o.id} className="w-1/3 px-1.5 mb-3">
              <PressableScale
                onPress={() =>
                  router.push({
                    pathname: '/search',
                    params: { q: o.query },
                  })
                }
                pressScale={0.94}
                style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  shadowColor: '#1a1a2c',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <LinearGradient
                  colors={o.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    aspectRatio: 1 / 1.05,
                    padding: 10,
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{o.emoji}</Text>
                  <View>
                    <Text className="text-xs font-extrabold text-ink" numberOfLines={1}>
                      {o.title}
                    </Text>
                    <Text className="text-[10px] text-ink-secondary mt-0.5" numberOfLines={1}>
                      {o.subtitle}
                    </Text>
                  </View>
                </LinearGradient>
              </PressableScale>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
