import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SellerOnboardingController } from './seller-onboarding.controller';
import { SellerOnboardingService } from './seller-onboarding.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { VerificationModule } from '../verification/verification.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    PrismaModule,
    VerificationModule,
    UploadModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SellerOnboardingController],
  providers: [SellerOnboardingService],
  exports: [SellerOnboardingService],
})
export class SellerOnboardingModule {}
