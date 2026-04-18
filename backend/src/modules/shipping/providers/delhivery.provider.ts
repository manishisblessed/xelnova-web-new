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
        try {
          const parsed = JSON.parse(waybillData);
          awb = String(parsed?.waybill || parsed?.[0] || '').trim();
        } catch {
          awb = waybillData.trim();
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

    const shipmentPayload = {
      shipments: [
        {
          name: details.deliveryAddress.fullName,
          add: [
            details.deliveryAddress.addressLine1,
            details.deliveryAddress.addressLine2,
          ].filter(Boolean).join(', '),
          pin: details.deliveryAddress.pincode,
          city: details.deliveryAddress.city,
          state: details.deliveryAddress.state,
          country: 'India',
          phone: details.deliveryAddress.phone,
          order: details.orderNumber,
          payment_mode: isCod ? 'COD' : 'Pre-paid',
          return_pin: details.sellerAddress.pincode,
          return_city: details.sellerAddress.city,
          return_phone: details.sellerAddress.phone,
          return_add: details.sellerAddress.address,
          return_state: details.sellerAddress.state,
          return_country: 'India',
          return_name: details.sellerAddress.name,
          products_desc: details.items.map((i) => i.name).join(', ').slice(0, 200) || 'Products',
          hsn_code: '',
          cod_amount: isCod ? String(details.totalAmount || 0) : '0',
          order_date: new Date().toISOString(),
          total_amount: String(details.totalAmount || 0),
          seller_add: details.sellerAddress.address,
          seller_name: details.sellerAddress.name,
          seller_inv: details.orderNumber,
          quantity: String(details.items.reduce((sum, i) => sum + i.quantity, 0) || 1),
          waybill: awb || '',
          shipment_length: lengthCm,
          shipment_width: widthCm,
          shipment_height: heightCm,
          weight: String(Math.round((details.weight || 0.5) * 1000)),
          seller_gst_tin: sellerGstin,
          shipping_mode: shippingMode,
          address_type: 'home',
        },
      ],
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
      this.logger.error(`Delhivery create shipment failed: ${createRes.status} ${errText}`);
      throw new Error(`Failed to create Delhivery shipment: ${errText}`);
    }

    const createData = await createRes.json();

    if (!createData.success) {
      const rawMsg = createData.rmk || createData.packages?.[0]?.remarks?.[0] || 'Unknown error';
      let errMsg = rawMsg;

      if (rawMsg.includes('ClientWarehouse matching query does not exist')) {
        errMsg = `Invalid Pickup Location Name. Please check your Delhivery Settings → Warehouses and enter the exact warehouse name in your shipping settings.`;
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
