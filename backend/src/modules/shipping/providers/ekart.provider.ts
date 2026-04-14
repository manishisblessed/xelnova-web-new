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

interface EkartTokenCache {
  accessToken: string;
  expiresAt: number;
}

@Injectable()
export class EkartProvider implements CourierProvider {
  readonly providerName = 'Ekart';
  private readonly logger = new Logger(EkartProvider.name);
  private readonly BASE = 'https://app.elite.ekartlogistics.in';
  private readonly tokenCache = new Map<string, EkartTokenCache>();

  /**
   * Ekart uses OAuth-style token auth:
   * POST /integrations/v2/auth/token/{client_id}
   * Body: { username, password }
   * Returns: { access_token, token_type: "Bearer", expires_in }
   *
   * Config mapping:
   *   accountId  → client_id  (e.g. EKART_698317571ff77a997480dcce)
   *   apiKey     → username
   *   apiSecret  → password
   */
  private async getAccessToken(config: SellerCourierConfig): Promise<string> {
    const cacheKey = config.id;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    const clientId = config.accountId || '';
    const res = await fetch(
      `${this.BASE}/integrations/v2/auth/token/${encodeURIComponent(clientId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.apiKey,
          password: config.apiSecret || '',
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Ekart token fetch failed: ${res.status} ${errText}`);
      throw new Error(`Ekart authentication failed: ${errText}`);
    }

    const data = await res.json();
    const token = data.access_token as string;
    const expiresIn = (data.expires_in as number) || 86400;

    this.tokenCache.set(cacheKey, {
      accessToken: token,
      expiresAt: Date.now() + expiresIn * 1000,
    });

