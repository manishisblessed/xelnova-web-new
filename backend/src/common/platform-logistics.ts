/**
 * Marketplace-level courier settings (siteSettings.payload.platformLogistics).
 *
 * "Xelgo" / "Ship with Xelnova" lets sellers book a shipment without
 * configuring their own courier API account — the platform fronts the
 * carrier with its own credentials. Admin picks one carrier as the
 * Xelgo backend (Delhivery / ShipRocket / XpressBees / Ekart) and pastes
 * the credentials below.
 *
 * Secrets (API token / password) are persisted encrypted (AES-256-CBC) in
 * the matching `*Enc` field. Plain-text inputs are accepted from the admin
 * patch payload (`apiToken`, `password`) and never round-tripped back.
 */
export type XelnovaCourierBackend =
  | 'delhivery'
  | 'shiprocket'
  | 'xpressbees'
  | 'ekart';

/** Delhivery One API host selection (token is tied to prod vs staging). */
export type DelhiveryApiEnvironment = 'production' | 'staging';

export interface PlatformDelhiverySettings {
  /** Encrypted Live API token (Settings → API Setup → API Token). */
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

export interface PlatformShipRocketSettings {
  /** API User email (Settings → API → API User). */
  email?: string;
  /** Encrypted API User password. */
  passwordEnc?: string;
  /** Pickup location name registered in ShipRocket (Settings → Pickup Addresses). Defaults to "Primary". */
  pickupLocation?: string;
}

export interface PlatformXpressBeesSettings {
  /** Login email used at shipment.xpressbees.com. */
  email?: string;
  /** Encrypted login password (used to mint a 24h Bearer token at runtime). */
  passwordEnc?: string;
  /** Registered warehouse name (Settings → Warehouse). */
  warehouseName?: string;
  /** Optional business name shown on labels. */
  businessName?: string;
}

export interface PlatformEkartSettings {
  /** Client ID issued by Ekart Elite (Settings → API Documentation). */
  clientId?: string;
  /** API username. */
  username?: string;
  /** Encrypted API password. */
  passwordEnc?: string;
  /** Registered pickup location alias. */
  pickupAlias?: string;
}

export interface PlatformLogisticsSettings {
  /**
   * Which carrier handles "Ship with Xelnova" / Xelgo bookings.
   * Defaults to delhivery when credentials exist.
   */
  xelnovaBackend?: XelnovaCourierBackend;
  delhivery?: PlatformDelhiverySettings;
  shiprocket?: PlatformShipRocketSettings;
  xpressbees?: PlatformXpressBeesSettings;
  ekart?: PlatformEkartSettings;
}

export const DEFAULT_PLATFORM_LOGISTICS: PlatformLogisticsSettings = {
  xelnovaBackend: 'delhivery',
  delhivery: {},
  shiprocket: {},
  xpressbees: {},
  ekart: {},
};
