import { useState } from 'react';
import { Text, View } from 'react-native';
import { Image as ExpoImage, type ImageProps as ExpoImageProps } from 'expo-image';
import { ImageOff, type LucideIcon } from 'lucide-react-native';
import { cn } from './cn';

/**
 * Soft tinted palette for the fallback. Values map to the design-token
 * promo pastels — chosen so any product card always lands on a tile that
 * looks intentional rather than empty.
 */
const TONES = {
  mint: {
    bg: '#f0fdf4',
    accent: '#34d399',
    halo: 'rgba(52, 211, 153, 0.18)',
    text: '#04400e',
  },
  peach: {
    bg: '#fdecec',
    accent: '#ec9088',
    halo: 'rgba(236, 144, 136, 0.22)',
    text: '#7a2424',
  },
  sunshine: {
    bg: '#fff7d6',
    accent: '#f7c52b',
    halo: 'rgba(247, 197, 43, 0.25)',
    text: '#5e4100',
  },
  lavender: {
    bg: '#f5f3ff',
    accent: '#a78bfa',
    halo: 'rgba(167, 139, 250, 0.22)',
    text: '#3b1f7a',
  },
  teal: {
    bg: '#e6f7f6',
    accent: '#1f8f89',
    halo: 'rgba(31, 143, 137, 0.22)',
    text: '#063b3a',
  },
  mono: {
    bg: '#f8fafb',
    accent: '#8d95a5',
    halo: 'rgba(141, 149, 165, 0.22)',
    text: '#5a6478',
  },
} as const;

export type ImageFallbackTone = keyof typeof TONES;

export interface ImageProps extends Omit<ExpoImageProps, 'source' | 'style'> {
  /** Image URL or null/undefined for empty state. */
  uri: string | null | undefined;
  /** Optional fallback URI shown when `uri` is empty or fails to load. */
  fallbackUri?: string | null;
  className?: string;
  /** Inherits `expo-image` `ImageStyle`. Sizing usually comes from `className`. */
  style?: ExpoImageProps['style'];
  /** Tailwind class for the placeholder shown while loading or on error. */
  placeholderClassName?: string;
  /**
   * Short label (1-3 chars) drawn in the fallback when no image is
   * available. Pass the product brand initials, name initial, or a
   * single emoji.
   */
  fallbackLabel?: string | null;
  /** Tinted palette applied to the fallback. Defaults to `mint`. */
  fallbackTone?: ImageFallbackTone;
  /** Optional icon shown above the label inside the fallback. */
  fallbackIcon?: LucideIcon;
}

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

/**
 * Pick a deterministic tone from the seed so the same product always
 * falls back to the same colored tile. Used when the consumer doesn't
 * pass a `fallbackTone` explicitly.
 */
function pickToneFromSeed(seed: string | null | undefined): ImageFallbackTone {
  if (!seed) return 'mint';
  const tones = Object.keys(TONES) as ImageFallbackTone[];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return tones[h % tones.length]!;
}

/**
 * Cached, fade-in image with a beautiful tinted fallback when the URI is
 * missing or fails to load. Wraps `expo-image` so animation/cache config
 * is centralized for the whole app.
 *
 * Falls back to a tonal "tile" with a soft accent halo + the supplied
 * `fallbackLabel` (typically the product brand initials). This keeps
 * rails and grids visually rich even before product photos arrive from
 * the backend.
 */
export function Image({
  uri,
  fallbackUri,
  className,
  placeholderClassName,
  contentFit = 'cover',
  transition = 200,
  style,
  fallbackLabel,
  fallbackTone,
  fallbackIcon: FallbackIcon,
  ...rest
}: ImageProps) {
  const [errored, setErrored] = useState(false);
  const resolved = errored ? fallbackUri ?? null : uri ?? null;

  if (!resolved) {
    const tone = TONES[fallbackTone ?? pickToneFromSeed(fallbackLabel ?? uri)];
    const initials = (fallbackLabel ?? '').slice(0, 2).toUpperCase();

    return (
      <View
        style={[{ backgroundColor: tone.bg }, style as never]}
        className={cn(
          'items-center justify-center overflow-hidden',
          className,
          placeholderClassName,
        )}
      >
        {/* Soft halo blob — gives the tile depth without a gradient lib. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '-30%',
            right: '-30%',
            width: '85%',
            height: '85%',
            borderRadius: 9999,
            backgroundColor: tone.halo,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: '-25%',
            left: '-25%',
            width: '60%',
            height: '60%',
            borderRadius: 9999,
            backgroundColor: tone.halo,
          }}
        />
        {FallbackIcon ? (
          <FallbackIcon size={28} color={tone.accent} strokeWidth={1.5} />
        ) : initials ? (
          <Text
            style={{
              color: tone.text,
              fontWeight: '800',
              fontSize: 28,
              letterSpacing: 1,
              opacity: 0.85,
            }}
          >
            {initials}
          </Text>
        ) : (
          <ImageOff size={20} color={tone.accent} strokeWidth={1.5} />
        )}
      </View>
    );
  }

  return (
    <ExpoImage
      {...rest}
      style={style}
      className={className}
      source={{ uri: resolved }}
      placeholder={{ blurhash }}
      contentFit={contentFit}
      transition={transition}
      onError={(event) => {
        if (__DEV__) {
          // Failure-only logging — silent on successful loads. Surfaces
          // the URLs that are actually breaking so we can tell whether
          // the backend is returning bad URIs vs. the network is the
          // problem.
          console.warn(
            '[xelnova:Image] failed to load',
            resolved,
            event?.error ?? '',
          );
        }
        setErrored(true);
      }}
    />
  );
}
