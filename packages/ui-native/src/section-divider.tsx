import { Text, View } from 'react-native';

export interface SectionDividerProps {
  /** Optional centered label that floats over the divider. */
  label?: string;
  /** Tailwind class for the dot/glyph color in the divider. */
  dotClassName?: string;
  /** Color of the gradient line (rendered as 3 stops via two `View`s). */
  lineColor?: string;
  /** Color of the centre glyph and label text. */
  accentColor?: string;
}

/**
 * Soft horizontal divider used between groups of home sections. Looks
 * like: `——— • ———` with a centered glyph and optional label.
 *
 * Pure RN — no SVG / extra deps. The "fade" on the line ends comes from
 * stacking two views with opposing background colours.
 */
export function SectionDivider({
  label,
  dotClassName = 'bg-primary-500',
  lineColor = '#cfe6d6',
  accentColor = '#0c831f',
}: SectionDividerProps) {
  return (
    <View className="px-6 my-1 items-center justify-center">
      <View className="flex-row items-center w-full">
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: lineColor,
            opacity: 0.6,
          }}
        />
        <View className="flex-row items-center gap-2 px-3">
          <View className={`w-1 h-1 rounded-full ${dotClassName}`} />
          <View className={`w-1.5 h-1.5 rounded-full ${dotClassName}`} />
          <View className={`w-1 h-1 rounded-full ${dotClassName}`} />
        </View>
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: lineColor,
            opacity: 0.6,
          }}
        />
      </View>
      {label ? (
        <Text
          className="text-[10px] font-extrabold uppercase mt-2 tracking-[2px]"
          style={{ color: accentColor }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
