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

interface XBTokenCache {
  token: string;
  expiresAt: number;
}

/**
 * XpressBees Ecom integration.
 *
 * Two auth modes:
 *   NEW (token-based): Login with email/password → Bearer token (24h)
 *       Base: https://shipment.xpressbees.com/api
 *   OLD (static key): Pass XBKey header with each request
 *       Custom URLs provided by XB relationship manager
 *
 * Config mapping:
 *   apiKey       → XB Key / Secret Key (static key for OLD auth)
 *   apiSecret    → Password (for NEW token auth)
 *   accountId    → Email / Enterprise ID (for NEW token auth login)
 *   warehouseId  → Pickup Warehouse Name
 *   metadata     → { authType: "NEW"|"OLD", businessName: string }
 */
@Injectable()
export class XpressBeesProvider implements CourierProvider {
  readonly providerName = 'XpressBees';
  private readonly logger = new Logger(XpressBeesProvider.name);
  private readonly baseUrl = 'https://shipment.xpressbees.com/api';
  private tokenCache = new Map<string, XBTokenCache>();

  private isNewAuth(config: SellerCourierConfig): boolean {
    return !!(config.accountId && config.apiSecret);
  }

  private async getAuthToken(config: SellerCourierConfig): Promise<string> {
    const cacheKey = config.id;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    const res = await fetch(`${this.baseUrl}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.accountId,
        password: config.apiSecret,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`XpressBees login failed: ${res.status} ${errText}`);
      throw new Error(`XpressBees authentication failed: ${errText}`);
    }

    const data = await res.json();
    const token = data.data || data.token || '';

    if (!token) {
      throw new Error('XpressBees login returned no token');
    }

    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    });

    return token;
  }

  private async authHeaders(config: SellerCourierConfig): Promise<Record<string, string>> {
    if (this.isNewAuth(config)) {
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
    const headers = await this.authHeaders(config);
    const isCod = details.isCod ?? false;
    const dims = details.dimensions?.split('x') || [];

    const payload = {
      order_number: details.orderNumber,
      shipping_charges: 0,
      discount: 0,
      cod_charges: 0,
      payment_type: isCod ? 'COD' : 'prepaid',
      order_amount: details.totalAmount || 0,
      package_weight: String(Math.round((details.weight || 0.5) * 1000)),
      package_length: dims[0] || '10',
      package_breadth: dims[1] || '10',
      package_height: dims[2] || '10',
      request_auto_pickup: 'yes',
      ...(isCod && { collectable_amount: details.totalAmount || 0 }),
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

    const res = await fetch(`${this.baseUrl}/shipments2`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`XpressBees create shipment failed: ${res.status} ${errText}`);
      throw new Error(`Failed to create XpressBees shipment: ${errText}`);
    }

    const data = await res.json();

    if (data.status === 0 || data.error) {
      throw new Error(`XpressBees rejected: ${data.message || data.error || 'Unknown error'}`);
    }

    const awbWrapper = data.data || data;
    const awb = awbWrapper?.awb_number || data.awb_number || '';

    const labelRaw =
      awbWrapper?.label_url ||
      awbWrapper?.labelUrl ||
      awbWrapper?.shipping_label_url ||
      data.label_url ||
      '';

    return {
      awbNumber: String(awb),
      courierOrderId: awbWrapper?.order_id?.toString() || '',
      trackingUrl: `https://shipment.xpressbees.com/tracking?awb=${awb}`,
      labelUrl:
        typeof labelRaw === 'string' && /^https?:\/\//i.test(labelRaw.trim())
          ? labelRaw.trim()
          : undefined,
    };
  }

