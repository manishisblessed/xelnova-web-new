'use client';

import { useState } from 'react';
import Link from 'next/link';

function hueFromString(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h + name.charCodeAt(i) * (i + 3)) % 360;
  }
  return h;
}

export function BrandTile({
  name,
  logo,
}: {
  name: string;
  logo: string | null;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const trimmed = logo?.trim() ?? '';
  const showLogo = Boolean(trimmed) && !logoFailed;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || name.slice(0, 2).toUpperCase();
  const hue = hueFromString(name);

  return (
    <Link
      href={`/products?brand=${encodeURIComponent(name)}`}
      className="group flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-gradient-to-b from-white via-white to-primary-50/40 px-3 py-4 text-center shadow-sm transition-all duration-300 hover:border-primary-300/80 hover:shadow-card-hover hover:-translate-y-1 min-h-[112px]"
    >
      <div className="flex h-14 w-full items-center justify-center">
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmed}
            alt=""
            className="max-h-11 w-auto max-w-[100px] object-contain opacity-95 group-hover:opacity-100 transition-opacity"
            loading="lazy"
            decoding="async"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold tracking-tight text-white shadow-md ring-2 ring-white/30"
            style={{
              background: `linear-gradient(145deg, hsl(${hue}, 58%, 48%), hsl(${(hue + 44) % 360}, 52%, 36%))`,
            }}
            aria-hidden
          >
            {initials}
          </div>
        )}
      </div>
      <span className="text-[11px] sm:text-xs font-semibold text-text-secondary group-hover:text-primary-700 line-clamp-2 leading-tight transition-colors">
        {name}
      </span>
    </Link>
  );
}
