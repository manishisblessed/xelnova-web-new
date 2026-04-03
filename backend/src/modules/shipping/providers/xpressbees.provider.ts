import { Injectable, Logger } from '@nestjs/common';
import { SellerCourierConfig } from '@prisma/client';
import {
  CourierProvider,
  ShipmentDetails,
  CreateShipmentResult,
  TrackingResult,
  CancelResult,
  ServiceabilityResult,
} from './courier-provider.interface';

@Injectable()
export class XpressBeesProvider implements CourierProvider {
  readonly providerName = 'XpressBees';
  private readonly logger = new Logger(XpressBeesProvider.name);
  private readonly baseUrl = 'https://xbclientapi.xpressbees.com';

  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  private async getAuthToken(config: SellerCourierConfig): Promise<string> {
    // If apiSecret is set, use token-based auth
    if (config.apiSecret) {
      const cacheKey = config.id;
      const cached = this.tokenCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.token;
      }

      const res = await fetch(`${this.baseUrl}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: config.accountId,
          password: config.apiSecret,
        }),
      });

      if (!res.ok) {
        throw new Error('XpressBees authentication failed');
      }

      const data = await res.json();
      const token = data.data || data.token;
      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23 hours
      });
      return token;
    }

    // Static key-based auth
    return config.apiKey;
  }

  private async headers(
    config: SellerCourierConfig,
  ): Promise<Record<string, string>> {
    if (config.apiSecret) {
      const token = await this.getAuthToken(config);
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
    return {
      XBKey: config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async createShipment(
    config: SellerCourierConfig,
    details: ShipmentDetails,
  ): Promise<CreateShipmentResult> {
    const hdrs = await this.headers(config);

    const payload = {
      order_number: details.orderNumber,
      shipping_charges: 0,
      discount: 0,
      cod_charges: 0,
      payment_type: details.isCod ? 'COD' : 'prepaid',
      order_amount: details.totalAmount,
      package_weight: ((details.weight || 0.5) * 1000).toString(),
      package_length: details.dimensions?.split('x')[0] || '10',
      package_breadth: details.dimensions?.split('x')[1] || '10',
      package_height: details.dimensions?.split('x')[2] || '10',
      request_auto_pickup: 'Y',
      consignee: {
        name: details.deliveryAddress.fullName,
        address: details.deliveryAddress.addressLine1,
        address_2: details.deliveryAddress.addressLine2 || '',
        city: details.deliveryAddress.city,
        state: details.deliveryAddress.state,
        pincode: details.deliveryAddress.pincode,
        phone: details.deliveryAddress.phone,
      },
      pickup: {
        warehouse_name: config.warehouseId || 'default',
        name: details.sellerAddress.name,
        address: details.sellerAddress.address,
        city: details.sellerAddress.city,
        state: details.sellerAddress.state,
        pincode: details.sellerAddress.pincode,
        phone: details.sellerAddress.phone,
      },
      order_items: details.items.map((item) => ({
        name: item.name,
        qty: item.quantity,
        price: item.price,
        sku: `SKU-${details.orderNumber}`,
      })),
    };

    const res = await fetch(`${this.baseUrl}/api/shipments2`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`XpressBees create shipment failed: ${errText}`);
      throw new Error(`Failed to create XpressBees shipment: ${errText}`);
    }

    const data = await res.json();
    const awb = data.data?.awb_number || data.awb_number || '';

    return {
      awbNumber: String(awb),
      courierOrderId: data.data?.order_id?.toString() || '',
      trackingUrl: `https://www.xpressbees.com/shipment/tracking?awb=${awb}`,
    };
  }

  async trackShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<TrackingResult> {
    const hdrs = await this.headers(config);

    const res = await fetch(
      `${this.baseUrl}/api/shipments2/track/${awbNumber}`,
      { headers: hdrs },
    );

    if (!res.ok) {
      throw new Error('Failed to track XpressBees shipment');
    }

    const data = await res.json();
    const tracking = data.data;

    if (!tracking) {
      return { status: 'UNKNOWN', statusHistory: [] };
    }

    const scans = tracking.ShipmentSummary || [];
    const statusHistory = scans.map((scan: any) => ({
      status: scan.Status || '',
      timestamp: scan.StatusDateTime || '',
      location: scan.Location || '',
      remark: scan.Remark || '',
    }));

    return {
      status: this.mapXpressBeesStatus(tracking.OrderStatus || ''),
      statusHistory,
      currentLocation: scans[0]?.Location,
    };
  }

  async cancelShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<CancelResult> {
    const hdrs = await this.headers(config);

    const res = await fetch(`${this.baseUrl}/api/shipments2/cancel`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({ awb: awbNumber }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Cancel failed: ${errText}` };
    }

    return { success: true, message: 'Shipment cancelled successfully' };
  }

  async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    config: SellerCourierConfig,
  ): Promise<ServiceabilityResult> {
    const hdrs = await this.headers(config);

    const res = await fetch(
      `${this.baseUrl}/api/pincode/serviceability?pickup_pincode=${pickupPincode}&delivery_pincode=${deliveryPincode}`,
      { headers: hdrs },
    );

    if (!res.ok) {
      return { serviceable: false };
    }

    const data = await res.json();
    return {
      serviceable: data.data?.serviceable === true || data.status === 1,
      estimatedDays: data.data?.estimated_days || 5,
    };
  }

  private mapXpressBeesStatus(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('delivered')) return 'DELIVERED';
    if (normalized.includes('out for delivery')) return 'OUT_FOR_DELIVERY';
    if (normalized.includes('in transit') || normalized.includes('intransit'))
      return 'IN_TRANSIT';
    if (normalized.includes('picked') || normalized.includes('pickup done'))
      return 'PICKED_UP';
    if (normalized.includes('pickup scheduled')) return 'PICKUP_SCHEDULED';
    if (normalized.includes('manifested') || normalized.includes('booked'))
      return 'BOOKED';
    if (normalized.includes('rto')) return 'RTO_INITIATED';
    if (normalized.includes('cancel')) return 'CANCELLED';
    return 'IN_TRANSIT';
  }
}
