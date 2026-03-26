import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const effectiveRoles = this.getEffectiveRoles(user.role as Role);
    const hasAccess = requiredRoles.some((role) => effectiveRoles.includes(role));
    if (!hasAccess) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private getEffectiveRoles(role: Role): Role[] {
    switch (role) {
      case 'ADMIN':
        return ['ADMIN', 'SELLER', 'CUSTOMER'];
      case 'SELLER':
        return ['SELLER', 'CUSTOMER'];
      case 'CUSTOMER':
      default:
        return ['CUSTOMER'];
    }
  }
}
