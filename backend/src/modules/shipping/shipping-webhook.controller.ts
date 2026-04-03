import { Controller, Post, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { ShippingMode } from '@prisma/client';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Shipping Webhooks')
@Controller('webhooks/shipping')
export class ShippingWebhookController {
  private readonly logger = new Logger(ShippingWebhookController.name);

  constructor(private readonly service: ShippingService) {}

  @Post('delhivery')
  @ApiOperation({ summary: 'Delhivery status webhook' })
  async delhiveryWebhook(@Body() payload: any) {
    this.logger.log(`Delhivery webhook received: ${JSON.stringify(payload).substring(0, 200)}`);
    const result = await this.service.processWebhook(
      ShippingMode.DELHIVERY,
      payload,
    );
    return successResponse(result, 'Webhook processed');
  }

  @Post('shiprocket')
  @ApiOperation({ summary: 'ShipRocket status webhook' })
  async shiprocketWebhook(@Body() payload: any) {
    this.logger.log(`ShipRocket webhook received: ${JSON.stringify(payload).substring(0, 200)}`);
    const result = await this.service.processWebhook(
      ShippingMode.SHIPROCKET,
      payload,
    );
    return successResponse(result, 'Webhook processed');
  }

  @Post('xpressbees')
  @ApiOperation({ summary: 'XpressBees status webhook' })
  async xpressbeesWebhook(@Body() payload: any) {
    this.logger.log(`XpressBees webhook received: ${JSON.stringify(payload).substring(0, 200)}`);
    const result = await this.service.processWebhook(
      ShippingMode.XPRESSBEES,
      payload,
    );
    return successResponse(result, 'Webhook processed');
  }

  @Post('ekart')
  @ApiOperation({ summary: 'Ekart status webhook' })
  async ekartWebhook(@Body() payload: any) {
    this.logger.log(`Ekart webhook received: ${JSON.stringify(payload).substring(0, 200)}`);
    const result = await this.service.processWebhook(
      ShippingMode.EKART,
      payload,
    );
    return successResponse(result, 'Webhook processed');
  }
}
