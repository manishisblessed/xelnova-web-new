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

@Injectable()
export class DelhiveryProvider implements CourierProvider {
  readonly providerName = 'Delhivery';
  private readonly logger = new Logger(DelhiveryProvider.name);

  private readonly prodBase = 'https://track.delhivery.com';
  private readonly stagingBase = 'https://staging-express.delhivery.com';

  constructor(private readonly config: ConfigService) {}

  private getBaseUrl(): string {
    return this.config.get('NODE_ENV') === 'production'
      ? this.prodBase
      : this.stagingBase;
  }

  private headers(config: SellerCourierConfig) {
    return {
      Authorization: `Token ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createShipment(
    config: SellerCourierConfig,
    details: ShipmentDetails,
  ): Promise<CreateShipmentResult> {
    const base = this.getBaseUrl();

    // Step 1: Fetch a waybill (AWB)
    const clientName =
      config.accountId || (config.metadata as any)?.clientName || '';
    const waybillRes = await fetch(
      `${base}/waybill/api/fetch/json/?cl=${encodeURIComponent(clientName)}&token=${config.apiKey}`,
      { headers: this.headers(config) },
    );
    if (!waybillRes.ok) {
      const errText = await waybillRes.text();
      this.logger.error(`Delhivery waybill fetch failed: ${errText}`);
      throw new Error(`Failed to fetch Delhivery waybill: ${errText}`);
    }
    const waybillData = await waybillRes.json();
    const awb = waybillData?.waybill || waybillData;

    // Step 2: Create the shipment order
    const shipmentPayload = {
      shipments: [
        {
          name: details.deliveryAddress.fullName,
          add: details.deliveryAddress.addressLine1,
          pin: details.deliveryAddress.pincode,
          city: details.deliveryAddress.city,
          state: details.deliveryAddress.state,
          country: 'India',
          phone: details.deliveryAddress.phone,
          order: details.orderNumber,
          payment_mode: details.isCod ? 'COD' : 'Prepaid',
          return_pin: details.sellerAddress.pincode,
          return_city: details.sellerAddress.city,
          return_phone: details.sellerAddress.phone,
          return_add: details.sellerAddress.address,
          return_state: details.sellerAddress.state,
          return_country: 'India',
          return_name: details.sellerAddress.name,
          products_desc: details.items.map((i) => i.name).join(', '),
          hsn_code: '',
          cod_amount: details.isCod ? details.totalAmount.toString() : '0',
          order_date: new Date().toISOString(),
          total_amount: details.totalAmount.toString(),
          seller_add: details.sellerAddress.address,
          seller_name: details.sellerAddress.name,
          seller_inv: details.orderNumber,
          quantity: details.items
            .reduce((sum, i) => sum + i.quantity, 0)
            .toString(),
          waybill: awb,
          shipment_width: details.dimensions?.split('x')[1] || '10',
          shipment_height: details.dimensions?.split('x')[2] || '10',
          weight: ((details.weight || 0.5) * 1000).toString(),
          seller_gst_tin: '',
          shipping_mode: 'Surface',
          address_type: 'home',
        },
      ],
      pickup_location: {
        name: clientName,
        add: details.sellerAddress.address,
        city: details.sellerAddress.city,
        pin_code: details.sellerAddress.pincode,
        country: 'India',
        phone: details.sellerAddress.phone,
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
      this.logger.error(`Delhivery create shipment failed: ${errText}`);
      throw new Error(`Failed to create Delhivery shipment: ${errText}`);
    }

    const createData = await createRes.json();
    const pkg = createData?.packages?.[0];

    return {
      awbNumber: String(awb),
      courierOrderId: pkg?.refnum || details.orderNumber,
      trackingUrl: `https://www.delhivery.com/track/package/${awb}`,
    };
  }

  async trackShipment(
    awbNumber: string,
    config: SellerCourierConfig,
  ): Promise<TrackingResult> {
    const base = this.getBaseUrl();
    const res = await fetch(
      `${base}/api/v1/packages/json/?waybill=${awbNumber}`,
      { headers: this.headers(config) },
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
    const base = this.getBaseUrl();
    const res = await fetch(`${base}/api/p/edit`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ waybill: awbNumber, cancellation: true }),
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
    const base = this.getBaseUrl();
    const res = await fetch(
      `${base}/c/api/pin-codes/json/?filter_codes=${deliveryPincode}`,
      { headers: this.headers(config) },
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
      estimatedDays: deliveryInfo.estimated_delivery_days || 5,
    };
  }

  private mapDelhiveryStatus(status: string): string {
    const map: Record<string, string> = {
      Manifested: 'BOOKED',
      'In Transit': 'IN_TRANSIT',
      'Pending': 'PENDING',
      Dispatched: 'IN_TRANSIT',
      'Out For Delivery': 'OUT_FOR_DELIVERY',
      Delivered: 'DELIVERED',
      'RTO Initiated': 'RTO_INITIATED',
      'RTO Delivered': 'RTO_DELIVERED',
      Cancelled: 'CANCELLED',
    };
    return map[status] || 'IN_TRANSIT';
  }
}
