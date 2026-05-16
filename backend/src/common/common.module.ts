import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccountUniquenessService } from './services/account-uniqueness.service';
import { BusinessDaysService } from './services/business-days.service';
import { RbacGuard } from './guards/rbac.guard';
import { PermissionsService } from '../modules/admin/permissions.service';

@Global()
@Module({
  providers: [
    AccountUniquenessService,
    BusinessDaysService,
    PermissionsService,
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
  exports: [AccountUniquenessService, BusinessDaysService, PermissionsService],
})
export class CommonModule {}
