import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly prisma: PrismaService) {}

  async createShipment(
    _config: SellerCourierConfig | null,
    details: ShipmentDetails,
  ): Promise<CreateShipmentResult> {
    // Xelnova Courier: auto-generate AWB with XC prefix
    const awbNumber = `XC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    this.logger.log(
      `Xelnova Courier shipment created for order ${details.orderNumber}, AWB: ${awbNumber}`,
    );

    return {
      awbNumber,
      courierOrderId: `XN-${details.orderNumber}`,
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
