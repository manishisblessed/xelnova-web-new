'use client';

import { useState, useEffect } from 'react';

let cachedFlags: Record<string, boolean> | null = null;
let flagsPromise: Promise<Record<string, boolean>> | null = null;

async function fetchFlags(): Promise<Record<string, boolean>> {
  if (cachedFlags) return cachedFlags;
  if (flagsPromise) return flagsPromise;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  flagsPromise = fetch(`${apiUrl}/feature-flags/public`)
    .then((res) => res.json())
    .then((json) => {
      cachedFlags = json?.data ?? {};
      return cachedFlags!;
    })
    .catch(() => ({}));

  return flagsPromise;
}

export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const [enabled, setEnabled] = useState(defaultValue);

  useEffect(() => {
    fetchFlags().then((flags) => {
      setEnabled(flags[key] ?? defaultValue);
    });
  }, [key, defaultValue]);

  return enabled;
}

export function useFeatureFlags(): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchFlags().then(setFlags);
  }, []);

  return flags;
}
