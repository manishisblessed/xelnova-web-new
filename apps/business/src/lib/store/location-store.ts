import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocationData {
  pincode: string;
  city: string;
  state: string;
  district: string;
}

interface LocationState {
  location: LocationData | null;
  autoDetected: boolean;
  promptDismissed: boolean;
  setLocation: (data: LocationData) => void;
  clearLocation: () => void;
  setAutoDetected: (v: boolean) => void;
  setPromptDismissed: (v: boolean) => void;
}

export async function lookupPincode(pincode: string): Promise<LocationData> {
  // Prefer our server-side proxy: it caches results, retries on transient
  // failures, and avoids the ERR_CONNECTION_TIMED_OUT we used to get when
  // calling api.postalpincode.in directly from the browser on flaky networks.
  try {
    const res = await fetch(`/api/pincode/${pincode}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: LocationData };
      if (json?.data) return json.data;
    }
    if (res.status === 404 || res.status === 400) {
      throw new Error('Invalid pincode or no results found');
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Invalid pincode')) throw e;
  }

  const direct = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
    signal: AbortSignal.timeout(8_000),
  });
  const json = await direct.json();
  if (
    !Array.isArray(json) ||
    json[0]?.Status !== 'Success' ||
    !json[0]?.PostOffice?.length
  ) {
    throw new Error('Invalid pincode or no results found');
  }
  const po = json[0].PostOffice[0];
  return {
    pincode,
    city: po.Block && po.Block !== 'NA' ? po.Block : po.Division,
    state: po.State,
    district: po.District,
  };
}

export async function autoDetectLocation(): Promise<LocationData | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();

    const city = data.city || '';
    const region = data.region || '';
    const postal = data.postal || '';

    if (postal && /^[1-9][0-9]{5}$/.test(postal)) {
      try {
        return await lookupPincode(postal);
      } catch {
        // pincode lookup failed, use IP data directly
      }
    }

    if (city) {
      return {
        pincode: postal || '',
        city,
        state: region,
        district: city,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      autoDetected: false,
      promptDismissed: false,
      setLocation: (data) => set({ location: data, promptDismissed: true }),
      clearLocation: () => set({ location: null }),
      setAutoDetected: (v) => set({ autoDetected: v }),
      setPromptDismissed: (v) => set({ promptDismissed: v }),
    }),
    { name: 'xelnova-location' },
  ),
);
