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
   * Official Ekart label PDF (same bytes as their portal / Print Label).
   * Response may be raw PDF, or JSON with a download URL / base64 payload.
   */
  async downloadLabelPdf(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<Buffer | null> {
    const headers = await this.authHeaders(config);

    const tryPdfBytes = (buf: Buffer): Buffer | null => {
      if (buf.length > 8 && buf.slice(0, 4).toString('ascii') === '%PDF') return buf;
      return null;
    };

    const fetchUrlAsPdf = async (url: string): Promise<Buffer | null> => {
      try {
        const r = await fetch(url, { redirect: 'follow' });
        if (!r.ok) return null;
        return tryPdfBytes(Buffer.from(await r.arrayBuffer()));
      } catch {
        return null;
      }
    };

    const res = await fetch(`${this.BASE}/api/v1/package/label`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: [awbNumber] }),
    });

    if (!res.ok) {
      const t = await res.text();
      this.logger.warn(`Ekart label API failed (${res.status}): ${t.slice(0, 180)}`);
      return null;
    }

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    const direct = tryPdfBytes(buf);
    if (direct) {
      this.logger.log(`Ekart label PDF for ${awbNumber}, ${direct.length} bytes.`);
      return direct;
    }

    if (ct.includes('application/json') || (buf.length > 0 && buf[0] === 0x7b)) {
      try {
        const j = JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
        const url =
          (j.label_url as string) ||
          (j.url as string) ||
          (j.pdf_url as string) ||
          (typeof j.data === 'object' && j.data !== null
            ? String((j.data as Record<string, unknown>).label_url ||
                (j.data as Record<string, unknown>).url ||
                '')
            : '');
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
          (typeof j.data === 'object' && j.data !== null
            ? String((j.data as Record<string, unknown>).pdf_base64 || '')
            : '');
        if (typeof b64 === 'string' && b64.length > 64) {
          const raw = Buffer.from(b64, 'base64');
          const pdf = tryPdfBytes(raw);
          if (pdf) {
            this.logger.log(`Ekart label from base64 for ${awbNumber}, ${pdf.length} bytes.`);
            return pdf;
          }
        }
      } catch {
        /* not JSON */
      }
    }

    this.logger.warn(`Ekart label response for ${awbNumber} was not a usable PDF.`);
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
   * Extract the location name/code from an Ekart location object.
   * Different API versions return the identifier under different keys.
   */
  private extractLocationName(loc: any): string {
    return (
      loc.location_code ||
      loc.locationCode ||
      loc.name ||
      loc.location_name ||
      loc.pickup_location ||
      loc.alias ||
      ''
    );
  }

  /**
   * Fetch all existing pickup locations from the Ekart account.
   * Tries multiple endpoints since the API has evolved across versions.
   */
  private async fetchExistingLocations(headers: Record<string, string>): Promise<any[]> {
    const locationEndpoints = [
      '/api/v1/pickup-addresses',
      '/api/v1/locations',
      '/api/v1/location',
      '/api/v1/pickup/list',
      '/integrations/v2/pickup-locations',
    ];

    for (const endpoint of locationEndpoints) {
      try {
        const listRes = await fetch(`${this.BASE}${endpoint}`, { headers });

        if (listRes.ok) {
          const listData = await listRes.json();
          const locations = Array.isArray(listData?.data)
            ? listData.data
            : Array.isArray(listData?.locations)
              ? listData.locations
              : Array.isArray(listData?.pickup_addresses)
                ? listData.pickup_addresses
                : Array.isArray(listData)
                  ? listData
                  : [];

          if (locations.length > 0) {
            this.logger.log(`Ekart: Found ${locations.length} pickup location(s) via ${endpoint}.`);
            return locations;
          }
        }
      } catch (err) {
        this.logger.debug(`Ekart: Endpoint ${endpoint} failed: ${err}`);
      }
    }
    return [];
  }

  /**
   * Ekart requires pickup locations to be pre-registered in their system.
   * This method:
   * 1. Fetches existing pickup locations from the Ekart account
   * 2. Finds the best match by pincode → address → first available
   * 3. Returns the Ekart-side location code (not our internal name)
   * 4. If no locations exist, attempts to create one
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
      this.logger.error(`Ekart registerWarehouse auth check failed: ${msg}`);
      return {
        success: false,
        message: `Ekart authentication failed — cannot register warehouse: ${msg}`,
      };
    }

    const existingLocations = await this.fetchExistingLocations(headers);

    if (existingLocations.length > 0) {
      const matchByPincode = existingLocations.find(
        (loc: any) => String(loc.pincode || loc.pin || loc.postal_code) === options.pincode,
      );

      const optAddr = (options.address || '').toLowerCase().trim();
      const matchByAddress = !matchByPincode
        ? existingLocations.find((loc: any) => {
            const locAddr = (loc.address || loc.full_address || '').toLowerCase().trim();
            return locAddr && optAddr && (locAddr.includes(optAddr) || optAddr.includes(locAddr));
          })
        : null;

      const bestMatch = matchByPincode || matchByAddress || existingLocations[0];
      const locationName = this.extractLocationName(bestMatch);

      if (!locationName) {
        this.logger.warn(
          `Ekart: Found ${existingLocations.length} location(s) but none had a usable name/code. Raw keys: ${Object.keys(bestMatch).join(', ')}`,
        );
        return {
          success: false,
          message:
            'Ekart returned pickup locations but none had a recognizable location code. ' +
            'Please check your Ekart Elite portal → Address menu and ensure at least one pickup location is active.',
        };
      }

      this.logger.log(
        `Ekart: Using existing location "${locationName}" (pincode match: ${!!matchByPincode}, address match: ${!!matchByAddress}).`,
      );

      return {
        success: true,
        registeredName: locationName,
        alreadyExisted: true,
        message: `Using existing Ekart pickup location "${locationName}".`,
      };
    }

    // No existing locations found — try to create one
    const locationPayload = {
      name: options.name,
      address: options.address,
      city: options.city,
      state: options.state,
      country: options.country || 'India',
      pincode: options.pincode,
      phone: options.phone.replace(/\D/g, '').slice(-10),
      email: options.email || '',
      contact_person: options.contactPerson || options.name,
    };

    try {
      const createRes = await fetch(`${this.BASE}/api/v1/locations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(locationPayload),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        const createdName =
          createData?.location_code ||
          createData?.locationCode ||
          createData?.data?.location_code ||
          createData?.name ||
          createData?.data?.name ||
          options.name;

        this.logger.log(`Ekart: Successfully created pickup location "${createdName}".`);

        return {
          success: true,
          registeredName: createdName,
          message: `Pickup location "${createdName}" registered with Ekart.`,
        };
      }

      const errText = await createRes.text();
      this.logger.warn(`Ekart location creation failed (${createRes.status}): ${errText.slice(0, 300)}`);

      if (errText.toLowerCase().includes('already') || errText.toLowerCase().includes('exists')) {
        // Location exists but we couldn't list it — re-fetch to get the real name
        const refetchedLocations = await this.fetchExistingLocations(headers);
        if (refetchedLocations.length > 0) {
          const best = refetchedLocations.find(
            (loc: any) => String(loc.pincode || loc.pin || loc.postal_code) === options.pincode,
          ) || refetchedLocations[0];
          const name = this.extractLocationName(best);
          if (name) {
            return {
              success: true,
              registeredName: name,
              alreadyExisted: true,
              message: `Using existing Ekart pickup location "${name}".`,
            };
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Ekart: Location creation threw: ${err}`);
    }

    // Hard fail — don't return our internal warehouse ID as a fallback
    // since Ekart will always reject names it doesn't recognize.
    return {
      success: false,
      message:
        'Could not find or create a pickup location in Ekart. ' +
        'Please register a pickup address in your Ekart Elite portal → Address menu in Settings, ' +
        'then try shipping again.',
    };
  }
}
