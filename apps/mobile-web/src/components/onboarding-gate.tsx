import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import {
  hasCompletedPermissions,
  hasOnboarded,
} from '../lib/local-history';
import { useAuth } from '../lib/auth-context';

/**
 * Headless component that decides whether the user needs to see the
 * onboarding deck or the permissions wizard before they reach the home
 * tabs. Mounted inside `_layout.tsx` so it has access to the router and
 * auth context.
 *
 * Order of operations on a fresh install:
 *
 *   1. `/onboarding` — value-prop deck, ends with `markOnboarded()`.
 *   2. `/permissions` — Location, Notifications, Camera, Mic; ends with
 *      `markPermissionsCompleted()`.
 *   3. `/(tabs)` — guest browse experience.
 *
 * Both flags are sticky — the user only ever sees these screens once,
 * regardless of whether they granted or skipped each step. They can
 * re-grant individual permissions later from `/account/settings`.
 *
 * Authenticated users skip both screens (they came from a prior install
 * and have already completed the wizards).
 */
export function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, loading } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (checked) return;
    if (isAuthenticated) {
      setChecked(true);
      return;
    }

    let alive = true;
    Promise.all([hasOnboarded(), hasCompletedPermissions()]).then(
      ([didOnboard, didPermissions]) => {
        if (!alive) return;
        setChecked(true);

        const first = segments[0] as string | undefined;
        // Don't redirect if we're already on the target screen — protects
        // against navigation loops mid-flow.
        if (!didOnboard) {
          if (first !== 'onboarding') router.replace('/onboarding');
          return;
        }
        if (!didPermissions) {
          if (first !== 'permissions') router.replace('/permissions');
        }
      },
    );

    return () => {
      alive = false;
    };
  }, [loading, isAuthenticated, checked, router, segments]);

  return null;
}
