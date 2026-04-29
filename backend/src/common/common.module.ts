import { Global, Module, APP_GUARD } from '@nestjs/common';
import { AccountUniquenessService } from './services/account-uniqueness.service';
import { RbacGuard } from './guards/rbac.guard';
import { PermissionsService } from '../modules/admin/permissions.service';

@Global()
@Module({
  providers: [
    AccountUniquenessService,
    PermissionsService,
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
  exports: [AccountUniquenessService, PermissionsService],
})
export class CommonModule {}
