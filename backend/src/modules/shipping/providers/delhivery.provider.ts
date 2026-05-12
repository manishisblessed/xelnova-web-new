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
  RegisterWarehouseOptions,
  RegisterWarehouseResult,
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
    if (globalEnv === 'production') return this.prodBase;

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
   * Validates the seller API token with a trivial pin-code lookup.
   * Used when saving courier config so disconnected / invalid setups surface immediately.
   */
  async validateSellerApiToken(config: SellerCourierConfig): Promise<void> {
    const token = String(config.apiKey ?? '').trim();
    if (!token) {
      throw new Error('API token is required');
    }
    const base = this.getBaseUrl(config);
    let res: Response;
    try {
      res = await fetch(
        `${base}/c/api/pin-codes/json/?token=${encodeURIComponent(token)}&filter_codes=110001`,
        { headers: this.authHeaders({ ...config, apiKey: token }) },
      );
    } catch (e: any) {
      this.logger.warn(`Delhivery token validation network error: ${e?.message}`);
      throw new Error(
        `Could not reach Delhivery (${e?.message || 'network error'}). Check environment or try again.`,
      );
    }
    const bodyText = await res.text();
    if (!res.ok) {
      this.logger.warn(`Delhivery token check HTTP ${res.status}: ${bodyText.slice(0, 480)}`);
      throw new Error(
        bodyText.includes('Unauthorized') || res.status === 401
          ? 'Invalid Delhivery API token or wrong environment (staging vs production).'
          : `Delhivery returned HTTP ${res.status}.`,
      );
    }
    let data: unknown;
    try {
      data = JSON.parse(bodyText);
    } catch {
      this.logger.warn(`Delhivery token check: non-JSON body ${bodyText.slice(0, 200)}`);
      throw new Error('Unexpected response from Delhivery during token check.');
    }
    const err =
      typeof (data as { error?: string })?.error === 'string'
        ? (data as { error: string }).error
        : typeof (data as { message?: string })?.message === 'string'
          ? (data as { message: string }).message
          : '';
    if (err && /invalid|unauthor|expired|wrong token|token/i.test(err)) {
      this.logger.warn(`Delhivery token rejected: ${err}`);
      throw new Error(err);
    }
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

    let res: Response;
    try {
      res = await fetch(`${base}/api/p/edit`, {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Delhivery cancel network error for ${awbNumber}: ${msg}`);
      return { success: false, message: `Delhivery cancel failed (network): ${msg}` };
    }

    const text = await res.text();

    if (!res.ok) {
      this.logger.warn(`Delhivery cancel HTTP ${res.status} for ${awbNumber}: ${text.slice(0, 300)}`);
      return { success: false, message: `Delhivery cancel failed (HTTP ${res.status}): ${text.slice(0, 200)}` };
    }

    // Delhivery returns XML: <root><status>True|False</status><remark>...</remark></root>
    const statusMatch = text.match(/<status>(.*?)<\/status>/i);
    const remarkMatch = text.match(/<remark>(.*?)<\/remark>/i);
    const status = statusMatch?.[1]?.trim().toLowerCase();
    const remark = remarkMatch?.[1]?.trim() || '';

    if (status === 'true') {
      this.logger.log(`Delhivery cancel success for ${awbNumber}: ${remark}`);
      return { success: true, message: remark || 'Shipment cancelled successfully' };
    }

    // Also handle JSON responses (some accounts)
    try {
      const json = JSON.parse(text);
      if (json.status === true || json.status === 'true' || json.rmk?.toLowerCase().includes('cancel')) {
        this.logger.log(`Delhivery cancel success (JSON) for ${awbNumber}`);
        return { success: true, message: json.rmk || json.remark || 'Shipment cancelled' };
      }
      const errMsg = json.rmk || json.remark || json.error || JSON.stringify(json).slice(0, 200);
      this.logger.warn(`Delhivery cancel rejected for ${awbNumber}: ${errMsg}`);
      return { success: false, message: `Delhivery rejected cancellation: ${errMsg}` };
    } catch {
      /* not JSON, check XML status */
    }

    if (status === 'false' || (statusMatch && status !== 'true')) {
      this.logger.warn(`Delhivery cancel failed for ${awbNumber}: ${remark || text.slice(0, 200)}`);
      return { success: false, message: `Delhivery rejected cancellation: ${remark || 'Unknown reason'}` };
    }

    // If we can't parse the response, log it and assume failure for safety
    this.logger.warn(`Delhivery cancel unrecognized response for ${awbNumber}: ${text.slice(0, 300)}`);
    return { success: false, message: `Delhivery cancel response unclear — please verify on Delhivery portal. Response: ${text.slice(0, 100)}` };
  }

  async checkServiceability(
    pickupPincode: string,
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

    const estimatedDays = deliveryInfo.max_days || deliveryInfo.estimated_delivery_days || 3;

    // Fetch actual shipping charges for a baseline 500g parcel so the UI
    // can show a real cost instead of "Price at booking".
    let charges: number | undefined;
    try {
      const shippingMode = this.getDelhiveryShipmentExtras(config).shippingMode;
      const md = shippingMode?.toLowerCase() === 'express' ? 'E' : 'S';
      const params = new URLSearchParams({
        md,
        ss: 'Delivered',
        d_pin: deliveryPincode,
        o_pin: pickupPincode,
        cgm: '500',
        pt: 'Pre-paid',
        cod: '0',
      });
      const rateRes = await fetch(
        `${base}/api/kinko/v1/invoice/charges/.json?${params}`,
        { headers: this.authHeaders(config) },
      );
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        const payload = Array.isArray(rateData) ? rateData[0] : rateData;
        const total = typeof payload?.total_amount === 'number'
          ? payload.total_amount
          : typeof payload?.gross_amount === 'number'
            ? payload.gross_amount
            : undefined;
        if (typeof total === 'number' && total > 0) {
          charges = Math.round(total * 100) / 100;
        }
      }
    } catch (err) {
      this.logger.warn(`Delhivery rate calc failed: ${err}`);
    }

    return {
      serviceable: true,
      estimatedDays,
      charges,
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

    // Delhivery's official B2C "Pickup Request Creation" API
    // (POST /fm/request/new/) accepts ONLY four parameters per their
    // documentation (Apr 2026): pickup_location, expected_package_count,
    // pickup_date, pickup_time. There is intentionally no per-package /
    // per-waybill field — pickups are scheduled at the warehouse level
    // and the agent collects every manifested shipment from that
    // warehouse on the slot.
    //
    // To get manifested orders to flip from "Ready to Ship" →
    // "Ready For Pickup" on Delhivery One automatically, the seller's
    // Delhivery account POC must enable the optional **auto-pickup**
    // feature (also documented on the same page). Until that is on,
    // each shipment shows up under "Ready to Ship" and the warehouse
    // operator must use Delhivery One's "Add to Pickup" button — which
    // is *not* exposed via any public API. We therefore stop sending
    // the `packages` array (it was being silently ignored anyway) and
    // surface a clearer success message below.
    const body: Record<string, unknown> = {
      pickup_location: options.pickupLocation || config.warehouseId || '',
      expected_package_count: Math.max(1, options.expectedPackageCount || 1),
      pickup_date: options.pickupDate,
      pickup_time: pickupTime,
    };

    if (!body.pickup_location) {
      return {
        success: false,
        message:
          'Pickup location name missing. Please add your warehouse in shipping settings before scheduling a pickup.',
      };
    }

    const doPickupRequest = async (): Promise<{
      res: Response;
      text: string;
      parsed: any;
    }> => {
      this.logger.log(
        `Delhivery pickup request: ${JSON.stringify(body)} → POST ${base}/fm/request/new/`,
      );
      const r = await fetch(`${base}/fm/request/new/`, {
        method: 'POST',
        headers: this.authHeaders(config),
        body: JSON.stringify(body),
      });
      const t = await r.text();
      let p: any = null;
      try { p = t ? JSON.parse(t) : null; } catch { /* noop */ }
      this.logger.log(
        `Delhivery pickup response: HTTP ${r.status} → ${t.slice(0, 500)}`,
      );
      return { res: r, text: t, parsed: p };
    };

    let res: Response;
    let text: string;
    let parsed: any;

    try {
      ({ res, text, parsed } = await doPickupRequest());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Delhivery pickup request transport error: ${message}`);
      return { success: false, message: `Pickup request failed: ${message}` };
    }

    // Delhivery returns `pr_exist: true` with error code 669 when a
    // pickup request already exists for this warehouse + date. The
    // existing pickup_id is still valid — the agent WILL come. Treat
    // this as success rather than blocking the seller.
    if (parsed?.pr_exist === true && parsed?.pickup_id) {
      const existingId = parsed.pickup_id;
      this.logger.log(
        `Delhivery: pickup ${existingId} already exists for this warehouse + date. Treating as success.`,
      );
      const scheduledFor = `${options.pickupDate}T${pickupTime}+05:30`;
      return {
        success: true,
        message:
          `Pickup already scheduled for this warehouse on ${options.pickupDate} (ref ${existingId}). ` +
          `The Delhivery agent will collect every manifested package on this slot — your new shipment is included automatically.`,
        pickupId: String(existingId),
        scheduledFor,
      };
    }

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

    const pickupId =
      parsed?.pickup_id ??
      parsed?.PickupId ??
      parsed?.pr_id ??
      parsed?.id ??
      undefined;

    // Delhivery can return HTTP 200/201 with success=false for genuine
    // rejections (wrong warehouse name, cutoff, etc.). But ONLY treat
    // it as failure if there's no pickup_id — some responses include
    // both success=false and a valid pickup_id (e.g. code 669).
    if (parsed?.success === false && (pickupId == null || pickupId === '' || pickupId === 0)) {
      const rawMsg =
        parsed?.data?.message ||
        parsed?.error?.message ||
        parsed?.pr_log ||
        parsed?.message ||
        text.slice(0, 200);
      this.logger.warn(
        `Delhivery pickup explicitly failed: ${text.slice(0, 500)}`,
      );
      return {
        success: false,
        message: this.humanizePickupError(
          rawMsg || 'Delhivery rejected the pickup request.',
        ),
      };
    }

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
      message:
        parsed?.pr_log ||
        parsed?.message ||
        `Pickup scheduled for ${options.pickupDate} at ${pickupTime} (ref ${pickupId}). The Delhivery agent will collect every manifested package from this warehouse on this slot.`,
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

  /**
   * Fetch the OFFICIAL Delhivery shipping label as a PDF buffer.
   *
   * Per the Delhivery Generate Shipping Label API:
   *   GET /api/p/packing_slip?wbns={awb}&pdf=true
   *   → JSON with `packages[*].pdf_download_link` (presigned S3 URL)
   *
   * We download the S3 URL to get the exact same PDF the seller would
   * get from the Delhivery One panel — barcodes, layout, everything
   * identical so the rider scans correctly at pickup.
   */
  async downloadLabel(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<Buffer> {
    const resolvedBase = this.getBaseUrl(config);
    const token = config.apiKey;

    const isPdf = (buf: Buffer): boolean => {
      if (buf.length < 8) return false;
      const start = buf.indexOf(0x25);
      if (start >= 0 && start <= 4) {
        return buf.slice(start, start + 4).toString('ascii') === '%PDF';
      }
      return false;
    };

    const fetchPdfFromUrl = async (
      url: string,
      hdrs?: Record<string, string>,
    ): Promise<Buffer | null> => {
      try {
        const r = await fetch(url, {
          headers: hdrs || {},
          redirect: 'follow',
        });
        if (!r.ok) {
          this.logger.debug(
            `Delhivery label fetch ${r.status}: ${url.replace(token, '***').slice(0, 120)}`,
          );
          return null;
        }
        const buf = Buffer.from(await r.arrayBuffer());
        if (isPdf(buf)) return buf;
        if (
          (r.headers.get('content-type') || '').includes('application/octet-stream') &&
          buf.length > 128 &&
          buf[0] !== 0x7b
        ) {
          return buf;
        }
        return null;
      } catch (e) {
        this.logger.debug(
          `Delhivery fetch error: ${e instanceof Error ? e.message : String(e)}`,
        );
        return null;
      }
    };

    const wbns = encodeURIComponent(awbNumber);
    const authHdr: Record<string, string> = {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    };

    // Try both the resolved base and an explicit production fallback
    // (handles dev environments where NODE_ENV isn't production but the
    // waybill was created on the production Delhivery account).
    const bases = [resolvedBase];
    if (resolvedBase !== this.prodBase) bases.push(this.prodBase);

    for (const base of bases) {
      // ── Strategy 1: pdf=true → JSON with S3 download link ──
      const labelUrl = `${base}/api/p/packing_slip?wbns=${wbns}&pdf=true`;
      try {
        const r = await fetch(labelUrl, { headers: authHdr, redirect: 'follow' });
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());

          if (isPdf(buf)) {
            this.logger.log(
              `Delhivery label (direct PDF) for ${awbNumber}, ${buf.length}B.`,
            );
            return buf;
          }

          const text = buf.toString('utf8');
          let parsed: any = null;
          try { parsed = JSON.parse(text); } catch { /* not JSON */ }

          if (parsed) {
            this.logger.debug(
              `Delhivery packing_slip JSON: packages_found=${parsed.packages_found}, keys=${JSON.stringify(Object.keys(parsed))}`,
            );

            // Primary: packages[*].pdf_download_link (documented field)
            const packages = Array.isArray(parsed.packages) ? parsed.packages : [];
            for (const pkg of packages) {
              const link =
                pkg.pdf_download_link ||
                pkg.pdfDownloadLink ||
                pkg.pdf_link ||
                pkg.label_url ||
                '';
              if (link && /^https?:\/\//i.test(link)) {
                const pdf = await fetchPdfFromUrl(link);
                if (pdf) {
                  this.logger.log(
                    `Delhivery label via S3 link for ${awbNumber}, ${pdf.length}B.`,
                  );
                  return pdf;
                }
              }
            }

            // Fallback: top-level link fields
            const topLink =
              parsed.pdf_download_link ||
              parsed.pdf_link ||
              parsed.label_url ||
              (parsed.data && typeof parsed.data === 'object'
                ? parsed.data.url || parsed.data.pdf_download_link || ''
                : '');
            if (topLink && /^https?:\/\//i.test(topLink)) {
              const pdf = await fetchPdfFromUrl(topLink);
              if (pdf) {
                this.logger.log(
                  `Delhivery label via top-level link for ${awbNumber}, ${pdf.length}B.`,
                );
                return pdf;
              }
            }

            // Fallback: base64-encoded PDF
            const b64 =
              parsed.pdf_base64 ||
              parsed.label_base64 ||
              parsed.data?.pdf_base64 ||
              '';
            if (typeof b64 === 'string' && b64.length > 100) {
              const decoded = Buffer.from(b64, 'base64');
              if (isPdf(decoded)) {
                this.logger.log(
                  `Delhivery label (base64) for ${awbNumber}, ${decoded.length}B.`,
                );
                return decoded;
              }
            }

            if (parsed.packages_found === 0) {
              this.logger.debug(
                `Delhivery packing_slip returned packages_found=0 on ${base} for AWB ${awbNumber} — trying next base.`,
              );
              continue;
            }

            this.logger.warn(
              `Delhivery packing_slip JSON for ${awbNumber} — no usable PDF link. Body: ${text.slice(0, 500)}`,
            );
          }
        } else {
          this.logger.debug(
            `Delhivery packing_slip ${r.status} on ${base} for AWB ${awbNumber}.`,
          );
        }
      } catch (e) {
        this.logger.debug(
          `Delhivery packing_slip fetch error: ${e instanceof Error ? e.message : String(e)}`,
        );
      }

      // ── Strategy 2: Alternate label endpoints ──
      const altPaths = [
        `${base}/api/p/download_packing_slip?wbns=${wbns}`,
        `${base}/api/p/label?wbns=${wbns}`,
      ];
      for (const url of altPaths) {
        const pdf = await fetchPdfFromUrl(url, authHdr);
        if (pdf) {
          this.logger.log(
            `Delhivery label (alt endpoint) for ${awbNumber}, ${pdf.length}B.`,
          );
          return pdf;
        }
      }
    }

    this.logger.error(
      `Delhivery label fetch FAILED for AWB ${awbNumber}. Tried bases: ${bases.join(', ')}`,
    );
    const err = new Error(
      `Delhivery label not available yet for AWB ${awbNumber}. Please try again in 1-2 minutes after manifestation.`,
    );
    (err as any).status = 503;
    throw err;
  }

  /**
   * Register a per-seller pickup warehouse under the master Delhivery
   * account. Delhivery's B2C "Client Warehouse Creation" API
   * (POST /api/backend/clientwarehouse/create/) accepts a JSON body —
   * NOT the legacy form-encoded `data=` envelope used by CMU.
   *
   * This is what makes pan-India multi-seller pickups work: every
   * seller gets their own warehouse, their address sits on file with
   * Delhivery, and the rider routes to the correct location for every
   * shipment. If a warehouse with the same name already exists,
   * Delhivery returns a clear error which we treat as success — names
   * are deterministic (`xn-<sellerCode>`) so a duplicate just means
   * "this seller is already onboarded with the carrier".
   */
  async registerWarehouse(
    config: SellerCourierConfig,
    options: RegisterWarehouseOptions,
  ): Promise<RegisterWarehouseResult> {
    const base = this.getBaseUrl(config);

    const phone = this.normalizePhone(options.phone);
    const returnAddress = options.returnAddress?.trim() || options.address;
    const returnCity = options.returnCity?.trim() || options.city;
    const returnState = options.returnState?.trim() || options.state;
    const returnCountry = options.returnCountry?.trim() || options.country || 'India';
    const returnPin = options.returnPincode?.trim() || options.pincode;

    const displayName = options.label || options.name;

    if (!displayName || !options.address || !options.city || !options.state || !options.pincode || !phone) {
      return {
        success: false,
        message:
          'Missing required warehouse fields (name, address, city, state, pincode, phone).',
      };
    }

    const fullAddress = `${options.address}, ${options.city}, ${options.state} - ${options.pincode}`;
    const fullReturnAddress = `${returnAddress}, ${returnCity}, ${returnState} - ${returnPin}`;

    const body: Record<string, unknown> = {
      name: displayName,
      email: options.email || '',
      phone,
      alternate_phone: options.alternatePhone || '',
      address: fullAddress,
      city: options.city,
      state: options.state,
      country: options.country || 'India',
      pin: options.pincode,
      return_address: fullReturnAddress,
      return_pin: returnPin,
      return_city: returnCity,
      return_state: returnState,
      return_country: returnCountry,
      registered_name: options.registeredName || options.name,
      contact_person: options.contactPerson || options.registeredName || options.name,
    };

    this.logger.log(
      `Delhivery register warehouse: ${JSON.stringify({ ...body, phone: '••••' + phone.slice(-4) })} → POST ${base}/api/backend/clientwarehouse/create/`,
    );

    let res: Response;
    let text = '';
    try {
      res = await fetch(`${base}/api/backend/clientwarehouse/create/`, {
        method: 'POST',
        headers: this.authHeaders(config),
        body: JSON.stringify(body),
      });
      text = await res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Delhivery warehouse create transport error: ${msg}`);
      return { success: false, message: `Warehouse registration failed: ${msg}` };
    }

    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* noop */ }

    // Delhivery's clientwarehouse/create endpoint sometimes responds with
    // an XML envelope instead of JSON — typically when the request is
    // forwarded to the legacy HQ system. The HTTP status can also be 400
    // even when the warehouse is actually created (the body says
    // "A new client warehouse has been created in HQ(Delhivery)"). We
    // extract the inner `<message>` / `<name>` so the rest of this
    // method can branch on the same logical outcomes as the JSON path.
    const xml = !parsed ? this.extractDelhiveryWarehouseXml(text) : null;

    this.logger.log(
      `Delhivery warehouse create response: HTTP ${res.status} → ${text.slice(0, 500)}`,
    );

    // Success: HTTP 200 with `success: true` (modern JSON path).
    if (res.ok && parsed?.success === true) {
      return {
        success: true,
        registeredName: parsed?.data?.name || displayName,
        message: `Warehouse "${displayName}" registered with Delhivery.`,
        raw: parsed,
      };
    }

    // Success via XML envelope — Delhivery HQ propagation. The body
    // explicitly says "has been created" (or "successfully created").
    // Treat as success even though the HTTP status is 400.
    if (xml && /\b(has been created|successfully created|created successfully)\b/i.test(xml.message)) {
      const finalName = xml.name || displayName;
      return {
        success: true,
        registeredName: finalName,
        message: `Warehouse "${finalName}" registered with Delhivery.`,
        raw: { xml: text, parsed: xml },
      };
    }

    const errMsg = (
      parsed?.error ||
      parsed?.message ||
      parsed?.data?.message ||
      (Array.isArray(parsed?.errors) && parsed.errors.join('; ')) ||
      xml?.message ||
      text ||
      `HTTP ${res.status}`
    ).toString();
    const lower = errMsg.toLowerCase();

    // Already exists — try to update with new address details
    if (
      lower.includes('already exist') ||
      lower.includes('duplicate') ||
      lower.includes('already registered') ||
      lower.includes('warehouse name already') ||
      lower.includes('client warehouse with this name')
    ) {
      this.logger.log(
        `Delhivery warehouse "${displayName}" already exists — updating address via edit endpoint.`,
      );
      const editResult = await this.editWarehouse(config, { ...options, name: displayName });
      if (editResult.success) {
        return {
          success: true,
          alreadyExisted: true,
          registeredName: displayName,
          message: `Warehouse "${displayName}" updated on Delhivery with new address.`,
          raw: editResult.raw,
        };
      }
      return {
        success: true,
        alreadyExisted: true,
        registeredName: xml?.name || displayName,
        message: `Warehouse "${displayName}" already registered with Delhivery.`,
        raw: parsed ?? xml ?? text,
      };
    }

    // Error while creating — warehouse likely exists with different details
    if (
      lower.includes('error while creating/updating warehouse') &&
      xml?.name &&
      xml.name.toLowerCase() === displayName.toLowerCase()
    ) {
      this.logger.log(
        `Delhivery warehouse "${displayName}" already exists — attempting to update address via edit endpoint.`,
      );
      const editResult = await this.editWarehouse(config, { ...options, name: displayName });
      if (editResult.success) {
        return {
          success: true,
          alreadyExisted: true,
          registeredName: xml.name,
          message: `Warehouse "${xml.name}" updated on Delhivery with new address.`,
          raw: editResult.raw,
        };
      }
      this.logger.warn(
        `Delhivery warehouse edit failed: ${editResult.message} — warehouse exists but address may be outdated.`,
      );
      return {
        success: true,
        alreadyExisted: true,
        registeredName: xml.name,
        message: `Warehouse "${xml.name}" exists on Delhivery (address update failed: ${editResult.message}).`,
        raw: parsed ?? xml ?? text,
      };
    }

    this.logger.warn(
      `Delhivery warehouse create failed: ${res.status} ${text.slice(0, 300)}`,
    );

    return {
      success: false,
      message: this.humaniseWarehouseError(errMsg),
      raw: parsed ?? xml ?? text,
    };
  }

  /**
   * Update an existing warehouse on Delhivery with new address details.
   * Called when registerWarehouse detects the warehouse already exists
   * but with different address information.
   */
  private async editWarehouse(
    config: SellerCourierConfig,
    options: RegisterWarehouseOptions,
  ): Promise<{ success: boolean; message: string; raw?: unknown }> {
    const base = this.getBaseUrl(config);
    const phone = this.normalizePhone(options.phone);

    const returnAddress = options.returnAddress?.trim() || options.address;
    const returnCity = options.returnCity?.trim() || options.city;
    const returnState = options.returnState?.trim() || options.state;
    const returnPin = options.returnPincode?.trim() || options.pincode;

    // Include city, state, pincode in the address field so Delhivery
    // displays the complete pickup address on their shipping labels.
    const fullAddress = `${options.address}, ${options.city}, ${options.state} - ${options.pincode}`;
    const fullReturnAddress = `${returnAddress}, ${returnCity}, ${returnState} - ${returnPin}`;

    const body: Record<string, unknown> = {
      name: options.name,
      phone,
      address: fullAddress,
      city: options.city,
      state: options.state,
      country: options.country || 'India',
      pin: options.pincode,
      registered_name: options.registeredName || options.name,
      contact_person: options.contactPerson || options.registeredName || options.name,
      email: options.email || '',
      return_address: fullReturnAddress,
      return_pin: returnPin,
      return_city: returnCity,
      return_state: returnState,
      return_country: options.returnCountry?.trim() || options.country || 'India',
    };

    this.logger.log(
      `Delhivery edit warehouse: ${JSON.stringify({ ...body, phone: '••••' + phone.slice(-4) })} → POST ${base}/api/backend/clientwarehouse/edit/`,
    );

    let res: Response;
    let text = '';
    try {
      res = await fetch(`${base}/api/backend/clientwarehouse/edit/`, {
        method: 'POST',
        headers: this.authHeaders(config),
        body: JSON.stringify(body),
      });
      text = await res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Delhivery warehouse edit transport error: ${msg}`);
      return { success: false, message: `Warehouse edit failed: ${msg}` };
    }

    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* noop */ }

    const xml = !parsed ? this.extractDelhiveryWarehouseXml(text) : null;

    this.logger.log(
      `Delhivery warehouse edit response: HTTP ${res.status} → ${text.slice(0, 500)}`,
    );

    // Success cases
    if (res.ok && parsed?.success === true) {
      return {
        success: true,
        message: `Warehouse "${options.name}" updated successfully.`,
        raw: parsed,
      };
    }

    // XML success response
    if (xml && /\b(updated|success|modified)\b/i.test(xml.message)) {
      return {
        success: true,
        message: `Warehouse "${options.name}" updated successfully.`,
        raw: { xml: text, parsed: xml },
      };
    }

    // Check for "no changes" or similar which is still acceptable
    const errMsg = (
      parsed?.error ||
      parsed?.message ||
      xml?.message ||
      text ||
      `HTTP ${res.status}`
    ).toString();
    const lower = errMsg.toLowerCase();
    if (lower.includes('no change') || lower.includes('already up to date')) {
      return {
        success: true,
        message: `Warehouse "${options.name}" is already up to date.`,
        raw: parsed ?? xml ?? text,
      };
    }

    this.logger.warn(`Delhivery warehouse edit failed: ${res.status} ${text.slice(0, 300)}`);
    return {
      success: false,
      message: errMsg.slice(0, 200),
      raw: parsed ?? xml ?? text,
    };
  }

  /**
   * Pull `<message>` and `<name>` out of Delhivery's XML envelope. We
   * deliberately do not pull a full XML parser dependency for this —
   * the payload structure is fixed and shallow. Returns null when the
   * body isn't recognisably XML.
   */
  private extractDelhiveryWarehouseXml(
    text: string,
  ): { message: string; name: string } | null {
    if (!text || !/<\?xml|<root[\s>]/i.test(text)) return null;
    const messageMatch = text.match(/<message>([\s\S]*?)<\/message>/i);
    const detailMatch = text.match(/<detail>([\s\S]*?)<\/detail>/i);
    const nameMatch = text.match(/<name>([\s\S]*?)<\/name>/i);
    if (!messageMatch && !detailMatch && !nameMatch) return null;
    const decode = (s: string) =>
      s
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();
    return {
      message: messageMatch ? decode(messageMatch[1]) : detailMatch ? decode(detailMatch[1]) : '',
      name: nameMatch ? decode(nameMatch[1]) : '',
    };
  }

  private humaniseWarehouseError(rawMsg: string): string {
    const msg = rawMsg.toLowerCase();
    if (msg.includes('invalid token') || msg.includes('invalid api') || msg.includes('unauthorized') || msg.includes('authentication')) {
      return `Delhivery API token is invalid or expired. Please go to Shipping Settings → Delhivery → Edit and paste a fresh API token from your Delhivery One dashboard (Settings → API Setup).`;
    }
    if (msg.includes('non serviceable') || msg.includes('not serviceable') || msg.includes('unserviceable')) {
      return `Delhivery doesn't service pickups from this pincode. Please ask the seller to check their business pincode (or use a nearby serviceable warehouse).`;
    }
    if (msg.includes('invalid pin') || msg.includes('invalid pincode')) {
      return `Invalid pincode supplied to Delhivery. Please correct the seller's business pincode.`;
    }
    if (msg.includes('phone') && (msg.includes('invalid') || msg.includes('required'))) {
      return `Delhivery rejected the pickup phone number. Please ensure the seller's contact number is a valid 10-digit Indian mobile.`;
    }
    if (/internal\s*error/i.test(rawMsg)) {
      return `Delhivery couldn't register the warehouse. Common causes: missing/invalid fields, unserviceable pincode, or a temporary outage.`;
    }
    return `Delhivery rejected warehouse registration: ${rawMsg}`;
  }

  /**
   * Maps every Delhivery `Status.Status` / scan string we've seen in the
   * wild into our internal `ShipmentStatus` enum. Delhivery is loose
   * about casing/spacing across endpoints (sometimes "In Transit",
   * sometimes "INTRANSIT", sometimes "In-transit"), so we normalise
   * before lookup and fall back to substring detection for everything
   * outside the explicit table.
   */
  private mapDelhiveryStatus(status: string): string {
    const raw = (status || '').trim();
    if (!raw) return 'IN_TRANSIT';

    const normalised = raw.toLowerCase().replace(/[\s_-]+/g, ' ').trim();

    const exact: Record<string, string> = {
      'manifested': 'BOOKED',
      'ready to ship': 'BOOKED',
      'order placed': 'BOOKED',
      'pickup pending': 'BOOKED',
      'not picked': 'BOOKED',
      'pickup awaited': 'PICKUP_SCHEDULED',
      'pickup scheduled': 'PICKUP_SCHEDULED',
      'pickup generated': 'PICKUP_SCHEDULED',
      'ready for pickup': 'PICKUP_SCHEDULED',
      'added to pickup': 'PICKUP_SCHEDULED',
      'picked up': 'PICKED_UP',
      'pickup done': 'PICKED_UP',
      'pickup complete': 'PICKED_UP',
      'shipped': 'IN_TRANSIT',
      'dispatched': 'IN_TRANSIT',
      'in transit': 'IN_TRANSIT',
      'intransit': 'IN_TRANSIT',
      'reached destination hub': 'IN_TRANSIT',
      'reached destination': 'IN_TRANSIT',
      'reached': 'IN_TRANSIT',
      'undelivered': 'IN_TRANSIT',
      'pending': 'IN_TRANSIT',
      'misrouted': 'IN_TRANSIT',
      'out for delivery': 'OUT_FOR_DELIVERY',
      'ofd': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'delivery successful': 'DELIVERED',
      'rto initiated': 'RTO_INITIATED',
      'rto requested': 'RTO_INITIATED',
      'rto in transit': 'RTO_INITIATED',
      'rto out for delivery': 'RTO_INITIATED',
      'rto delivered': 'RTO_DELIVERED',
      'returned': 'RTO_DELIVERED',
      'cancelled': 'CANCELLED',
      'canceled': 'CANCELLED',
      'lost': 'CANCELLED',
      'damaged': 'CANCELLED',
    };

    if (exact[normalised]) return exact[normalised];

    if (normalised.includes('delivered') && !normalised.includes('rto')) return 'DELIVERED';
    if (normalised.includes('rto delivered')) return 'RTO_DELIVERED';
    if (normalised.includes('rto')) return 'RTO_INITIATED';
    if (normalised.includes('out for delivery')) return 'OUT_FOR_DELIVERY';
    if (normalised.includes('picked')) return 'PICKED_UP';
    if (normalised.includes('pickup')) return 'PICKUP_SCHEDULED';
    if (normalised.includes('cancel') || normalised.includes('lost') || normalised.includes('damaged')) return 'CANCELLED';
    if (normalised.includes('manifest')) return 'BOOKED';
    if (normalised.includes('transit') || normalised.includes('reached') || normalised.includes('dispatch')) return 'IN_TRANSIT';

    return 'IN_TRANSIT';
  }
}
