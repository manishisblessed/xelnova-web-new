import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SellerCourierConfig } from '@prisma/client';
import {
  CourierProvider,
  ShipmentDetails,
  CreateShipmentResult,
  TrackingResult,
  CancelResult,
  ServiceabilityResult,
  SchedulePickupOptions,
  SchedulePickupResult,
} from './courier-provider.interface';

/**
 * Delhivery One / Express API integration.
 *
 * Auth: Static API Token (never expires). Header: `Authorization: Token <token>`
 * Docs: https://delhivery-express-api-doc.readme.io/reference
 *
 * Config mapping:
 *   apiKey       → API Token (from Delhivery One → Settings → API Setup)
 *   accountId    → Client Name (registered business name, case-sensitive)
 *   warehouseId  → Pickup Location Name (exact registered warehouse name)
 *   metadata.delhiveryEnvironment → production | staging (must match token environment)
 *   metadata.sellerGstin        → optional GSTIN for CMU `seller_gst_tin`
 *   metadata.delhiveryShippingMode → Surface | Express (default Surface)
 */
@Injectable()
export class DelhiveryProvider implements CourierProvider {
  readonly providerName = 'Delhivery';
  private readonly logger = new Logger(DelhiveryProvider.name);

  private readonly prodBase = 'https://track.delhivery.com';
  private readonly stagingBase = 'https://staging-express.delhivery.com';

  constructor(private readonly config: ConfigService) {}

  /**
   * Resolves API base URL: optional global override, then per-config metadata (platform/seller),
   * then DELHIVERY_ENV, then NODE_ENV (production → Live API host).
   */
  private getBaseUrl(config: SellerCourierConfig): string {
    const override = this.config.get<string>('DELHIVERY_API_BASE_URL')?.trim();
    if (override) return override;

    const meta = (config.metadata ?? {}) as {
      delhiveryEnvironment?: string;
    };

    if (meta.delhiveryEnvironment === 'staging') return this.stagingBase;
    if (meta.delhiveryEnvironment === 'production') return this.prodBase;

    const globalEnv = this.config.get<string>('DELHIVERY_ENV')?.trim().toLowerCase();
    if (globalEnv === 'staging') return this.stagingBase;

    return this.config.get('NODE_ENV') === 'production' ? this.prodBase : this.stagingBase;
  }

  private getDelhiveryShipmentExtras(config: SellerCourierConfig): {
    sellerGstin: string;
    shippingMode: string;
  } {
    const meta = (config.metadata ?? {}) as {
      sellerGstin?: string;
      delhiveryShippingMode?: string;
    };
    const gstin =
      (meta.sellerGstin && String(meta.sellerGstin).trim()) ||
      this.config.get<string>('DELHIVERY_SELLER_GSTIN')?.trim() ||
      '';
    const modeRaw =
      (meta.delhiveryShippingMode && String(meta.delhiveryShippingMode).trim()) ||
      this.config.get<string>('DELHIVERY_SHIPPING_MODE')?.trim() ||
      'Surface';
    const shippingMode = modeRaw.toLowerCase() === 'express' ? 'Express' : 'Surface';
    return { sellerGstin: gstin, shippingMode };
  }

  private authHeaders(config: SellerCourierConfig): Record<string, string> {
    return {
      Authorization: `Token ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Strip everything that isn't a digit and return the last 10 characters.
   * Delhivery's CMU validator rejects phone numbers that aren't exactly
   * 10 digits (e.g. `+91 92591 31155` or `09259131155`) with a generic
   * "internal Error" — far easier to debug if we always send the canonical
   * 10-digit form.
   */
  private normalizePhone(raw: string | undefined | null): string {
    const digits = String(raw ?? '').replace(/\D+/g, '');
    return digits.slice(-10);
  }

  /**
   * Delhivery expects `order_date` as `YYYY-MM-DD HH:mm:ss` in IST.
   * Sending an ISO-8601 string with a `Z` suffix occasionally trips
   * their parser and surfaces as the same generic "internal Error".
   */
  private formatOrderDate(now: Date = new Date()): string {
    const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    const ist = new Date(istMs);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ` +
      `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}`
    );
  }

