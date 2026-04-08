import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ReportsService } from './reports.service';
import { DuplicateListingService } from './duplicate-listing.service';
import { PricingCheckService } from './pricing-check.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [AdminController],
  providers: [AdminService, ReportsService, DuplicateListingService, PricingCheckService],
  exports: [AdminService, ReportsService],
})
export class AdminModule {}
