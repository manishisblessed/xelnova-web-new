'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Package,
  Car,
  Sparkles,
  BookOpen,
  Cpu,
  Shirt,
  Apple,
  HeartPulse,
  Home,
  Trophy,
  Gamepad2,
} from 'lucide-react';

const SLUG_ICON: Record<string, LucideIcon> = {
  automotive: Car,
  beauty: Sparkles,
  'beauty-personal-care': Sparkles,
  books: BookOpen,
  electronics: Cpu,
  fashion: Shirt,
  groceries: Apple,
  grocery: Apple,
  health: HeartPulse,
  'health-wellness': HeartPulse,
  home: Home,
  'home-kitchen': Home,
  sports: Trophy,
  toys: Gamepad2,
};

function iconSizeClass(size: 'sm' | 'md' | 'lg') {
  if (size === 'lg') return 'w-16 h-16 md:w-20 md:h-20';
  if (size === 'sm') return 'w-8 h-8';
  return 'w-10 h-10 md:w-14 md:h-14';
}

export function CategoryImageOrIcon({
  slug,
  name,
  imageSrc,
  size = 'md',
  className = '',
}: {
  slug: string;
  name: string;
  imageSrc?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const trimmed = imageSrc?.trim() ?? '';
  const showUrl = Boolean(trimmed) && !failed;
  const Icon = SLUG_ICON[slug] || Package;
  const dim = iconSizeClass(size);

  if (!showUrl) {
    return (
      <Icon
        className={`${dim} text-primary-600 shrink-0 ${className}`}
        strokeWidth={1.75}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- API/CDN URLs vary; native img avoids Next remotePatterns misses
    <img
      src={trimmed}
      alt={name}
      className={`${dim} object-contain shrink-0 ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
