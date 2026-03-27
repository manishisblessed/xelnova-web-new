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
  setLocation: (data: LocationData) => void;
  clearLocation: () => void;
  setAutoDetected: (v: boolean) => void;
}

export async function lookupPincode(pincode: string): Promise<LocationData> {
  const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
  const json = await res.json();

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
    city: po.Block !== 'NA' ? po.Block : po.Division,
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
      setLocation: (data) => set({ location: data }),
      clearLocation: () => set({ location: null }),
      setAutoDetected: (v) => set({ autoDetected: v }),
    }),
    { name: 'xelnova-location' },
  ),
);
