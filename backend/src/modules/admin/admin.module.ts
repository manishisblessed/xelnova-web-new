import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ReportsService } from './reports.service';
import { DuplicateListingService } from './duplicate-listing.service';
import { PricingCheckService } from './pricing-check.service';
import { PermissionsService } from './permissions.service';
import { PaymentModule } from '../payment/payment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShippingModule } from '../shipping/shipping.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [ShippingModule, PaymentModule, NotificationsModule, ReviewsModule],
  controllers: [AdminController],
  providers: [AdminService, ReportsService, DuplicateListingService, PricingCheckService, PermissionsService],
  exports: [AdminService, ReportsService, PermissionsService],
})
export class AdminModule {}