  async createShipment(
    config: SellerCourierConfig,
    details: ShipmentDetails,
  ): Promise<CreateShipmentResult> {
    const base = this.getBaseUrl(config);
    const clientName = config.accountId || '';
    const pickupName = config.warehouseId;
    const { sellerGstin, shippingMode } = this.getDelhiveryShipmentExtras(config);

    if (!pickupName) {
      throw new Error(
        'Delhivery requires a Pickup Location Name. Please update your shipping settings with the exact warehouse name from your Delhivery dashboard (Settings → Warehouses).',
      );
    }

    if (!clientName) {
      throw new Error(
        'Delhivery requires a Client Name. Please update your shipping settings with your registered business name.',
      );
    }

    // Step 1: Pre-fetch a waybill (AWB). Delhivery's CMU create
    // endpoint *can* auto-assign a waybill in many accounts, but several
    // accounts (especially newly-onboarded ones) refuse the create call
    // without a pre-allocated waybill. We treat the pre-fetch as
    // best-effort and only fail loudly if both pre-fetch and CMU end up
    // returning no AWB (testing observation #30).
    let awb = '';
    try {
      const waybillRes = await fetch(
        `${base}/waybill/api/fetch/json/?cl=${encodeURIComponent(clientName)}&token=${config.apiKey}`,
        { headers: this.authHeaders(config) },
      );
      if (waybillRes.ok) {
        const waybillData = await waybillRes.text();
        let candidate = '';
        try {
          const parsed = JSON.parse(waybillData);
          // Delhivery's waybill fetch can return various shapes:
          //   - Plain string: "1234567890"
          //   - Object: {"waybill": "1234567890"}
          //   - Array: ["1234567890", ...]
          //   - Packages wrapper: {"packages": ["1234567890"]}
          // We also need to avoid treating small numbers (like counts /
          // quota values) as waybills, which is what caused a
          // "waybill: 4" to be rejected with "Unable to consume
          // waybill 4".
          if (typeof parsed === 'string') {
            candidate = parsed.trim();
          } else if (typeof parsed === 'number') {
            candidate = String(parsed);
          } else if (Array.isArray(parsed)) {
            candidate = String(parsed[0] || '').trim();
          } else if (parsed && typeof parsed === 'object') {
            const w = parsed.waybill;
            if (Array.isArray(w)) candidate = String(w[0] || '').trim();
            else if (typeof w === 'string') candidate = w.trim();
            else if (Array.isArray(parsed.packages)) candidate = String(parsed.packages[0] || '').trim();
          }
        } catch {
          candidate = waybillData.trim();
        }

        // A valid Delhivery waybill is typically 10-14 digits. Anything
        // shorter (like "4" or "0") is almost certainly a quota / count /
        // error code, not a real waybill — passing it to the CMU endpoint
        // will cause "Unable to consume waybill" rejections.
        if (/^\d{8,}$/.test(candidate)) {
          awb = candidate;
        } else if (candidate) {
          this.logger.warn(
            `Delhivery waybill pre-fetch returned an unusable value "${candidate}" (expected 8+ digit number). ` +
              `Will let CMU auto-assign. This usually means your account has no waybill block allocated yet — ` +
              `contact Delhivery support if CMU create also fails.`,
          );
        }
      } else {
        const errBody = await waybillRes.text().catch(() => '');
        this.logger.warn(
          `Delhivery waybill pre-fetch returned ${waybillRes.status}: ${errBody.slice(0, 200)}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Waybill pre-fetch failed, will let Delhivery auto-assign: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    // Step 2: Create the shipment
    const isCod = details.isCod ?? false;
    // Dimensions arrive as "LxBxH" (cm). Parse defensively and pass all
    // three values — the previous payload was missing `shipment_length`
    // entirely which caused Delhivery to silently fall back to defaults
    // that occasionally rejected the booking.
    const dims = (details.dimensions || '')
      .split(/[x×X]/i)
      .map((d) => d.trim())
      .filter(Boolean);
    const lengthCm = dims[0] || '10';
    const widthCm = dims[1] || '10';
    const heightCm = dims[2] || '10';

    const buyerPhone = this.normalizePhone(details.deliveryAddress.phone);
    const sellerPhone = this.normalizePhone(details.sellerAddress.phone);

    // Delhivery silently rejects shipments whose phone numbers aren't
    // exactly 10 digits. Surface the issue with an actionable message
    // instead of leaving the seller staring at "internal Error".
    if (buyerPhone.length !== 10) {
      throw new Error(
        `Buyer phone number must be a 10-digit Indian mobile number (got "${details.deliveryAddress.phone}"). Please ask the customer to update their delivery phone.`,
      );
    }
    if (sellerPhone.length !== 10) {
      throw new Error(
        `Pickup phone number must be a 10-digit Indian mobile number (got "${details.sellerAddress.phone}"). Please update your seller profile phone before booking a shipment.`,
      );
    }

    const shipment: Record<string, unknown> = {
      name: details.deliveryAddress.fullName,
      add: [
        details.deliveryAddress.addressLine1,
        details.deliveryAddress.addressLine2,
      ]
        .filter(Boolean)
        .join(', '),
      pin: details.deliveryAddress.pincode,
      city: details.deliveryAddress.city,
      state: details.deliveryAddress.state,
      country: 'India',
      phone: buyerPhone,
      order: details.orderNumber,
      payment_mode: isCod ? 'COD' : 'Pre-paid',
      return_pin: details.sellerAddress.pincode,
      return_city: details.sellerAddress.city,
      return_phone: sellerPhone,
      return_add: details.sellerAddress.address,
      return_state: details.sellerAddress.state,
      return_country: 'India',
      return_name: details.sellerAddress.name,
      products_desc:
        details.items.map((i) => i.name).join(', ').slice(0, 200) || 'Products',
      cod_amount: isCod ? String(details.totalAmount || 0) : '0',
      order_date: this.formatOrderDate(),
      total_amount: String(details.totalAmount || 0),
      seller_add: details.sellerAddress.address,
      seller_name: details.sellerAddress.name,
      seller_inv: details.orderNumber,
      quantity: String(
        details.items.reduce((sum, i) => sum + i.quantity, 0) || 1,
      ),
      shipment_length: lengthCm,
      shipment_width: widthCm,
      shipment_height: heightCm,
      weight: String(Math.round((details.weight || 0.5) * 1000)),
      shipping_mode: shippingMode,
      address_type: 'home',
    };

    // Only include optional/secret fields when actually present —
    // Delhivery's validators sometimes choke on empty-string keys.
    if (awb) shipment.waybill = awb;
    // Indian GSTIN is exactly 15 alphanumeric chars. If the admin
    // accidentally pasted an email or other junk into the GSTIN field,
    // skip the attribute rather than sending garbage to Delhivery
    // (which fails shipment validation with a generic "internal Error").
    if (sellerGstin && /^[0-9A-Z]{15}$/i.test(sellerGstin.trim())) {
      shipment.seller_gst_tin = sellerGstin.trim().toUpperCase();
    } else if (sellerGstin) {
      this.logger.warn(
        `Ignoring invalid GSTIN "${sellerGstin}" — expected 15 alphanumeric characters. ` +
          `Fix this in admin Shipping Settings → Delhivery → Seller GSTIN.`,
      );
    }

    const shipmentPayload = {
      shipments: [shipment],
      pickup_location: {
        name: pickupName,
      },
    };

    const formData = `format=json&data=${encodeURIComponent(JSON.stringify(shipmentPayload))}`;
    const createRes = await fetch(`${base}/api/cmu/create.json`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      this.logger.error(
        `Delhivery create shipment HTTP ${createRes.status}. Payload=${JSON.stringify(
          shipmentPayload,
        )}. Response=${errText.slice(0, 800)}`,
      );
      throw new Error(`Failed to create Delhivery shipment: ${errText}`);
    }

    const createData = await createRes.json();

    if (!createData.success) {
      // Always log the full Delhivery response + the (sanitized) payload
      // we sent so we can diagnose recurring rejections from server logs
      // without needing to reproduce the booking.
      this.logger.error(
        `Delhivery rejected shipment. Payload=${JSON.stringify(
          shipmentPayload,
        )}. Response=${JSON.stringify(createData).slice(0, 1500)}`,
      );

      const rawMsg =
        createData.rmk ||
        createData.packages?.[0]?.remarks?.[0] ||
        (Array.isArray(createData.packages?.[0]?.remarks)
          ? createData.packages[0].remarks.join('; ')
          : '') ||
        'Unknown error';
      let errMsg = String(rawMsg).trim();

      if (errMsg.includes('ClientWarehouse matching query does not exist')) {
        errMsg = `Invalid Pickup Location Name. Please check your Delhivery Settings → Warehouses and enter the exact warehouse name in your shipping settings.`;
      } else if (/internal\s*Error/i.test(errMsg)) {
        // Delhivery's catch-all rejection. Hand the seller something
        // they can actually act on rather than a dead-end "contact
        // client.support@delhivery.com" message.
        errMsg =
          `Delhivery couldn't process this shipment. The most common causes are: ` +
          `(1) Pickup Location Name in shipping settings doesn't match any warehouse registered in your Delhivery One dashboard, ` +
          `(2) the buyer or pickup phone isn't a valid 10-digit Indian mobile number, ` +
          `(3) the pickup or delivery pincode isn't serviceable on your Delhivery contract, or ` +
          `(4) your Delhivery account doesn't have a waybill block allocated yet. ` +
          `Please re-check your shipping settings and the customer's address, then try again.`;
      }

      throw new Error(`Delhivery rejected shipment: ${errMsg}`);
    }

    const pkg = createData.packages?.[0];
    const finalAwb = String(pkg?.waybill || awb || '').trim();

    if (!finalAwb) {
      // Per testing observation #30 — the most common silent failure for
      // Delhivery integrations is the API returning success=true but with
      // no waybill (typically when the client hasn't been allocated a
      // waybill block). Surface this as a real error instead of saving an
      // empty AWB into the shipment record.
      this.logger.error(
        `Delhivery returned no waybill. Response: ${JSON.stringify(createData).slice(0, 500)}`,
      );
      throw new Error(
        'Delhivery did not return a waybill. Please contact Delhivery support to ensure your account has a waybill block allocated, then try again.',
      );
    }

    return {
      awbNumber: finalAwb,
      courierOrderId: pkg?.refnum || details.orderNumber,
      trackingUrl: `https://www.delhivery.com/track/package/${finalAwb}`,
    };
  }

  async trackShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<TrackingResult> {
    const base = this.getBaseUrl(config);

    const res = await fetch(
      `${base}/api/v1/packages/json/?waybill=${encodeURIComponent(awbNumber)}&token=${config.apiKey}`,
      { headers: this.authHeaders(config) },
    );

    if (!res.ok) {
      throw new Error('Failed to track Delhivery shipment');
    }

    const data = await res.json();
    const shipment = data?.ShipmentData?.[0]?.Shipment;

    if (!shipment) {
      return { status: 'UNKNOWN', statusHistory: [] };
    }

    const scans = shipment.Scans || [];
    const statusHistory = scans.map((scan: any) => ({
      status: scan.ScanDetail?.Scan || '',
      timestamp: scan.ScanDetail?.ScanDateTime || '',
      location: scan.ScanDetail?.ScannedLocation || '',
      remark: scan.ScanDetail?.Instructions || '',
    }));

    return {
      status: this.mapDelhiveryStatus(shipment.Status?.Status || ''),
      statusHistory,
      currentLocation:
        shipment.Status?.StatusLocation || scans[0]?.ScanDetail?.ScannedLocation,
      estimatedDelivery: shipment.ExpectedDeliveryDate,
    };
  }

  async cancelShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<CancelResult> {
    const base = this.getBaseUrl(config);

    const res = await fetch(`${base}/api/p/edit`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        waybill: awbNumber,
        cancellation: 'true',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Cancel failed: ${errText}` };
    }

    return { success: true, message: 'Shipment cancelled successfully' };
  }

  async checkServiceability(
    _pickupPincode: string,
    deliveryPincode: string,
    config: SellerCourierConfig,
  ): Promise<ServiceabilityResult> {
    const base = this.getBaseUrl(config);

    const res = await fetch(
      `${base}/c/api/pin-codes/json/?token=${config.apiKey}&filter_codes=${deliveryPincode}`,
      { headers: this.authHeaders(config) },
    );

    if (!res.ok) {
      return { serviceable: false };
    }

    const data = await res.json();
    const deliveryInfo = data?.delivery_codes?.[0]?.postal_code;

    if (!deliveryInfo) {
      return { serviceable: false };
    }

    return {
      serviceable: true,
      estimatedDays: deliveryInfo.max_days || deliveryInfo.estimated_delivery_days || 5,
    };
  }

  /**
   * Ask Delhivery to send a rider to the registered warehouse on a given
   * date/time so the seller never has to log in to Delhivery One just to
   * book a pickup. Endpoint: `POST {base}/fm/request/new/`.
   *
   * Docs: https://delhivery-express-api-doc.readme.io/reference/pickup-request
   */
  async schedulePickup(
    config: SellerCourierConfig,
    options: SchedulePickupOptions,
  ): Promise<SchedulePickupResult> {
    const base = this.getBaseUrl(config);

    // Delhivery's pickup API accepts time as either HH:MM or HH:MM:SS.
    // Strip seconds for safety — some accounts validate strictly.
    let pickupTime = (options.pickupTime || '14:00:00').slice(0, 8);
    // Ensure HH:MM:SS form (some endpoints reject HH:MM only).
    if (/^\d{2}:\d{2}$/.test(pickupTime)) pickupTime += ':00';

    // Sanity-check the date — Delhivery rejects past dates and Sundays
    // for most pincodes, both with the same generic "internal Error".
    const requestedDate = new Date(`${options.pickupDate}T${pickupTime}+05:30`);
    if (Number.isNaN(requestedDate.getTime())) {
      return {
        success: false,
        message: `Invalid pickup date/time: ${options.pickupDate} ${pickupTime}. Use YYYY-MM-DD and HH:MM:SS.`,
      };
    }
    const todayIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    todayIst.setUTCHours(0, 0, 0, 0);
    const reqIst = new Date(requestedDate.getTime() + 5.5 * 60 * 60 * 1000);
    reqIst.setUTCHours(0, 0, 0, 0);
    if (reqIst < todayIst) {
      return {
        success: false,
        message: 'Pickup date is in the past. Please choose today or a future date.',
      };
    }

    const body: Record<string, unknown> = {
      pickup_location: options.pickupLocation || config.warehouseId || '',
      expected_package_count: Math.max(1, options.expectedPackageCount || 1),
      pickup_date: options.pickupDate,
      pickup_time: pickupTime,
    };

    // Delhivery's /fm/request/new/ accepts a `packages` array of waybill
    // strings. When present, the manifested orders matching those waybills
    // move from "Ready to Ship" → "Ready for Pickup" on Delhivery One,
    // which ensures the pickup agent's run-sheet includes the specific
    // shipments. Without this, the pickup request is warehouse-level and
    // orders sit in "Ready to Ship" even though a pickup slot exists.
    if (options.waybills?.length) {
      body.packages = options.waybills;
    }

    if (!body.pickup_location) {
      return {
        success: false,
        message:
          'Pickup location name missing. Please add your warehouse in shipping settings before scheduling a pickup.',
      };
    }

    this.logger.log(
      `Delhivery pickup request: ${JSON.stringify(body)} → POST ${base}/fm/request/new/`,
    );

    let res: Response;
    try {
      res = await fetch(`${base}/fm/request/new/`, {
        method: 'POST',
        headers: this.authHeaders(config),
        body: JSON.stringify(body),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Delhivery pickup request transport error: ${message}`);
      return { success: false, message: `Pickup request failed: ${message}` };
    }

    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    this.logger.log(
      `Delhivery pickup response: HTTP ${res.status} → ${text.slice(0, 500)}`,
    );

    if (!res.ok) {
      this.logger.warn(
        `Delhivery pickup request failed: ${res.status} ${text.slice(0, 300)}`,
      );
      const rawErr =
        parsed?.message ||
        parsed?.error ||
        parsed?.detail ||
        text.slice(0, 200) ||
        `HTTP ${res.status}`;
      return {
        success: false,
        message: this.humanizePickupError(String(rawErr)),
      };
    }

    // Delhivery returns 200 even for some errors. The hallmark of a
    // successful pickup request is a numeric `pickup_id` in the body.
    const pickupId =
      parsed?.pickup_id ??
      parsed?.PickupId ??
      parsed?.pr_id ??
      parsed?.id ??
      undefined;

    if (pickupId == null || pickupId === '' || pickupId === 0) {
      const rawMsg = parsed?.pr_log || parsed?.message || parsed?.error || text.slice(0, 200);
      this.logger.warn(
        `Delhivery pickup response missing pickup_id. Body: ${text.slice(0, 500)}`,
      );
      return {
        success: false,
        message: this.humanizePickupError(
          rawMsg || 'Delhivery accepted the request but did not return a pickup ID.',
        ),
      };
    }

    const scheduledFor = `${options.pickupDate}T${pickupTime}+05:30`;

    return {
      success: true,
      message: parsed?.pr_log || parsed?.message || 'Pickup scheduled successfully',
      pickupId: String(pickupId),
      scheduledFor,
    };
  }

