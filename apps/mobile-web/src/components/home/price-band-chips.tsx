import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale, SectionHeader } from '@xelnova/ui-native';

interface Band {
  id: string;
  label: string;
  /** Forwarded as `maxPrice` to /search. */
  maxPrice: number;
  /** Two-stop chip gradient. */
  gradient: [string, string];
  /** Text/border tone over the gradient. */
  tone: string;
  emoji: string;
}

const BANDS: Band[] = [
  {
    id: 'b99',
    label: 'Under \u20B999',
    maxPrice: 99,
    gradient: ['#fff5e0', '#ffd989'],
    tone: '#7a5b00',
    emoji: '\uD83D\uDD25',
  },
  {
    id: 'b199',
    label: 'Under \u20B9199',
    maxPrice: 199,
    gradient: ['#e8fff1', '#a6e3bd'],
    tone: '#0a7a2a',
    emoji: '\uD83D\uDCB0',
  },
  {
    id: 'b299',
    label: 'Under \u20B9299',
    maxPrice: 299,
    gradient: ['#ffe9e2', '#ffb39e'],
    tone: '#a13a14',
    emoji: '\uD83C\uDF89',
  },
  {
    id: 'b499',
    label: 'Under \u20B9499',
    maxPrice: 499,
    gradient: ['#eef0ff', '#b4bbff'],
    tone: '#1a3aa0',
    emoji: '\u2728',
  },
];

/**
 * Horizontal row of price-band pills. Tapping a chip opens the search
 * results with `maxPrice` pre-applied — same destination as Amazon's
 * "Under ₹X" tiles, lighter visual weight.
 */
export function PriceBandChips() {
  const router = useRouter();

  return (
    <View>
      <SectionHeader
        title="Shop by budget"
        subtitle="Find a great deal at every price"
        accent="primary"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {BANDS.map((band) => (
          <PressableScale
            key={band.id}
            onPress={() =>
              router.push({
                pathname: '/search',
                params: { maxPrice: String(band.maxPrice) },
              })
            }
            pressScale={0.94}
            style={{
              borderRadius: 999,
              overflow: 'hidden',
              shadowColor: band.tone,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.18,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <LinearGradient
              colors={band.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text className="text-base">{band.emoji}</Text>
              <Text
                className="text-sm font-extrabold"
                style={{ color: band.tone }}
              >
                {band.label}
              </Text>
            </LinearGradient>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}
