import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ShippingService } from './shipping.service';
import { LabelGeneratorService } from './label-generator.service';
import { InvoiceService } from '../orders/invoice.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ShipOrderDto,
  UpdateAwbDto,
  UpdateShipmentStatusDto,
  SaveCourierConfigDto,
  UpdateCourierConfigDto,
  CreatePickupLocationDto,
  UpdatePickupLocationDto,
} from './dto/shipping.dto';
import { ShippingMode } from '@prisma/client';
import {
  successResponse,
  errorResponse,
} from '../../common/helpers/response.helper';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingRateController {
  constructor(private readonly service: ShippingService) {}

  @Post('calculate-rate')
  @ApiOperation({ summary: 'Calculate shipping rate for a given subtotal' })
  async calculateRate(@Body() body: { subtotal: number }) {
    return successResponse(
      await this.service.calculateShippingRate(body.subtotal ?? 0),
      'Shipping rate calculated',
    );
  }
}

@ApiTags('Seller Shipping')
@Controller('seller')
@Auth('SELLER' as any)
export class ShippingController {
  constructor(
    private readonly service: ShippingService,
    private readonly labelService: LabelGeneratorService,
    private readonly invoiceService: InvoiceService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Customer Invoice Download (seller view) ───

  @Get('orders/:id/invoice')
  @ApiOperation({ summary: 'Download the customer-format invoice PDF for an order (seller view)' })
  async downloadInvoice(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const sellerProfile = await this.prisma.sellerProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!sellerProfile) {
        res.status(403).json({ success: false, message: 'Not a seller' });
        return;
      }
      const pdfBuffer = await this.invoiceService.generateInvoiceForSeller(orderId, sellerProfile.id);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
      });
      return new StreamableFile(pdfBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate invoice';
      res.status(err?.['status'] || 500).json({ success: false, message });
    }
  }

  /**
   * Bulk download every customer invoice for a given calendar month as a
   * single merged PDF (testing observation #23). Falls back to current
   * month when year/month aren't supplied.
   */
  @Get('invoices/monthly')
  @ApiOperation({ summary: 'Download all customer invoices for a month as one PDF (seller view)' })
  async downloadMonthlyInvoices(
    @CurrentUser('id') userId: string,
    @Query('year') year: string | undefined,
    @Query('month') month: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const sellerProfile = await this.prisma.sellerProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!sellerProfile) {
        res.status(403).json({ success: false, message: 'Not a seller' });
        return;
      }
      const y = year ? parseInt(year, 10) : undefined;
      const m = month ? parseInt(month, 10) : undefined;
      const result = await this.invoiceService.generateMonthlyInvoicesForSeller(
        sellerProfile.id,
        { year: Number.isFinite(y as number) ? y : undefined, month: Number.isFinite(m as number) ? m : undefined },
      );
      const filename = `invoices-${result.year}-${String(result.month).padStart(2, '0')}.pdf`;
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Invoice-Count': String(result.orderCount),
      });
      return new StreamableFile(result.pdf);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate monthly invoices';
      res.status(err?.['status'] || 500).json({ success: false, message });
    }
  }

  // ─── Shipment Endpoints ───

  @Post('orders/:id/ship')
  @ApiOperation({ summary: 'Ship an order (choose shipping mode + book)' })
  async shipOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: ShipOrderDto,
  ) {
    return successResponse(
      await this.service.shipOrder(userId, orderId, dto),
      'Shipment created',
    );
  }

  @Patch('orders/:id/shipment/awb')
  @ApiOperation({ summary: 'Update AWB number (self-ship only)' })
  async updateAwb(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateAwbDto,
  ) {
    return successResponse(
      await this.service.updateAwb(userId, orderId, dto),
      'AWB updated',
    );
  }

  @Patch('orders/:id/shipment/status')
  @ApiOperation({ summary: 'Update shipment status (self-ship only)' })
  async updateShipmentStatus(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return successResponse(
      await this.service.updateShipmentStatus(userId, orderId, dto),
      'Shipment status updated',
    );
  }

  @Get('orders/:id/shipment')
  @ApiOperation({ summary: 'Get shipment details for an order' })
  async getShipment(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return successResponse(
      await this.service.getShipment(userId, orderId),
      'Shipment fetched',
    );
  }

  @Get('orders/:id/shipment/track')
  @ApiOperation({ summary: 'Live tracking from courier API' })
  async liveTrack(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return successResponse(
      await this.service.liveTrack(userId, orderId),
      'Tracking data fetched',
    );
  }

  @Post('orders/:id/shipment/cancel')
  @ApiOperation({ summary: 'Cancel shipment' })
  async cancelShipment(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return successResponse(
      await this.service.cancelShipment(userId, orderId),
      'Shipment cancellation processed',
    );
  }

  @Get('pickup-warehouse')
  @ApiOperation({
    summary:
      'Get the seller’s registered pickup warehouse status (for Ship-with-Xelnova).',
  })
  async getPickupWarehouse(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.service.getXelgoPickupWarehouseStatus(userId),
      'Pickup warehouse status fetched',
    );
  }

  @Post('pickup-warehouse/register')
  @ApiOperation({
    summary:
      'Register (or refresh) the seller’s pickup warehouse with the Xelgo carrier so the rider comes to their address.',
  })
  async registerPickupWarehouse(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.service.registerXelgoPickupWarehouse(userId),
      'Pickup warehouse registered with carrier',
    );
  }

  // ─── Pickup Locations (multi-warehouse) ───
  //
  // Each seller can register N pickup locations with the carrier
  // (Delhivery). One is marked default and is used when the seller
  // doesn't explicitly pick one on the Ship modal. Every location is
  // registered as its own carrier-side warehouse so the rider routes
  // to the correct address per shipment.

  @Get('pickup-locations')
  @ApiOperation({ summary: 'List the seller’s pickup locations (with carrier-side status).' })
  async listPickupLocations(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.service.listPickupLocations(userId),
      'Pickup locations fetched',
    );
  }

  @Post('pickup-locations')
  @ApiOperation({ summary: 'Create a new pickup location and register it with the carrier.' })
  async createPickupLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePickupLocationDto,
  ) {
    return successResponse(
      await this.service.createPickupLocation(userId, dto),
      'Pickup location created',
    );
  }

  @Patch('pickup-locations/:id')
  @ApiOperation({ summary: 'Update a pickup location (re-registers with the carrier on address change).' })
  async updatePickupLocation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePickupLocationDto,
  ) {
    return successResponse(
      await this.service.updatePickupLocation(userId, id, dto),
      'Pickup location updated',
    );
  }

  @Delete('pickup-locations/:id')
  @ApiOperation({ summary: 'Delete a pickup location (refused if it has live shipments).' })
  async deletePickupLocation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return successResponse(
      await this.service.deletePickupLocation(userId, id),
      'Pickup location deleted',
    );
  }

  @Post('pickup-locations/:id/set-default')
  @ApiOperation({ summary: 'Mark a pickup location as the seller’s default for new shipments.' })
  async setDefaultPickupLocation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return successResponse(
      await this.service.setDefaultPickupLocation(userId, id),
      'Default pickup location updated',
    );
  }

  @Post('pickup-locations/:id/register')
  @ApiOperation({
    summary:
      'Force-register (or refresh) a pickup location with the carrier. Useful after fixing an address that previously failed registration.',
  })
  async registerPickupLocation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return successResponse(
      await this.service.registerPickupLocation(userId, id),
      'Pickup location registered with carrier',
    );
  }

  @Post('pickup-locations/:id/register-all')
  @ApiOperation({ summary: 'Register a pickup location with ALL available couriers.' })
  async registerPickupLocationAllCouriers(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return successResponse(
      await this.service.registerPickupLocationAllCouriers(userId, id),
      'Pickup location registered with all available couriers',
    );
  }

  @Post('pickup-locations/:id/register/:provider')
  @ApiOperation({ summary: 'Register a pickup location with a specific courier.' })
  async registerPickupLocationWithCourier(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('provider') provider: ShippingMode,
  ) {
    return successResponse(
      await this.service.registerPickupLocationWithCourier(userId, id, provider),
      `Pickup location registered with ${provider}`,
    );
  }

  @Delete('pickup-locations/:id/register/:provider')
  @ApiOperation({ summary: 'Unregister a pickup location from a specific courier.' })
  async unregisterPickupLocationFromCourier(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('provider') provider: ShippingMode,
  ) {
    return successResponse(
      await this.service.unregisterPickupLocationFromCourier(userId, id, provider),
      `Pickup location unregistered from ${provider}`,
    );
  }

  @Get('pickup-locations/:id/registrations')
  @ApiOperation({ summary: 'Get per-courier registration statuses for a pickup location.' })
  async getPickupLocationRegistrations(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return successResponse(
      await this.service.getPickupLocationRegistrationsForUser(userId, id),
      'Pickup location registrations fetched',
    );
  }

  @Post('orders/:id/shipment/schedule-pickup')
  @ApiOperation({ summary: 'Schedule a carrier pickup for the shipment' })
  async schedulePickup(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body()
    dto: { pickupDate: string; pickupTime?: string; expectedPackageCount?: number },
  ) {
    return successResponse(
      await this.service.schedulePickup(userId, orderId, dto),
      'Pickup scheduling processed',
    );
  }

  @Get('orders/:id/serviceability')
  @ApiOperation({ summary: 'Check courier serviceability for an order' })
  async checkServiceability(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return successResponse(
      await this.service.checkServiceability(userId, orderId),
      'Serviceability checked',
    );
  }

  // ─── Shipping Label ───

  @Get('orders/:id/label')
  @ApiOperation({ summary: 'Download shipping label PDF for an order' })
  async downloadLabel(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const pdfBuffer = await this.labelService.generateShippingLabel(orderId, userId);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shipping-label-${orderId}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      });
      return new StreamableFile(pdfBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate shipping label';
      res.status(err?.['status'] || 500).json({ success: false, message });
    }
  }

  // ─── Courier Config Endpoints ───

  @Get('courier-configs')
  @ApiOperation({ summary: 'List seller courier API configurations' })
  async getCourierConfigs(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.service.getCourierConfigs(userId),
      'Courier configs fetched',
    );
  }

  @Post('courier-configs')
  @ApiOperation({ summary: 'Add or update courier API configuration' })
  async saveCourierConfig(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveCourierConfigDto,
  ) {
    return successResponse(
      await this.service.saveCourierConfig(userId, dto),
      'Courier config saved',
    );
  }

  @Patch('courier-configs/:provider')
  @ApiOperation({ summary: 'Update courier API configuration' })
  async updateCourierConfig(
    @CurrentUser('id') userId: string,
    @Param('provider') provider: ShippingMode,
    @Body() dto: UpdateCourierConfigDto,
  ) {
    return successResponse(
      await this.service.updateCourierConfig(userId, provider, dto),
      'Courier config updated',
    );
  }

  @Delete('courier-configs/:provider')
  @ApiOperation({ summary: 'Delete courier API configuration' })
  async deleteCourierConfig(
    @CurrentUser('id') userId: string,
    @Param('provider') provider: ShippingMode,
  ) {
    return successResponse(
      await this.service.deleteCourierConfig(userId, provider),
      'Courier config deleted',
    );
  }
}
