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
export class EkartProvider implements CourierProvider {
  readonly providerName = 'Ekart';
  private readonly logger = new Logger(EkartProvider.name);

  private getBaseUrl(config: SellerCourierConfig): string {
    // Ekart base URL is private and provided per seller during onboarding
    return (
      (config.metadata as any)?.baseUrl ||
      'https://api.ekartlogistics.com'
    );
  }

  private headers(config: SellerCourierConfig) {
    const credentials = Buffer.from(
      `${config.accountId}:${config.apiKey}`,
    ).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  async createShipment(
    config: SellerCourierConfig,
    details: ShipmentDetails,
  ): Promise<CreateShipmentResult> {
    const base = this.getBaseUrl(config);
    const merchantCode =
      (config.metadata as any)?.merchantCode || '';
    const serviceCode =
      (config.metadata as any)?.serviceCode || 'REGULAR';

    const payload = {
      client_name: merchantCode,
      service_code: serviceCode,
      service_leg: 'FORWARD',
      amount_to_collect: details.isCod ? details.totalAmount : 0,
      source: {
        location_code: config.warehouseId || 'DEFAULT',
        name: details.sellerAddress.name,
        phone: details.sellerAddress.phone,
        address: {
          address_line1: details.sellerAddress.address,
          city: details.sellerAddress.city,
          state: details.sellerAddress.state,
          pincode: details.sellerAddress.pincode,
          country: 'India',
        },
      },
      destination: {
        name: details.deliveryAddress.fullName,
        phone: details.deliveryAddress.phone,
        address: {
          address_line1: details.deliveryAddress.addressLine1,
          address_line2: details.deliveryAddress.addressLine2 || '',
          city: details.deliveryAddress.city,
          state: details.deliveryAddress.state,
          pincode: details.deliveryAddress.pincode,
          country: 'India',
        },
      },
      dispatch_date: new Date().toISOString().split('T')[0],
      order_id: details.orderNumber,
      weight: (details.weight || 0.5) * 1000,
      dimensions: {
        length: parseInt(details.dimensions?.split('x')[0] || '10'),
        breadth: parseInt(details.dimensions?.split('x')[1] || '10'),
        height: parseInt(details.dimensions?.split('x')[2] || '10'),
      },
      items: details.items.map((item) => ({
        description: item.name,
        quantity: item.quantity,
        value: item.price,
      })),
    };

    const res = await fetch(`${base}/v1/shipments`, {
      method: 'POST',
      headers: this.headers(config),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Ekart create shipment failed: ${errText}`);
      throw new Error(`Failed to create Ekart shipment: ${errText}`);
    }

    const data = await res.json();
    const awb =
      data.tracking_id || data.awb_number || data.shipment_id || '';

    return {
      awbNumber: String(awb),
      courierOrderId: data.shipment_id?.toString() || '',
      trackingUrl: `https://ekartlogistics.com/track/${awb}`,
    };
  }

  async trackShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<TrackingResult> {
    const base = this.getBaseUrl(config);

    const res = await fetch(`${base}/v1/shipments/track/${awbNumber}`, {
      headers: this.headers(config),
    });

    if (!res.ok) {
      throw new Error('Failed to track Ekart shipment');
    }

    const data = await res.json();
    const events = data.tracking_events || data.events || [];

    const statusHistory = events.map((e: any) => ({
      status: e.status || e.event || '',
      timestamp: e.timestamp || e.date || '',
      location: e.location || '',
      remark: e.description || e.remark || '',
    }));

    return {
      status: this.mapEkartStatus(data.current_status || data.status || ''),
      statusHistory,
      currentLocation: events[0]?.location,
      estimatedDelivery: data.expected_delivery_date,
    };
  }

  async cancelShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<CancelResult> {
    const base = this.getBaseUrl(config);

    const res = await fetch(`${base}/v1/shipments/${awbNumber}/cancel`, {
      method: 'POST',
      headers: this.headers(config),
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
    const base = this.getBaseUrl(config);

    const res = await fetch(
      `${base}/v1/serviceability?origin_pincode=${pickupPincode}&destination_pincode=${deliveryPincode}`,
      { headers: this.headers(config) },
    );

    if (!res.ok) {
      return { serviceable: false };
    }

    const data = await res.json();
    return {
      serviceable: data.serviceable === true,
      estimatedDays: data.estimated_days || 5,
      charges: data.charges,
    };
  }

  private mapEkartStatus(status: string): string {
    const normalized = status.toLowerCase();
    if (normalized.includes('delivered')) return 'DELIVERED';
    if (normalized.includes('out for delivery')) return 'OUT_FOR_DELIVERY';
    if (normalized.includes('in transit') || normalized.includes('hub'))
      return 'IN_TRANSIT';
    if (normalized.includes('picked')) return 'PICKED_UP';
    if (normalized.includes('dispatched') || normalized.includes('booked'))
      return 'BOOKED';
    if (normalized.includes('rto')) return 'RTO_INITIATED';
    if (normalized.includes('cancel')) return 'CANCELLED';
    return 'IN_TRANSIT';
  }
}
