import { Global, Module } from '@nestjs/common';
import { AccountUniquenessService } from './services/account-uniqueness.service';

@Global()
@Module({
  providers: [AccountUniquenessService],
  exports: [AccountUniquenessService],
})
export class CommonModule {}
