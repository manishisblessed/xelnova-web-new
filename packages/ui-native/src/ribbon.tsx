import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

export type RibbonTone =
  | 'deal'
  | 'new'
  | 'bestseller'
  | 'limited'
  | 'trending'
  | 'fresh'
  | 'custom';

export interface RibbonProps {
  /** Visible label. Kept short so the corner ribbon stays compact. */
  label: string;
  /** Visual tone — picks the gradient + text colors. */
  tone?: RibbonTone;
  /** Manual color override; only used when `tone="custom"`. */
  color?: string;
  /** Override the text color. Defaults to white for color tones, ink for sunshine. */
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

const TONE_COLORS: Record<Exclude<RibbonTone, 'custom'>, { bg: string; text: string }> = {
  deal: { bg: '#dc2626', text: '#ffffff' },
  new: { bg: '#0c831f', text: '#ffffff' },
  bestseller: { bg: '#f5b800', text: '#1a1a2e' },
  limited: { bg: '#1a1a2e', text: '#ffffff' },
  trending: { bg: '#a78bfa', text: '#ffffff' },
  fresh: { bg: '#1f8f89', text: '#ffffff' },
};

/**
 * Corner sticker ribbon used over product/banner imagery to call out
 * promotions. Sits at the top-left of its parent (which must be
 * `position: 'relative'`) and uses a sloped tail on the right edge so it
 * reads like a printed sticker rather than a flat pill.
 *
 * The trapezoid shape is faked with two adjacent Views: a rectangle for
 * the body and a triangular tail using `borderTop` + `borderRight`.
 */
export function Ribbon({
  label,
  tone = 'deal',
  color,
  textColor,
  style,
}: RibbonProps) {
  const palette =
    tone === 'custom'
      ? { bg: color ?? '#dc2626', text: textColor ?? '#ffffff' }
      : TONE_COLORS[tone];

  const finalText = textColor ?? palette.text;
  const finalBg = palette.bg;

  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 8,
          left: 0,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: finalBg,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: finalBg,
          paddingLeft: 8,
          paddingRight: 6,
          paddingVertical: 3,
          borderTopRightRadius: 4,
          borderBottomRightRadius: 4,
        }}
      >
        <Text
          style={{
            color: finalText,
            fontSize: 9,
            fontWeight: '900',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </View>
      {/* Pointed tail — triangle hugging the right edge. */}
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: 11,
          borderBottomWidth: 11,
          borderLeftWidth: 8,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: finalBg,
        }}
      />
    </View>
  );
}
