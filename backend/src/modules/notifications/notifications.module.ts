import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationService } from './notification.service';
import { LoyaltyService } from './loyalty.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { FraudDetectionService } from './fraud-detection.service';
import { CodVerificationService } from './cod-verification.service';
import { WhatsAppService } from './whatsapp.service';
import { WebPushService } from './web-push.service';
import { SmsService } from './sms.service';
import {
  NotificationsController,
  LoyaltyController,
  CodController,
  AdminNotificationsController,
} from './notifications.controller';

@Module({
  imports: [WalletModule],
  controllers: [
    NotificationsController,
    LoyaltyController,
    CodController,
    AdminNotificationsController,
  ],
  providers: [
    NotificationService,
    WhatsAppService,
    WebPushService,
    SmsService,
    LoyaltyService,
    AbandonedCartService,
    FraudDetectionService,
    CodVerificationService,
  ],
  exports: [
    NotificationService,
    WhatsAppService,
    WebPushService,
    SmsService,
    LoyaltyService,
    AbandonedCartService,
    FraudDetectionService,
    CodVerificationService,
  ],
})
export class NotificationsModule {}
