/**
 * Marketplace-level courier settings (siteSettings.payload.platformLogistics).
 * Secrets should prefer DELHIVERY_* env vars in production; admin can override non-secrets and store an encrypted token in DB.
 */
export type XelnovaCourierBackend = 'delhivery' | 'stub';

/** Delhivery One API host selection (token is tied to prod vs staging). */
export type DelhiveryApiEnvironment = 'production' | 'staging';

export interface PlatformDelhiverySettings {
  /** Encrypted API token (same format as seller courier encrypt) */
  apiTokenEnc?: string;
  /** Registered client name (Delhivery One — case-sensitive). */
  clientName?: string;
  /** Pickup location / warehouse name (must match Delhivery One → Warehouses). */
  warehouseName?: string;
  /** Which Delhivery API host to call; default production. */
  environment?: DelhiveryApiEnvironment;
  /** Seller GSTIN sent on shipment (`seller_gst_tin`); optional but often required for B2B/invoicing. */
  sellerGstin?: string;
  /** Service type on waybill; Delhivery commonly uses Surface or Express. */
  shippingMode?: 'Surface' | 'Express';
}

export interface PlatformLogisticsSettings {
  /** How "Xelnova Courier" bookings are fulfilled. Default delhivery when credentials exist. */
  xelnovaBackend?: XelnovaCourierBackend;
  delhivery?: PlatformDelhiverySettings;
}

export const DEFAULT_PLATFORM_LOGISTICS: PlatformLogisticsSettings = {
  xelnovaBackend: 'delhivery',
  delhivery: {},
};
