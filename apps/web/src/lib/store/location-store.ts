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
  setLocation: (data: LocationData) => void;
  clearLocation: () => void;
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

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      setLocation: (data) => set({ location: data }),
      clearLocation: () => set({ location: null }),
    }),
    { name: 'xelnova-location' },
  ),
);
