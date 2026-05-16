import { Text, View } from 'react-native';
import { User } from 'lucide-react-native';
import { Image } from './image';
import { cn } from './cn';

export interface AvatarProps {
  uri?: string | null;
  /** Fallback initials/name shown when no image is available. */
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { box: 'w-8 h-8', text: 'text-xs', icon: 16 },
  md: { box: 'w-10 h-10', text: 'text-sm', icon: 18 },
  lg: { box: 'w-14 h-14', text: 'text-base', icon: 24 },
  xl: { box: 'w-20 h-20', text: 'text-lg', icon: 32 },
} as const;

/** Returns null when no usable initials can be derived. */
function initialsFor(name?: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Round avatar with image-or-initials fallback. Uses the design-system
 * green tint behind initials for a consistent look across account header
 * & order timelines.
 *
 * For unauthenticated/guest users where `uri` and `name` are both empty,
 * renders a person silhouette instead of the legacy "?" placeholder so
 * the marketplace header reads as "tap to sign in" rather than "missing
 * data".
 */
export function Avatar({ uri, name, size = 'md', className }: AvatarProps) {
  const { box, text, icon } = sizeMap[size];

  if (uri) {
    return (
      <View className={cn('rounded-full overflow-hidden bg-promo-mint-50', box, className)}>
        <Image uri={uri} className="w-full h-full" contentFit="cover" />
      </View>
    );
  }

  const initials = initialsFor(name);

  return (
    <View
      className={cn(
        'rounded-full items-center justify-center bg-promo-mint-50',
        box,
        className,
      )}
    >
      {initials ? (
        <Text className={cn('font-bold text-primary-700', text)}>{initials}</Text>
      ) : (
        <User size={icon} color="#0c831f" strokeWidth={2.25} />
      )}
    </View>
  );
}
