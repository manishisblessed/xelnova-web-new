import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SplitPaymentService } from './split-payment.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => OrdersModule)],
  controllers: [PaymentController],
  providers: [PaymentService, SplitPaymentService],
  exports: [PaymentService, SplitPaymentService],
})
export class PaymentModule {}
