import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShippingController, ShippingRateController } from './shipping.controller';
import { ShippingWebhookController } from './shipping-webhook.controller';
import { ShippingService } from './shipping.service';
import { LabelGeneratorService } from './label-generator.service';
import { DelhiveryProvider } from './providers/delhivery.provider';
import { ShipRocketProvider } from './providers/shiprocket.provider';
import { XpressBeesProvider } from './providers/xpressbees.provider';
import { EkartProvider } from './providers/ekart.provider';
import { XelnovaCourierProvider } from './providers/xelnova-courier.provider';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, NotificationsModule],
  controllers: [ShippingController, ShippingRateController, ShippingWebhookController],
  providers: [
    ShippingService,
    LabelGeneratorService,
    DelhiveryProvider,
    ShipRocketProvider,
    XpressBeesProvider,
    EkartProvider,
    XelnovaCourierProvider,
  ],
  exports: [ShippingService, LabelGeneratorService],
})
export class ShippingModule {}
