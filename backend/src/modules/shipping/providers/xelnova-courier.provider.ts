import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SellerCourierConfig } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CourierProvider,
  ShipmentDetails,
  CreateShipmentResult,
  TrackingResult,
  CancelResult,
  ServiceabilityResult,
} from './courier-provider.interface';

@Injectable()
export class XelnovaCourierProvider implements CourierProvider {
  readonly providerName = 'Xelnova Courier';
  private readonly logger = new Logger(XelnovaCourierProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Next pickup window: following business day ~2 PM (India-style cut-off). */
  private computePickupAt(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(14, 0, 0, 0);
    return d;
  }

  /** Used when Xelnova booking is fulfilled via Delhivery (pickup hint for sellers). */
  getNextPickupDate(): Date {
    return this.computePickupAt();
  }

  async createShipment(
    _config: SellerCourierConfig | null,
    details: ShipmentDetails,
  ): Promise<CreateShipmentResult> {
    // Xelnova Courier: auto-generate AWB with XC prefix
    const awbNumber = `XC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const pickupScheduledAt = this.computePickupAt();
    const lastMile =
      this.config.get<string>('XELNOVA_LAST_MILE_PARTNER')?.trim() ||
      'Delhivery Express';
    const displayCourierLine = `${this.providerName} · ${lastMile}`;

    this.logger.log(
      `Xelnova Courier shipment created for order ${details.orderNumber}, AWB: ${awbNumber}, pickup: ${pickupScheduledAt.toISOString()}, partner: ${lastMile}`,
    );

    return {
      awbNumber,
      courierOrderId: `XN-${details.orderNumber}`,
      pickupScheduledAt,
      displayCourierLine,
    };
  }

  async trackShipment(
    awbNumber: string,
    _config: SellerCourierConfig | null,
  ): Promise<TrackingResult> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { awbNumber },
    });

    if (!shipment) {
      return { status: 'UNKNOWN', statusHistory: [] };
    }

    return {
      status: shipment.shipmentStatus,
      statusHistory: (shipment.statusHistory as any[]) || [],
    };
  }

  async cancelShipment(
    awbNumber: string,
    _config: SellerCourierConfig | null,
  ): Promise<CancelResult> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { awbNumber },
    });

    if (!shipment) {
      return { success: false, message: 'Shipment not found' };
    }

    if (['DELIVERED', 'RTO_DELIVERED'].includes(shipment.shipmentStatus)) {
      return {
        success: false,
        message: 'Cannot cancel a delivered shipment',
      };
    }

    return { success: true, message: 'Cancellation request submitted to Xelnova logistics team' };
  }

  async checkServiceability(
    _pickupPincode: string,
    _deliveryPincode: string,
    _config: SellerCourierConfig | null,
  ): Promise<ServiceabilityResult> {
    // Xelnova Courier is always serviceable across India
    return {
      serviceable: true,
      estimatedDays: 5,
    };
  }
}