    return token;
  }

  private async authHeaders(config: SellerCourierConfig): Promise<Record<string, string>> {
    const token = await this.getAccessToken(config);
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

    const totalAmount = details.totalAmount || 0;
    const taxValue = 0;
    const taxableAmount = totalAmount;
    const isCod = details.isCod ?? false;

    const dims = details.dimensions?.split('x') || [];
    const length = parseInt(dims[0] || '10', 10);
    const width = parseInt(dims[1] || '10', 10);
    const height = parseInt(dims[2] || '10', 10);

    const payload: Record<string, any> = {
      seller_name: details.sellerAddress.name || 'Seller',
      seller_address: [
        details.sellerAddress.address,
        details.sellerAddress.city,
        details.sellerAddress.state,
        details.sellerAddress.pincode,
      ]
        .filter(Boolean)
        .join(', '),
      seller_gst_tin: '',
      consignee_gst_amount: 0,
      order_number: details.orderNumber,
      invoice_number: details.orderNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      consignee_name: details.deliveryAddress.fullName,
      consignee_alternate_phone: details.deliveryAddress.phone || '',
      payment_mode: isCod ? 'COD' : 'Prepaid',
      category_of_goods: 'General',
      products_desc: details.items.map((i) => i.name).join(', ').slice(0, 200) || 'Products',
      total_amount: totalAmount,
      tax_value: taxValue,
      taxable_amount: taxableAmount,
      commodity_value: String(taxableAmount),
      cod_amount: isCod ? totalAmount : 0,
      return_reason: '',
      quantity: details.items.reduce((s, i) => s + i.quantity, 0) || 1,
      weight: Math.round((details.weight || 0.5) * 1000),
      length,
      height,
      width,
      drop_location: {
        name: details.deliveryAddress.fullName,
        phone: parseInt(details.deliveryAddress.phone?.replace(/\D/g, '').slice(-10) || '0', 10),
        address: [
          details.deliveryAddress.addressLine1,
          details.deliveryAddress.addressLine2,
        ]
          .filter(Boolean)
          .join(', '),
        city: details.deliveryAddress.city || '',
        state: details.deliveryAddress.state || '',
        country: 'India',
        pin: parseInt(details.deliveryAddress.pincode || '0', 10),
      },
      pickup_location: {
        name: config.warehouseId || details.sellerAddress.name || 'Default',
        phone: parseInt(details.sellerAddress.phone?.replace(/\D/g, '').slice(-10) || '0', 10),
        address: details.sellerAddress.address || '',
        city: details.sellerAddress.city || '',
        state: details.sellerAddress.state || '',
        country: 'India',
        pin: parseInt(details.sellerAddress.pincode || '0', 10),
      },
      return_location: {
        name: config.warehouseId || details.sellerAddress.name || 'Default',
        phone: parseInt(details.sellerAddress.phone?.replace(/\D/g, '').slice(-10) || '0', 10),
        address: details.sellerAddress.address || '',
        city: details.sellerAddress.city || '',
        state: details.sellerAddress.state || '',
        country: 'India',
        pin: parseInt(details.sellerAddress.pincode || '0', 10),
      },
    };

    const res = await fetch(`${this.BASE}/api/v1/package/create`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Ekart create shipment failed: ${res.status} ${errText}`);
      throw new Error(`Failed to create Ekart shipment: ${errText}`);
    }

    const data = await res.json();

    if (data.status === false) {
      throw new Error(`Ekart rejected shipment: ${data.remark || 'Unknown error'}`);
    }

    const trackingId = data.tracking_id || '';

    return {
      awbNumber: String(trackingId),
      courierOrderId: String(trackingId),
      trackingUrl: `${this.BASE}/track/${trackingId}`,
      labelUrl: undefined,
    };
  }

  async trackShipment(
    awbNumber: string,
    _config: SellerCourierConfig,
  ): Promise<TrackingResult> {
    // Track API is open (no auth required)
    const res = await fetch(`${this.BASE}/api/v1/track/${encodeURIComponent(awbNumber)}`);

    if (!res.ok) {
      throw new Error('Failed to track Ekart shipment');
    }

    const data = await res.json();
    const track = data.track || {};
    const details = track.details || [];

    const statusHistory = details.map((d: any) => ({
      status: d.status || '',
      timestamp: d.ctime ? new Date(d.ctime).toISOString() : '',
      location: d.location || '',
      remark: d.desc || '',
    }));

    return {
      status: this.mapEkartStatus(track.status || ''),
      statusHistory,
      currentLocation: track.location || undefined,
      estimatedDelivery: data.edd ? new Date(data.edd).toISOString() : undefined,
    };
  }

  async cancelShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<CancelResult> {
    const headers = await this.authHeaders(config);

    const res = await fetch(
      `${this.BASE}/api/v1/package/cancel?tracking_id=${encodeURIComponent(awbNumber)}`,
      { method: 'DELETE', headers },
    );

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

    // Use V3 serviceability that checks pickup→drop pair
    const res = await fetch(`${this.BASE}/data/v3/serviceability`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pickupPincode,
        dropPincode: deliveryPincode,
        length: '10',
        width: '10',
        height: '10',
        weight: '500',
        paymentType: 'Prepaid',
        invoiceAmount: '1000',
      }),
    });

    if (!res.ok) {
      // Fallback to V2 single-pincode check
      const v2Res = await fetch(
        `${this.BASE}/api/v2/serviceability/${deliveryPincode}`,
        { headers },
      );

      if (!v2Res.ok) return { serviceable: false };

      const v2Data = await v2Res.json();
      return {
        serviceable: v2Data.status === true,
        estimatedDays: 5,
      };
    }

    const data = await res.json();
    const partners = Array.isArray(data) ? data : [];

    if (partners.length === 0) {
      return { serviceable: false };
    }

    const first = partners[0];
    return {
      serviceable: true,
      estimatedDays: first.tat?.max || first.tat?.min || 5,
      charges: first.forwardDeliveredCharges?.totalForwardDeliveredEstimate
        ? parseFloat(first.forwardDeliveredCharges.totalForwardDeliveredEstimate)
        : undefined,
    };
  }

  async downloadLabel(
    trackingIds: string[],
    config: SellerCourierConfig,
  ): Promise<Buffer> {
    const headers = await this.authHeaders(config);

    const res = await fetch(`${this.BASE}/api/v1/package/label`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: trackingIds }),
    });

    if (!res.ok) {
      throw new Error('Failed to download Ekart label');
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private mapEkartStatus(status: string): string {
    const s = status.toLowerCase();
    if (s === 'delivered') return 'DELIVERED';
    if (s === 'out for delivery') return 'OUT_FOR_DELIVERY';
    if (s.includes('in transit')) return 'IN_TRANSIT';
    if (s === 'picked up') return 'PICKED_UP';
    if (s === 'pickup scheduled' || s === 'out for pickup') return 'PICKUP_SCHEDULED';
    if (s === 'order placed' || s === 'pickup pending') return 'BOOKED';
    if (s.includes('rto delivered')) return 'RTO_DELIVERED';
    if (s.includes('rto')) return 'RTO_INITIATED';
    if (s === 'cancelled' || s === 'seller cancelled') return 'CANCELLED';
    if (s === 'lost' || s === 'damaged') return 'CANCELLED';
    if (s === 'undelivered' || s === 'not serviceable') return 'IN_TRANSIT';
    return 'IN_TRANSIT';
  }
}
