import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller';
import { PayoutReleaseService } from './payout-release.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [PayoutController],
  providers: [PayoutReleaseService],
  exports: [PayoutReleaseService],
})
export class PayoutModule {}
