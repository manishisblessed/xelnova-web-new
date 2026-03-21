import { randomUUID } from 'crypto';

export interface SellerRecord {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  onboardingStep: number;
  onboardingStatus: string;
  gstNumber?: string;
  gstVerified: boolean;
  sellsNonGstProducts: boolean;
  panNumber?: string;
  panName?: string;
  storeName: string;
  slug: string;
  description?: string;
  businessType?: string;
  businessCategory?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessPincode?: string;
  shippingMethod?: string;
  offerFreeDelivery: boolean;
  deliveryCharge1to3Days?: number;
  deliveryCharge3PlusDays?: number;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankVerified: boolean;
  bankName?: string;
  bankBranch?: string;
  verified: boolean;
  createdAt: string;
}

const globalForSeller = globalThis as unknown as {
  __sellerStore?: Map<string, SellerRecord>;
};

if (!globalForSeller.__sellerStore) {
  globalForSeller.__sellerStore = new Map();
}

const store = globalForSeller.__sellerStore;

export function createSeller(data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): SellerRecord {
  const id = randomUUID();
  const userId = randomUUID();
  const slug = data.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const seller: SellerRecord = {
    id,
    userId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    passwordHash: `hashed-${data.password}`,
    onboardingStep: 2,
    onboardingStatus: 'EMAIL_VERIFIED',
    gstVerified: false,
    sellsNonGstProducts: false,
    storeName: `${data.fullName}'s Store`,
    slug,
    offerFreeDelivery: true,
    bankVerified: false,
    verified: false,
    createdAt: new Date().toISOString(),
  };

  store.set(id, seller);
  return seller;
}

export function getSeller(id: string): SellerRecord | undefined {
  return store.get(id);
}

export function updateSeller(id: string, data: Partial<SellerRecord>): SellerRecord | undefined {
  const seller = store.get(id);
  if (!seller) return undefined;
  Object.assign(seller, data);
  return seller;
}

export function getAllSellers(): SellerRecord[] {
  return Array.from(store.values());
}
