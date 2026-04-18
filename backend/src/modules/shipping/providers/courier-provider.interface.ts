import { SellerCourierConfig, Order, SellerProfile } from '@prisma/client';

export interface ShipmentDetails {
  weight?: number;
  dimensions?: string;
  pickupPincode: string;
  deliveryPincode: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  sellerAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    name: string;
  };
  orderNumber: string;
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMethod?: string;
  isCod: boolean;
}

export interface CreateShipmentResult {
  awbNumber: string;
  courierOrderId?: string;
  trackingUrl?: string;
  labelUrl?: string;
  estimatedDelivery?: Date;
  charges?: number;
  /** When the courier should collect from seller (Xelnova / integrated flows). */
  pickupScheduledAt?: Date;
  /**
   * Human-readable carrier line for the seller dashboard, e.g. "Xelnova · Delhivery Express".
   * If set, persisted as Shipment.courierProvider.
   */
  displayCourierLine?: string;
}

export interface TrackingResult {
  status: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    location?: string;
    remark?: string;
  }>;
  currentLocation?: string;
  estimatedDelivery?: string;
}

export interface CancelResult {
  success: boolean;
  message: string;
}

export interface SchedulePickupOptions {
  /** Warehouse / pickup location name registered with the carrier. */
  pickupLocation: string;
  /** Number of packages in this pickup batch. */
  expectedPackageCount: number;
  /** Local date (YYYY-MM-DD, IST) the carrier should arrive. */
  pickupDate: string;
  /** Local time (HH:mm:ss, IST). Defaults to mid-day if omitted. */
  pickupTime?: string;
  /** Optional list of waybills to bundle in this pickup. */
  waybills?: string[];
}

export interface SchedulePickupResult {
  success: boolean;
  message: string;
  /** Carrier-side pickup id when issued. */
  pickupId?: string;
  /** Final scheduled timestamp in ISO. */
  scheduledFor?: string;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  estimatedDays?: number;
  charges?: number;
  availableCouriers?: Array<{
    name: string;
    estimatedDays: number;
    charges: number;
  }>;
}

export interface CourierProvider {
  readonly providerName: string;

  createShipment(
    config: SellerCourierConfig,
    details: ShipmentDetails,
  ): Promise<CreateShipmentResult>;

  trackShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<TrackingResult>;

  cancelShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<CancelResult>;

  checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    config: SellerCourierConfig,
  ): Promise<ServiceabilityResult>;

  /**
   * Optional: ask the carrier to send a rider to the seller's warehouse
   * for pickup. Providers that do not support a separate pickup-request
   * API can leave this unimplemented; the shipping service will treat
   * the absence as "pickup is auto-scheduled at booking time".
   */
  schedulePickup?(
    config: SellerCourierConfig,
    options: SchedulePickupOptions,
  ): Promise<SchedulePickupResult>;
}
