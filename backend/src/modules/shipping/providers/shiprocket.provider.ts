import { Injectable, Logger } from '@nestjs/common';
import { SellerCourierConfig } from '@prisma/client';
import {
  CourierProvider,
  ShipmentDetails,
  CreateShipmentResult,
  TrackingResult,
  CancelResult,
  ServiceabilityResult,
  RegisterWarehouseOptions,
  RegisterWarehouseResult,
} from './courier-provider.interface';

@Injectable()
export class ShipRocketProvider implements CourierProvider {
  readonly providerName = 'ShipRocket';
  private readonly logger = new Logger(ShipRocketProvider.name);
  private readonly baseUrl = 'https://apiv2.shiprocket.in';

  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  private async getAuthToken(config: SellerCourierConfig): Promise<string> {
    const cacheKey = config.id;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const res = await fetch(`${this.baseUrl}/v1/external/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.accountId,
        password: config.apiKey,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`ShipRocket auth failed: ${errText}`);
      throw new Error(`ShipRocket authentication failed`);
    }

    const data = await res.json();
    const token = data.token;

    // Token valid for 10 days; cache for 9 days
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000,
    });

    return token;
  }

  private async authHeaders(config: SellerCourierConfig): Promise<Record<string, string>> {
    const token = await this.getAuthToken(config);
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async createShipment(
    config: SellerCourierConfig,
    details: ShipmentDetails,
  ): Promise<CreateShipmentResult> {
    const headers = await this.authHeaders(config);

    // Step 1: Create order
    const orderPayload = {
      order_id: details.orderNumber,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: config.warehouseId || 'Primary',
      billing_customer_name: details.deliveryAddress.fullName.split(' ')[0],
      billing_last_name:
        details.deliveryAddress.fullName.split(' ').slice(1).join(' ') || '',
      billing_address: details.deliveryAddress.addressLine1,
      billing_address_2: details.deliveryAddress.addressLine2 || '',
      billing_city: details.deliveryAddress.city,
      billing_pincode: details.deliveryAddress.pincode,
      billing_state: details.deliveryAddress.state,
      billing_country: 'India',
      billing_email: '',
      billing_phone: details.deliveryAddress.phone,
      shipping_is_billing: true,
      order_items: details.items.map((item) => ({
        name: item.name,
        sku: `SKU-${details.orderNumber}`,
        units: item.quantity,
        selling_price: item.price.toString(),
        discount: '0',
        tax: '',
        hsn: '',
      })),
      payment_method: details.isCod ? 'COD' : 'Prepaid',
      sub_total: details.totalAmount,
      length: parseInt(details.dimensions?.split('x')[0] || '10'),
      breadth: parseInt(details.dimensions?.split('x')[1] || '10'),
      height: parseInt(details.dimensions?.split('x')[2] || '10'),
      weight: details.weight || 0.5,
    };

    const orderRes = await fetch(
      `${this.baseUrl}/v1/external/orders/create/adhoc`,
      { method: 'POST', headers, body: JSON.stringify(orderPayload) },
    );

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      this.logger.error(`ShipRocket create order failed: ${errText}`);
      throw new Error(`Failed to create ShipRocket order: ${errText}`);
    }

    const orderData = await orderRes.json();
    const shipmentId = orderData.shipment_id;
    const srOrderId = orderData.order_id;

    if (!shipmentId) {
      throw new Error(
        `ShipRocket order created but no shipment_id returned: ${JSON.stringify(orderData)}`,
      );
    }

    // Step 2: Assign AWB (auto-select courier)
    const awbRes = await fetch(
      `${this.baseUrl}/v1/external/courier/assign/awb`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ shipment_id: shipmentId }),
      },
    );

    if (!awbRes.ok) {
      const errText = await awbRes.text();
      this.logger.error(`ShipRocket AWB assign failed: ${errText}`);
      throw new Error(`Failed to assign ShipRocket AWB: ${errText}`);
    }

    const awbData = await awbRes.json();
    const awb =
      awbData?.response?.data?.awb_code || awbData?.awb_code || '';

    // Step 3: Generate pickup request
    try {
      await fetch(`${this.baseUrl}/v1/external/courier/generate/pickup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
    } catch (err) {
      this.logger.warn('ShipRocket pickup generation failed (non-critical)');
    }

    // Step 4: Request printable label (non-fatal — booking may still succeed).
    let labelUrl: string | undefined;
    try {
      const labelRes = await fetch(`${this.baseUrl}/v1/external/courier/generate/label`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      });
      if (labelRes.ok) {
        const labelJson = await labelRes.json();
        labelUrl =
          labelJson?.label_url ||
          labelJson?.label_created_url ||
          labelJson?.response?.data?.label_url ||
          labelJson?.tracking_data?.label_url ||
          '';
        if (!labelUrl) this.logger.log(`ShipRocket label response had no URL: ${JSON.stringify(labelJson).slice(0, 200)}`);
      } else {
        const t = await labelRes.text();
        this.logger.warn(`ShipRocket generate/label HTTP ${labelRes.status}: ${t.slice(0, 200)}`);
      }
    } catch (err) {
      this.logger.warn(
        `ShipRocket label generation skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      awbNumber: String(awb),
      courierOrderId: String(srOrderId),
      trackingUrl: `https://shiprocket.co/tracking/${awb}`,
      labelUrl: labelUrl || undefined,
      charges: awbData?.response?.data?.freight_charge,
    };
  }

