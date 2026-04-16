import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if ((!requiredRoles || requiredRoles.length === 0) && (!requiredPermissions || requiredPermissions.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Check role-based access
    if (requiredRoles && requiredRoles.length > 0) {
      const effectiveRoles = this.getEffectiveRoles(user.role as Role);
      const hasRoleAccess = requiredRoles.some((role) => effectiveRoles.includes(role));
      if (!hasRoleAccess) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Check fine-grained permissions from AdminRole
    if (requiredPermissions && requiredPermissions.length > 0 && user.role === 'ADMIN') {
      const userPermissions = await this.getUserPermissions(user.id);
      if (userPermissions !== null) {
        const hasPermission = requiredPermissions.every((p) => userPermissions.includes(p));
        if (!hasPermission) {
          throw new ForbiddenException(`Missing permission: ${requiredPermissions.join(', ')}`);
        }
      }
      // If userPermissions is null (no custom role assigned), allow full access for ADMIN
    }

    return true;
  }

  private async getUserPermissions(userId: string): Promise<string[] | null> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<{ adminRoleId: string | null }[]>(
        `SELECT "adminRoleId" FROM "users" WHERE "id" = $1 LIMIT 1`,
        userId,
      );
      const adminRoleId = rows?.[0]?.adminRoleId;
      if (!adminRoleId) return null;

      const role = await this.prisma.adminRole.findUnique({
        where: { id: adminRoleId },
        select: { permissions: true },
      });
      if (!role) return null;

      return role.permissions.split(',').map((p) => p.trim()).filter(Boolean);
    } catch {
      return null;
    }
  }

  private getEffectiveRoles(role: Role): Role[] {
    switch (role) {
      case 'ADMIN':
        return ['ADMIN', 'SELLER', 'CUSTOMER'];
      case 'SELLER':
        return ['SELLER', 'CUSTOMER'];
      case 'BUSINESS':
        return ['BUSINESS'];
      case 'CUSTOMER':
      default:
        return ['CUSTOMER'];
    }
  }
}
