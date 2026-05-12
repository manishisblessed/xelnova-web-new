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
    const billingPhone = (details.deliveryAddress.phone || '').replace(/\D/g, '').slice(-10);

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
      billing_phone: billingPhone,
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
    const awb = String(
      awbData?.response?.data?.awb_code ||
      awbData?.awb_code ||
      awbData?.data?.awb_code ||
      '',
    ).trim();

    if (!awb) {
      this.logger.error(
        `ShipRocket AWB assign returned 200 but no awb_code found. Response: ${JSON.stringify(awbData).slice(0, 500)}`,
      );
      throw new Error(
        'ShipRocket accepted the order but did not assign an AWB number. This usually means no courier is available for this route/weight. Try a different shipping option.',
      );
    }

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
      awbNumber: awb,
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
   *
   * Resolution order:
   * 1. AWB → track → shipment_id → generate/label
   * 2. courierOrderId (SR order_id) → order details → shipment_id → generate/label
   */
  async downloadLabelPdf(
    awbNumber: string,
    config: SellerCourierConfig,
    courierOrderId?: string | null,
  ): Promise<Buffer | null> {
    const headers = await this.authHeaders(config);
    let shipmentId: number | null = null;

    if (awbNumber) {
      shipmentId = await this.resolveShipmentIdFromAwb(awbNumber, headers);
    }

    if (!shipmentId && courierOrderId) {
      shipmentId = await this.resolveShipmentIdFromOrder(courierOrderId, headers);
    }

    if (!shipmentId) {
      this.logger.warn(
        `ShipRocket: cannot resolve shipment_id for label (awb=${awbNumber || '—'}, orderId=${courierOrderId || '—'})`,
      );
      return null;
    }

    return this.generateLabelFromShipmentId(shipmentId, headers);
  }

  private async resolveShipmentIdFromAwb(
    awbNumber: string,
    headers: Record<string, string>,
  ): Promise<number | null> {
    try {
      const trackRes = await fetch(
        `${this.baseUrl}/v1/external/courier/track/awb/${encodeURIComponent(awbNumber)}`,
        { headers },
      );
      if (!trackRes.ok) return null;
      const td = await trackRes.json();
      const tracking = td?.tracking_data || td;
      const rawSid = tracking?.shipment_id ?? td?.shipment_id ?? td?.data?.shipment_id ?? null;
      const sid = typeof rawSid === 'number' ? rawSid : parseInt(String(rawSid ?? ''), 10);
      return Number.isFinite(sid) ? sid : null;
    } catch {
      return null;
    }
  }

  private async resolveShipmentIdFromOrder(
    courierOrderId: string,
    headers: Record<string, string>,
  ): Promise<number | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/v1/external/orders/show/${encodeURIComponent(courierOrderId)}`,
        { headers },
      );
      if (!res.ok) return null;
      const data = await res.json();
      const rawSid =
        data?.data?.shipments?.[0]?.id ??
        data?.shipments?.[0]?.id ??
        data?.data?.shipment_id ??
        data?.shipment_id ??
        null;
      const sid = typeof rawSid === 'number' ? rawSid : parseInt(String(rawSid ?? ''), 10);
      return Number.isFinite(sid) ? sid : null;
    } catch {
      return null;
    }
  }

  private async generateLabelFromShipmentId(
    shipmentId: number,
    headers: Record<string, string>,
  ): Promise<Buffer | null> {
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
   * Fetch existing ShipRocket pickup locations and find the best match.
   * ShipRocket's pickup_location field is the identifier used in order creation.
   */
  private async findExistingPickupLocation(
    headers: Record<string, string>,
    options: RegisterWarehouseOptions,
  ): Promise<{ found: boolean; name?: string; id?: number; locations?: any[] }> {
    try {
      const listRes = await fetch(`${this.baseUrl}/v1/external/settings/company/pickup`, {
        headers,
      });

      if (!listRes.ok) return { found: false };

      const listData = await listRes.json();
      const locations = listData?.data?.shipping_address || [];
      if (locations.length === 0) return { found: false, locations: [] };

      const displayName = (options.label || options.name).slice(0, 36);

      // Only match by exact pickup_location name — never by pincode/city
      // because a seller can have multiple locations in the same area.
      const byName = locations.find(
        (loc: any) =>
          loc.pickup_location?.toLowerCase() === displayName.toLowerCase() ||
          loc.pickup_location?.toLowerCase() === options.name.toLowerCase(),
      );
      if (byName) {
        return { found: true, name: byName.pickup_location, id: byName.id, locations };
      }

      return { found: false, locations };
    } catch (err) {
      this.logger.warn(`Failed to check existing ShipRocket pickup locations: ${err}`);
      return { found: false };
    }
  }

  /**
   * Register a pickup location (warehouse) with ShipRocket.
   * ShipRocket requires pickup locations to be registered via their API
   * before they can be used for shipments. The pickup_location string
   * must exactly match what ShipRocket has on file.
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

    // Check existing locations first — match by name, pincode, or city
    const existing = await this.findExistingPickupLocation(headers, options);

    if (existing.found && existing.name) {
      this.logger.log(
        `ShipRocket: Using existing pickup location "${existing.name}" (ID: ${existing.id}).`,
      );
      return {
        success: true,
        registeredName: existing.name,
        alreadyExisted: true,
        message: `Using existing ShipRocket pickup location "${existing.name}".`,
      };
    }

    // No matching location found — create a new one
    const phone = options.phone.replace(/\D/g, '').slice(-10);
    const shipperName = options.contactPerson || options.registeredName || options.name;
    const displayName = (options.label || options.name).slice(0, 36);

    const email = options.email?.trim()
      || (phone ? `pickup.${phone}@xelnova.in` : `pickup.${Date.now()}@xelnova.in`);

    const addressLine2Parts = [options.addressLine2, options.landmark].filter(Boolean);

    const payload = {
      pickup_location: displayName,
      name: shipperName,
      email,
      phone,
      address: options.address.slice(0, 80),
      address_2: addressLine2Parts.join(', ').slice(0, 80) || '',
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

      const resText = await res.text();
      let data: any = {};
      try { data = JSON.parse(resText); } catch { /* not JSON */ }

      if (!res.ok) {
        this.logger.error(`ShipRocket addpickup failed: ${res.status} ${resText.slice(0, 400)}`);

        if (resText.toLowerCase().includes('already') || resText.toLowerCase().includes('exists')) {
          const retry = await this.findExistingPickupLocation(headers, options);
          if (retry.found && retry.name) {
            return {
              success: true,
              registeredName: retry.name,
              alreadyExisted: true,
              message: `Using existing ShipRocket pickup location "${retry.name}".`,
            };
          }
        }

        // Parse validation errors from ShipRocket into a human-readable message
        let userMessage = `ShipRocket rejected the address (HTTP ${res.status}).`;
        try {
          const parsed = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
          if (parsed && typeof parsed === 'object') {
            const errors = Object.entries(parsed)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('; ');
            if (errors) userMessage = `ShipRocket: ${errors}`;
          }
        } catch { /* use default message */ }

        return {
          success: false,
          message: userMessage,
        };
      }

      if (data.success === false || data.status === false) {
        this.logger.warn(`ShipRocket addpickup returned 200 but rejected: ${resText.slice(0, 300)}`);

        const retry = await this.findExistingPickupLocation(headers, options);
        if (retry.found && retry.name) {
          return {
            success: true,
            registeredName: retry.name,
            alreadyExisted: true,
            message: `Using existing ShipRocket pickup location "${retry.name}".`,
          };
        }

        return {
          success: false,
          message: data.message || 'ShipRocket rejected the pickup location registration.',
        };
      }

      // ShipRocket assigns its own pickup_code (e.g. "TESTADI") — use
      // the pickup_location we sent (which is what the order API expects),
      // but log the internal pickup_code for debugging.
      const pickupCode = data?.address?.pickup_code || '';
      const pickupName =
        data?.address?.pickup_location || data?.pickup_location || displayName;
      this.logger.log(
        `ShipRocket pickup "${pickupName}" registered (pickup_code: ${pickupCode}, id: ${data?.pickup_id || 'n/a'}).`,
      );

      return {
        success: true,
        registeredName: pickupName,
        message: `Pickup location "${pickupName}" registered with ShipRocket.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`ShipRocket registerWarehouse failed: ${msg}`);

      if (config.warehouseId?.trim()) {
        const alias = config.warehouseId.trim();
        return {
          success: true,
          registeredName: alias,
          alreadyExisted: true,
          message: `Using configured ShipRocket pickup location "${alias}" (API unavailable).`,
        };
      }

      return {
        success: false,
        message: `Failed to register pickup location with ShipRocket: ${msg}`,
      };
    }
  }
}