  async trackShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<TrackingResult> {
    const headers = await this.authHeaders(config);
    const res = await fetch(
      `${this.baseUrl}/v1/external/courier/track/awb/${awbNumber}`,
      { headers },
    );

    if (!res.ok) {
      throw new Error('Failed to track ShipRocket shipment');
    }

    const data = await res.json();
    const tracking = data?.tracking_data;

    if (!tracking) {
      return { status: 'UNKNOWN', statusHistory: [] };
    }

    const activities = tracking.shipment_track_activities || [];
    const statusHistory = activities.map((a: any) => ({
      status: a['sr-status-label'] || a.activity || '',
      timestamp: a.date || '',
      location: a.location || '',
      remark: a.activity || '',
    }));

    return {
      status: this.mapShipRocketStatus(
        tracking.shipment_status?.toString() || '',
      ),
      statusHistory,
      currentLocation: tracking.shipment_track?.[0]?.current_status || '',
      estimatedDelivery: tracking.etd,
    };
  }

  async cancelShipment(
    cancelId: string,
    config: SellerCourierConfig,
  ): Promise<CancelResult> {
    const headers = await this.authHeaders(config);

    // ShipRocket cancels by Shiprocket order IDs (passed via courierOrderId from service layer)
    const orderId = parseInt(cancelId, 10);
    const res = await fetch(`${this.baseUrl}/v1/external/orders/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: [isNaN(orderId) ? cancelId : orderId] }),
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
    const headers = await this.authHeaders(config);
    const params = new URLSearchParams({
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: '0.5',
      cod: '0',
    });

    const res = await fetch(
      `${this.baseUrl}/v1/external/courier/serviceability/?${params}`,
      { headers },
    );

    if (!res.ok) {
      return { serviceable: false };
    }

    const data = await res.json();
    const couriers =
      data?.data?.available_courier_companies || [];

    if (couriers.length === 0) {
      return { serviceable: false };
    }

    return {
      serviceable: true,
      estimatedDays: couriers[0]?.estimated_delivery_days || 5,
      charges: couriers[0]?.freight_charge,
      availableCouriers: couriers.map((c: any) => ({
        name: c.courier_name,
        estimatedDays: c.estimated_delivery_days,
        charges: c.freight_charge,
      })),
    };
  }

  /**
   * Downloads the carrier-issued shipping label as binary PDF.
   * Generates a label URL when needed (AWB → track → shipment id → generate/label).
   */
  async downloadLabelPdf(awbNumber: string, config: SellerCourierConfig): Promise<Buffer | null> {
    const headers = await this.authHeaders(config);

    const trackRes = await fetch(
      `${this.baseUrl}/v1/external/courier/track/awb/${encodeURIComponent(awbNumber)}`,
      { headers },
    );
    if (!trackRes.ok) {
      this.logger.warn(`ShipRocket track AWB failed (${trackRes.status}) for label download`);
      return null;
    }

    const td = await trackRes.json();
    const tracking = td?.tracking_data || td;
    const rawSid =
      tracking?.shipment_id ??
      td?.shipment_id ??
      td?.data?.shipment_id ??
      null;
    const shipmentId = typeof rawSid === 'number' ? rawSid : parseInt(String(rawSid ?? ''), 10);
    if (!Number.isFinite(shipmentId)) {
      this.logger.warn('ShipRocket tracking response missing shipment_id for label generation');
      return null;
    }

    const labelRes = await fetch(`${this.baseUrl}/v1/external/courier/generate/label`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ shipment_id: [shipmentId] }),
    });

    if (!labelRes.ok) {
      const t = await labelRes.text();
      this.logger.warn(`ShipRocket generate/label failed: ${labelRes.status} ${t.slice(0, 200)}`);
      return null;
    }

    const labelJson = await labelRes.json();
    const labelUrl =
      labelJson?.label_url ||
      labelJson?.label_created_url ||
      labelJson?.response?.data?.label_url ||
      '';

    if (labelUrl && /^https?:\/\//i.test(String(labelUrl))) {
      const pdfRes = await fetch(String(labelUrl), { redirect: 'follow' });
      if (pdfRes.ok) {
        const buf = Buffer.from(await pdfRes.arrayBuffer());
        if (buf.length > 8 && buf.slice(0, 4).toString() === '%PDF') return buf;
      }
    }

    return null;
  }

  private mapShipRocketStatus(statusCode: string): string {
    const map: Record<string, string> = {
      '1': 'BOOKED',
      '2': 'PICKED_UP',
      '3': 'IN_TRANSIT',
      '4': 'IN_TRANSIT',
      '5': 'OUT_FOR_DELIVERY',
      '6': 'DELIVERED',
      '7': 'CANCELLED',
      '8': 'RTO_INITIATED',
      '9': 'RTO_DELIVERED',
      '10': 'RTO_DELIVERED',
      '17': 'OUT_FOR_DELIVERY',
      '18': 'IN_TRANSIT',
      '19': 'OUT_FOR_DELIVERY',
      '20': 'IN_TRANSIT',
    };
    return map[statusCode] || 'IN_TRANSIT';
  }

  /**
   * Register a pickup location (warehouse) with ShipRocket.
   * ShipRocket requires pickup locations to be registered via their API
   * before they can be used for shipments.
   */
  async registerWarehouse(
    config: SellerCourierConfig,
    options: RegisterWarehouseOptions,
  ): Promise<RegisterWarehouseResult> {
    if (!options.name || !options.address || !options.city || !options.state || !options.pincode || !options.phone) {
      return {
        success: false,
        message: 'Missing required fields (name, address, city, state, pincode, phone).',
      };
    }

    const headers = await this.authHeaders(config);

    // Check if pickup location already exists
    try {
      const listRes = await fetch(`${this.baseUrl}/v1/external/settings/company/pickup`, {
        headers,
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const locations = listData?.data?.shipping_address || [];
        
        // Check if a location with this name already exists
        const existing = locations.find(
          (loc: any) => 
            loc.pickup_location?.toLowerCase() === options.name.toLowerCase() ||
            loc.pickup_location === options.name
        );

        if (existing) {
          this.logger.log(
            `ShipRocket pickup location "${options.name}" already registered (ID: ${existing.id}).`,
          );
          return {
            success: true,
            registeredName: existing.pickup_location || options.name,
            message: `Pickup location "${options.name}" is already registered with ShipRocket.`,
          };
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to check existing ShipRocket pickup locations: ${err}`);
    }

