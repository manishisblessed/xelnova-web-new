import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ShippingService } from './shipping.service';
import { LabelGeneratorService } from './label-generator.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ShipOrderDto,
  UpdateAwbDto,
  UpdateShipmentStatusDto,
  SaveCourierConfigDto,
  UpdateCourierConfigDto,
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
  ) {}

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
