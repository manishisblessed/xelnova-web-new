import { Module } from '@nestjs/common';
import { SellerOnboardingController } from './seller-onboarding.controller';
import { SellerOnboardingService } from './seller-onboarding.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { VerificationModule } from '../verification/verification.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, VerificationModule, UploadModule],
  controllers: [SellerOnboardingController],
  providers: [SellerOnboardingService],
  exports: [SellerOnboardingService],
})
export class SellerOnboardingModule {}