    // Create new pickup location
    const nameParts = (options.name || '').split(' ');
    const firstName = nameParts[0] || 'Seller';
    const lastName = nameParts.slice(1).join(' ') || 'Pickup';

    const payload = {
      pickup_location: options.name,
      name: firstName,
      last_name: lastName,
      email: options.email || `pickup-${Date.now()}@seller.local`,
      phone: options.phone.replace(/\D/g, '').slice(-10),
      address: options.address,
      address_2: '',
      city: options.city,
      state: options.state,
      country: options.country || 'India',
      pin_code: options.pincode,
    };

    try {
      const res = await fetch(`${this.baseUrl}/v1/external/settings/company/addpickup`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.error(`ShipRocket addpickup failed: ${res.status} ${errText}`);
        return {
          success: false,
          message: `Failed to register pickup location with ShipRocket: ${errText}`,
        };
      }

      const data = await res.json();

      if (data.success === false || data.status === false) {
        return {
          success: false,
          message: data.message || 'ShipRocket rejected the pickup location registration.',
        };
      }

      this.logger.log(`ShipRocket pickup location "${options.name}" registered successfully.`);

      return {
        success: true,
        registeredName: options.name,
        message: `Pickup location "${options.name}" registered with ShipRocket.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`ShipRocket registerWarehouse failed: ${msg}`);
      return {
        success: false,
        message: `Failed to register pickup location with ShipRocket: ${msg}`,
      };
    }
  }
}
