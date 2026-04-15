import { Module } from '@nestjs/common';
import { SellerStoreController } from './seller-store.controller';
import { SellerStoreService } from './seller-store.service';

@Module({
  controllers: [SellerStoreController],
  providers: [SellerStoreService],
  exports: [SellerStoreService],
})
export class SellerStoreModule {}
