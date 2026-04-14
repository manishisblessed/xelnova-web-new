import { Module } from '@nestjs/common';
import { SellerDashboardController } from './seller-dashboard.controller';
import { SellerDashboardService } from './seller-dashboard.service';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WalletModule, PaymentModule, NotificationsModule],
  controllers: [SellerDashboardController],
  providers: [SellerDashboardService],
})
export class SellerDashboardModule {}
