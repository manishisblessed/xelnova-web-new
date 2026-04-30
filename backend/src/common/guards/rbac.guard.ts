import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../modules/admin/permissions.service';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export interface PermissionRequirement {
  section: string;
  action: string;
  requireAll?: boolean; // true = all must pass, false = any one
}

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission requirements from decorator
    const requirements = this.reflector.get<PermissionRequirement[]>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler(),
    );

    // If no permissions required, allow access
    if (!requirements || requirements.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user isn't populated yet (global guard runs before controller-level
    // JwtAuthGuard), skip RBAC and let the auth guard handle rejection.
    if (!user || !user.id) {
      return true;
    }

    // Super admin (no assigned role) always has access
    if (!user.adminRoleId) {
      return true;
    }

    // Check permissions based on requireAll flag
    const requireAll = requirements[0]?.requireAll !== false;

    if (requireAll) {
      // All permissions must be satisfied
      for (const req of requirements) {
        const hasPermission = await this.permissionsService.hasPermission(
          user.id,
          req.section,
          req.action,
        );
        if (!hasPermission) {
          throw new ForbiddenException(
            `Missing permission: ${req.section}:${req.action}`,
          );
        }
      }
      return true;
    } else {
      // At least one permission must be satisfied
      for (const req of requirements) {
        const hasPermission = await this.permissionsService.hasPermission(
          user.id,
          req.section,
          req.action,
        );
        if (hasPermission) {
          return true;
        }
      }
      throw new ForbiddenException('Insufficient permissions for this action');
    }
  }
}