  /**
   * Delhivery returns several stock messages that don't tell sellers
   * what to do. Translate the common ones into actionable instructions.
   */
  private humanizePickupError(rawMsg: string): string {
    const msg = rawMsg.toLowerCase();
    if (msg.includes('clientwarehouse') || msg.includes('warehouse not found') || msg.includes('invalid pickup_location')) {
      return `Delhivery doesn't recognise the warehouse name "${rawMsg.match(/['"]([^'"]+)['"]/)?.[1] || ''}". Please check Settings → Shipping → Delhivery → Warehouse Name matches your registered warehouse exactly (case-sensitive).`;
    }
    if (msg.includes('pickup time') || msg.includes('cut-off') || msg.includes('cutoff')) {
      return `Delhivery's pickup window has closed for that date/time. Please pick a later slot (next business day) — most regions have a ~5–6 PM cutoff for next-day pickup.`;
    }
    if (msg.includes('sunday') || msg.includes('holiday')) {
      return `Delhivery doesn't pick up on Sundays/holidays at this warehouse. Please choose a working day.`;
    }
    if (/internal\s*error/i.test(rawMsg)) {
      return `Delhivery couldn't process the pickup request. Common causes: (1) warehouse name mismatch, (2) Sunday/holiday, (3) past cutoff time, or (4) duplicate pickup request for the same date. Please verify and try again.`;
    }
    return rawMsg;
  }