  async trackShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<TrackingResult> {
    const headers = await this.authHeaders(config);

    const res = await fetch(`${this.baseUrl}/shipments2/track/${encodeURIComponent(awbNumber)}`, {
      headers,
    });

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
      status: this.mapXBStatus(tracking.OrderStatus || ''),
      statusHistory,
      currentLocation: scans[0]?.Location,
      estimatedDelivery: tracking.ExpectedDeliveryDate || undefined,
    };
  }

  async cancelShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<CancelResult> {
    const headers = await this.authHeaders(config);

    const res = await fetch(`${this.baseUrl}/shipments2/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ awb: awbNumber }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Cancel failed: ${errText}` };
    }

    const data = await res.json();
    if (data.status === 0) {
      return { success: false, message: data.message || 'Cancel failed' };
    }

    return { success: true, message: 'Shipment cancelled successfully' };
  }

  async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
    config: SellerCourierConfig,
  ): Promise<ServiceabilityResult> {
    const headers = await this.authHeaders(config);

    // Try the rate calculator first since it returns both serviceability AND real charges.
    try {
      const rateRes = await fetch(`${this.baseUrl}/courier/serviceability`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          origin: pickupPincode,
          destination: deliveryPincode,
          payment_type: 'prepaid',
          order_amount: '1000',
          weight: '500',
          length: '10',
          breadth: '10',
          height: '10',
        }),
      });

      if (rateRes.ok) {
        const rateData = await rateRes.json();
        const services = Array.isArray(rateData?.data) ? rateData.data : [];
        if (rateData?.status === true && services.length > 0) {
          // Pick cheapest "surface" ≤ 500g service as the baseline offer.
          const baseline = services
            .filter((s: any) => s.min_weight <= 500)
            .sort((a: any, b: any) => (a.total_charges ?? 0) - (b.total_charges ?? 0))[0]
            || services[0];
          return {
            serviceable: true,
            estimatedDays: 4,
            charges: baseline.total_charges ?? baseline.freight_charges ?? undefined,
          };
        }
      }
    } catch (err) {
      this.logger.warn(`XpressBees rate calc failed: ${err}`);
    }

    // Fallback to simple pincode serviceability (no pricing).
    const res = await fetch(
      `${this.baseUrl}/pincode/serviceability?pickup_pincode=${pickupPincode}&delivery_pincode=${deliveryPincode}`,
      { headers },
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

  /** Recursively find HTTPS strings that look like label/PDF links. */
  private collectLabelPdfUrls(root: unknown, out: Set<string>, depth = 0): void {
    if (depth > 14 || root == null) return;
    if (typeof root === 'string') {
      const s = root.trim();
      if (
        /^https?:\/\//i.test(s) &&
        (/\blabel\b/i.test(s) || /\.pdf(\?|$)/i.test(s) || /shipping/i.test(s) || /waybill/i.test(s))
      ) {
        out.add(s);
      }
      return;
    }
    if (Array.isArray(root)) {
      root.forEach((x) => this.collectLabelPdfUrls(x, out, depth + 1));
      return;
    }
    if (typeof root === 'object') {
      for (const v of Object.values(root as Record<string, unknown>)) {
        this.collectLabelPdfUrls(v, out, depth + 1);
      }
    }
  }

  private async fetchPdfWithAuth(
    urlOrPath: string,
    headers: Record<string, string>,
    init?: RequestInit,
  ): Promise<Buffer | null> {
    try {
      const target = /^https?:\/\//i.test(urlOrPath)
        ? urlOrPath
        : `${this.baseUrl}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
      const r = await fetch(target, {
        ...init,
        headers: {
          ...headers,
          Accept: 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8',
          ...(init?.headers as Record<string, string>),
        },
      });
      if (!r.ok) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 8 && buf.slice(0, 4).toString('ascii') === '%PDF') return buf;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Official XpressBees label PDF when their API exposes one (path varies by
   * account). `getCarrierIssuedLabel` already tries `Shipment.labelUrl`
   * from booking; this covers track-payload links + common REST paths.
   */
  async downloadLabelPdf(awbNumber: string, config: SellerCourierConfig): Promise<Buffer | null> {
    const headers = await this.authHeaders(config);
    const fromTrack = new Set<string>();

    try {
      const res = await fetch(
        `${this.baseUrl}/shipments2/track/${encodeURIComponent(awbNumber)}`,
        { headers },
      );
      if (res.ok) {
        const data = await res.json();
        this.collectLabelPdfUrls(data, fromTrack);
      }
    } catch {
      /* ignore */
    }

    const getPaths = [
      `/shipments2/shipping_label/${encodeURIComponent(awbNumber)}`,
      `/shipments2/label/${encodeURIComponent(awbNumber)}`,
      `/shipments2/printlabel/${encodeURIComponent(awbNumber)}`,
      `/shipments2/print_label/${encodeURIComponent(awbNumber)}`,
      `/shipments2/downloadlabel/${encodeURIComponent(awbNumber)}`,
      `/shipments2/labels/${encodeURIComponent(awbNumber)}`,
    ];

    for (const p of getPaths) {
      const pdf = await this.fetchPdfWithAuth(p, headers);
      if (pdf) {
        this.logger.log(`XpressBees label PDF via GET ${p}, ${pdf.length} bytes.`);
        return pdf;
      }
    }

    const postPaths = ['/shipments2/label', '/shipments2/shipping_label', '/shipments2/print'];
    const postBodies = [{ awb_number: awbNumber }, { awb: awbNumber }, { awbs: [awbNumber] }];

    for (const path of postPaths) {
      for (const body of postBodies) {
        try {
          const r = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!r.ok) continue;
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length > 8 && buf.slice(0, 4).toString('ascii') === '%PDF') {
            this.logger.log(`XpressBees label PDF via POST ${path}, ${buf.length} bytes.`);
            return buf;
          }
          if (buf.length > 0 && buf[0] === 0x7b) {
            try {
              const j = JSON.parse(buf.toString('utf8'));
              const nested = new Set<string>();
              this.collectLabelPdfUrls(j, nested);
              for (const u of nested) {
                const pdf = await this.fetchPdfWithAuth(u, headers);
                if (pdf) {
                  this.logger.log(`XpressBees label PDF via nested URL, ${pdf.length} bytes.`);
                  return pdf;
                }
              }
            } catch {
              /* not JSON */
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    for (const u of fromTrack) {
      const pdf = await this.fetchPdfWithAuth(u, headers);
      if (pdf) {
        this.logger.log(`XpressBees label PDF from track payload, ${pdf.length} bytes.`);
        return pdf;
      }
    }

    return null;
  }

  private mapXBStatus(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('delivered') && !s.includes('out for')) return 'DELIVERED';
    if (s.includes('out for delivery')) return 'OUT_FOR_DELIVERY';
    if (s.includes('in transit') || s.includes('intransit')) return 'IN_TRANSIT';
    if (s.includes('picked') || s.includes('pickup done')) return 'PICKED_UP';
    if (s.includes('pickup scheduled')) return 'PICKUP_SCHEDULED';
    if (s.includes('manifested') || s.includes('booked')) return 'BOOKED';
    if (s.includes('rto delivered')) return 'RTO_DELIVERED';
    if (s.includes('rto')) return 'RTO_INITIATED';
    if (s.includes('cancel')) return 'CANCELLED';
    return 'IN_TRANSIT';
  }

  /**
   * XpressBees does not have a dedicated warehouse registration API.
   * The pickup warehouse_name + address are passed inline with each
   * shipment. This method validates credentials and stores the warehouse
   * name so the platform can track registration status consistently
   * across all couriers.
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

    try {
      await this.authHeaders(config);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`XpressBees registerWarehouse auth check failed: ${msg}`);
      return {
        success: false,
        message: `XpressBees authentication failed — cannot register warehouse: ${msg}`,
      };
    }

    this.logger.log(
      `XpressBees warehouse "${options.name}" validated (no external API — name stored for shipment payloads).`,
    );

    return {
      success: true,
      registeredName: options.name,
      message: `Warehouse "${options.name}" registered with XpressBees (address will be sent with each shipment).`,
    };
  }
}
