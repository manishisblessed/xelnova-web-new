import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SplitPaymentService } from './split-payment.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentController],
  providers: [PaymentService, SplitPaymentService],
  exports: [PaymentService, SplitPaymentService],
})
export class PaymentModule {}
