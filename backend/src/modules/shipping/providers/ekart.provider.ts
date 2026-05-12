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
      consignee_phone: details.deliveryAddress.phone?.replace(/\D/g, '').slice(-10) || '',
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
        name: config.warehouseId || 'Primary',
        phone: parseInt(details.sellerAddress.phone?.replace(/\D/g, '').slice(-10) || '0', 10),
        address: details.sellerAddress.address || '',
        city: details.sellerAddress.city || '',
        state: details.sellerAddress.state || '',
        country: 'India',
        pin: parseInt(details.sellerAddress.pincode || '0', 10),
      },
      return_location: {
        name: config.warehouseId || 'Primary',
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

    const labelUrlRaw =
      data.label_url ||
      data.labelUrl ||
      data.shipping_label_url ||
      data.data?.label_url ||
      data.data?.labelUrl ||
      '';

    return {
      awbNumber: String(trackingId),
      courierOrderId: String(trackingId),
      trackingUrl: `${this.BASE}/track/${trackingId}`,
      labelUrl:
        typeof labelUrlRaw === 'string' && /^https?:\/\//i.test(labelUrlRaw.trim())
          ? labelUrlRaw.trim()
          : undefined,
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

  /**
   * Official Ekart label PDF via POST /api/v1/package/label.
   *
   * Pass `json_only=false` so the API returns the raw PDF binary
   * (`application/octet-stream`) instead of JSON metadata.
   * Falls back to JSON parsing (URL / base64) when the response
   * isn't a direct PDF — some Ekart account tiers may ignore the
   * query flag.
   */
  async downloadLabelPdf(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<Buffer | null> {
    const headers = await this.authHeaders(config);

    const isPdfBuffer = (buf: Buffer): boolean => {
      if (buf.length < 8) return false;
      const start = buf.indexOf(0x25); // '%'
      if (start >= 0 && start <= 4) {
        const sig = buf.slice(start, start + 4).toString('ascii');
        if (sig === '%PDF') return true;
      }
      return false;
    };

    const fetchUrlAsPdf = async (url: string): Promise<Buffer | null> => {
      try {
        const r = await fetch(url, { redirect: 'follow' });
        if (!r.ok) return null;
        const b = Buffer.from(await r.arrayBuffer());
        if (isPdfBuffer(b)) return b;
        return null;
      } catch {
        return null;
      }
    };

    const res = await fetch(
      `${this.BASE}/api/v1/package/label?json_only=false`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: [awbNumber] }),
      },
    );

    if (!res.ok) {
      const t = await res.text();
      this.logger.warn(`Ekart label API failed (${res.status}): ${t.slice(0, 300)}`);
      return null;
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());

    if (isPdfBuffer(buf)) {
      this.logger.log(`Ekart label PDF for ${awbNumber}, ${buf.length} bytes.`);
      return buf;
    }

    // octet-stream that isn't obviously JSON — trust the carrier.
    if (
      ct.includes('application/octet-stream') &&
      buf.length > 128 &&
      buf[0] !== 0x7b // not '{'
    ) {
      this.logger.log(
        `Ekart label octet-stream for ${awbNumber}, ${buf.length} bytes (non-JSON binary, trusting carrier).`,
      );
      return buf;
    }

    // JSON fallback: extract download URL or base64-encoded PDF.
    if (ct.includes('application/json') || (buf.length > 0 && buf[0] === 0x7b)) {
      try {
        const j = JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
        const dataObj =
          typeof j.data === 'object' && j.data !== null
            ? (j.data as Record<string, unknown>)
            : {};

        const url =
          (j.label_url as string) ||
          (j.url as string) ||
          (j.pdf_url as string) ||
          String(dataObj.label_url || dataObj.url || '');
        if (url && /^https?:\/\//i.test(url)) {
          const pdf = await fetchUrlAsPdf(url);
          if (pdf) {
            this.logger.log(`Ekart label from URL for ${awbNumber}, ${pdf.length} bytes.`);
            return pdf;
          }
        }

        const b64 =
          (j.pdf_base64 as string) ||
          (j.label_pdf_base64 as string) ||
          String(dataObj.pdf_base64 || dataObj.label_pdf_base64 || '');
        if (typeof b64 === 'string' && b64.length > 64) {
          const raw = Buffer.from(b64, 'base64');
          if (isPdfBuffer(raw)) {
            this.logger.log(`Ekart label from base64 for ${awbNumber}, ${raw.length} bytes.`);
            return raw;
          }
        }
      } catch {
        /* not parseable JSON */
      }
    }

    this.logger.warn(
      `Ekart label response for ${awbNumber} was not a usable PDF (ct=${ct}, len=${buf.length}).`,
    );
    return null;
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

  /**
   * List all registered addresses from the Ekart account.
   * Official V2 endpoint: GET /api/v2/addresses → array of { alias, phone, address_line1, ... }
   */
  private async fetchExistingAddresses(headers: Record<string, string>): Promise<any[]> {
    try {
      const res = await fetch(`${this.BASE}/api/v2/addresses`, { headers });
      if (!res.ok) {
        this.logger.warn(`Ekart: GET /api/v2/addresses returned ${res.status}`);
        return [];
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      this.logger.log(`Ekart: Found ${list.length} registered address(es).`);
      return list;
    } catch (err) {
      this.logger.warn(`Ekart: Failed to fetch addresses: ${err}`);
      return [];
    }
  }

  /**
   * Register a pickup/RTO address with Ekart using the official V2 API.
   *
   * Flow:
   * 1. GET /api/v2/addresses — list existing addresses
   * 2. Match by alias (exact) → pincode → first available
   * 3. If no match, POST /api/v2/address to create a new one
   * 4. The `alias` field is the identifier used when booking shipments
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

    let headers: Record<string, string>;
    try {
      headers = await this.authHeaders(config);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ekart registerWarehouse auth failed: ${msg}`);
      return {
        success: false,
        message: `Ekart authentication failed — cannot register address: ${msg}`,
      };
    }

    const phone = parseInt(options.phone.replace(/\D/g, '').slice(-10), 10);
    const pincode = parseInt(options.pincode, 10);
    const displayName = options.label || options.name;

    // 1. Check existing addresses — only match by exact alias
    const existing = await this.fetchExistingAddresses(headers);

    if (existing.length > 0) {
      const byAlias = existing.find(
        (a: any) =>
          (a.alias || '').toLowerCase() === displayName.toLowerCase() ||
          (a.alias || '').toLowerCase() === options.name.toLowerCase(),
      );
      if (byAlias?.alias) {
        this.logger.log(`Ekart: Found existing address by alias "${byAlias.alias}".`);
        return {
          success: true,
          registeredName: byAlias.alias,
          alreadyExisted: true,
          message: `Using existing Ekart address "${byAlias.alias}".`,
        };
      }
    }

    // 2. Create a new address via POST /api/v2/address
    const addressLine2Parts = [options.addressLine2, options.landmark].filter(Boolean);

    const createPayload = {
      alias: displayName,
      phone,
      address_line1: options.address,
      address_line2: addressLine2Parts.join(', ') || '',
      pincode,
      city: options.city,
      state: options.state,
      country: 'India',
    };

    try {
      const createRes = await fetch(`${this.BASE}/api/v2/address`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createPayload),
      });

      const resText = await createRes.text();
      let resData: any = {};
      try { resData = JSON.parse(resText); } catch { /* not JSON */ }

      if (createRes.ok && resData.status === true) {
        const createdAlias = resData.alias || options.name;
        this.logger.log(
          `Ekart: Created address "${createdAlias}". Remark: ${resData.remark || 'none'}`,
        );
        return {
          success: true,
          registeredName: createdAlias,
          message: `Address "${createdAlias}" registered with Ekart.`,
        };
      }

      this.logger.warn(
        `Ekart: POST /api/v2/address failed (${createRes.status}): ${resText.slice(0, 400)}`,
      );

      // If alias already exists, re-fetch and find by exact name only
      if (
        resText.toLowerCase().includes('already') ||
        resText.toLowerCase().includes('exists') ||
        resText.toLowerCase().includes('duplicate')
      ) {
        const refetched = await this.fetchExistingAddresses(headers);
        const match = refetched.find(
          (a: any) =>
            (a.alias || '').toLowerCase() === displayName.toLowerCase() ||
            (a.alias || '').toLowerCase() === options.name.toLowerCase(),
        );
        if (match?.alias) {
          return {
            success: true,
            registeredName: match.alias,
            alreadyExisted: true,
            message: `Using existing Ekart address "${match.alias}".`,
          };
        }
      }
    } catch (err) {
      this.logger.warn(`Ekart: Address creation threw: ${err}`);
    }

    return {
      success: false,
      message:
        'Could not create an address in Ekart. ' +
        'Check your Ekart Elite credentials and ensure the API is accessible.',
    };
  }
}
