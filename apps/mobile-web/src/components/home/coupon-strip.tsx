import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Copy, Check, Ticket } from 'lucide-react-native';
import { PressableScale, SectionHeader } from '@xelnova/ui-native';
import { hapticError, hapticSuccess } from '../../lib/haptics';

interface Coupon {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  /** Two-stop gradient stops for the card. */
  gradient: [string, string];
  /** Tone for the title chip. */
  tint: string;
}

/**
 * Hardcoded coupon set. Wired to a coupon API later — keeping these
 * presentational keeps the home screen lively without coupling to a
 * backend that doesn't yet expose them.
 */
const COUPONS: Coupon[] = [
  {
    id: 'first',
    code: 'WELCOME50',
    title: 'Flat \u20B950 off',
    subtitle: 'On your first order above \u20B9199',
    gradient: ['#ffe1e8', '#ffb3c5'],
    tint: '#c2185b',
  },
  {
    id: 'big',
    code: 'BIG200',
    title: 'Save \u20B9200',
    subtitle: 'Use on orders above \u20B91499',
    gradient: ['#e6f9ed', '#a6e3bd'],
    tint: '#0a7a2a',
  },
  {
    id: 'free-ship',
    code: 'FREESHIP',
    title: 'Free shipping',
    subtitle: 'On any cart this week',
    gradient: ['#fff7d6', '#ffdd66'],
    tint: '#7a5b00',
  },
  {
    id: 'bank',
    code: 'HDFC10',
    title: '10% bank off',
    subtitle: 'HDFC credit / debit cards',
    gradient: ['#e6efff', '#9bb6ff'],
    tint: '#1a3aa0',
  },
];

/**
 * Horizontally scrolling row of coupon cards. Tapping a card copies the
 * code to clipboard and flashes a tick + toast so the user knows it's
 * theirs to apply at checkout.
 */
export function CouponStrip() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (coupon: Coupon) => {
    try {
      await Clipboard.setStringAsync(coupon.code);
      setCopiedId(coupon.id);
      setTimeout(() => setCopiedId((c) => (c === coupon.id ? null : c)), 1500);
      hapticSuccess();
      // Lightweight feedback. RN core `Alert` is fine here — no native deps.
      Alert.alert('Coupon copied', `Use code ${coupon.code} at checkout`);
    } catch {
      hapticError();
      Alert.alert('Could not copy', 'Please copy the code manually.');
    }
  };

  return (
    <View>
      <SectionHeader
        title="Coupons for you"
        subtitle="Tap to copy and apply at checkout"
        accent="accent"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {COUPONS.map((c) => {
          const copied = copiedId === c.id;
          return (
            <PressableScale
              key={c.id}
              onPress={() => handleCopy(c)}
              pressScale={0.96}
              style={{
                width: 220,
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: c.tint,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <LinearGradient
                colors={c.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 14 }}
              >
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Ticket size={14} color={c.tint} />
                  <Text
                    className="text-[10px] font-extrabold uppercase tracking-wider"
                    style={{ color: c.tint }}
                  >
                    Coupon
                  </Text>
                </View>
                <Text className="text-base font-extrabold text-ink">
                  {c.title}
                </Text>
                <Text className="text-[11px] text-ink-secondary mt-0.5" numberOfLines={1}>
                  {c.subtitle}
                </Text>

                <View className="flex-row items-center justify-between mt-3 bg-surface/85 rounded-lg px-2.5 py-1.5">
                  <Text className="text-xs font-extrabold tracking-wider text-ink">
                    {c.code}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    {copied ? (
                      <Check size={14} color="#0a7a2a" />
                    ) : (
                      <Copy size={14} color={c.tint} />
                    )}
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: copied ? '#0a7a2a' : c.tint }}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}