  async downloadLabel(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<any> {
    const base = this.getBaseUrl(config);

    const res = await fetch(
      `${base}/api/p/packing_slip?wbns=${encodeURIComponent(awbNumber)}&token=${config.apiKey}`,
      { headers: this.authHeaders(config) },
    );

    if (!res.ok) {
      throw new Error('Failed to download Delhivery packing slip');
    }

    return res.json();
  }

  private mapDelhiveryStatus(status: string): string {
    const map: Record<string, string> = {
      Manifested: 'BOOKED',
      Dispatched: 'IN_TRANSIT',
      'In Transit': 'IN_TRANSIT',
      Pending: 'PENDING',
      'Reached Destination Hub': 'IN_TRANSIT',
      'Out For Delivery': 'OUT_FOR_DELIVERY',
      Delivered: 'DELIVERED',
      'Picked Up': 'PICKED_UP',
      'Not Picked': 'BOOKED',
      'RTO Initiated': 'RTO_INITIATED',
      'RTO In Transit': 'RTO_INITIATED',
      'RTO Delivered': 'RTO_DELIVERED',
      Returned: 'RTO_DELIVERED',
      Cancelled: 'CANCELLED',
      Undelivered: 'IN_TRANSIT',
    };
    return map[status] || 'IN_TRANSIT';
  }
}
