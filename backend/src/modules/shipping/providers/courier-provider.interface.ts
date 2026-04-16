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
}
