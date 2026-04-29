import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type PermissionLevel = 'SUPER_ADMIN' | 'MANAGER' | 'EDITOR' | 'VIEWER';

export interface Permission {
  [section: string]: {
    [action: string]: boolean;
  };
}

/**
 * Manages RBAC permissions with hierarchical role support.
 * Supervis role inheritance and permission checking.
 */
@Injectable()
export class PermissionsService {
  // Role hierarchy: SUPER_ADMIN > MANAGER > EDITOR > VIEWER
  private readonly roleHierarchy: PermissionLevel[] = ['SUPER_ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the rank of a permission level in the hierarchy.
   * Higher rank = more permissions.
   */
  private getRoleRank(level: PermissionLevel): number {
    return this.roleHierarchy.indexOf(level);
  }

  /**
   * Check if a user has a specific permission.
   * Returns true if the user (via their role) has permission for the action.
   */
  async hasPermission(userId: string, section: string, action: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        adminRoleId: true,
        adminRole: {
          select: {
            permissionsData: true,
            level: true,
          },
        },
      },
    });

    if (!user || user.role !== 'ADMIN') {
      return false;
    }

    // Super admins (no assigned role) have full access
    if (!user.adminRoleId) {
      return true;
    }

    // Check assigned role's permissions
    if (user.adminRole) {
      const perms = user.adminRole.permissionsData as Permission;
      return perms?.[section]?.[action] === true;
    }

    return false;
  }

  /**
   * Check if a user has permission for multiple actions (AND logic).
   */
  async hasAllPermissions(
    userId: string,
    requirements: Array<{ section: string; action: string }>,
  ): Promise<boolean> {
    const results = await Promise.all(
      requirements.map(({ section, action }) => this.hasPermission(userId, section, action)),
    );
    return results.every((r) => r);
  }

  /**
   * Check if a user has permission for at least one action (OR logic).
   */
  async hasAnyPermission(
    userId: string,
    requirements: Array<{ section: string; action: string }>,
  ): Promise<boolean> {
    const results = await Promise.all(
      requirements.map(({ section, action }) => this.hasPermission(userId, section, action)),
    );
    return results.some((r) => r);
  }

  /**
   * Get all permissions for a user (for caching/frontend).
   */
  async getUserPermissions(userId: string): Promise<Permission | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        adminRoleId: true,
        adminRole: {
          select: {
            permissionsData: true,
          },
        },
      },
    });

    if (!user || user.role !== 'ADMIN') {
      return null;
    }

    // Super admins get full permissions
    if (!user.adminRoleId) {
      return this.getAllPermissionsTemplate();
    }

    return (user.adminRole?.permissionsData as Permission) || null;
  }

  /**
   * Get all available permissions template (for UI).
   */
  getAllPermissionsTemplate(): Permission {
    return {
      products: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        approve: true,
        reject: true,
        feature: true,
      },
      orders: {
        view: true,
        edit: true,
        cancel: true,
        refund: true,
        exportData: true,
      },
      shipments: {
        view: true,
        cancel: true,
        reschedule: true,
        track: true,
      },
      customers: {
        view: true,
        edit: true,
        ban: true,
        exportData: true,
      },
      brands: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        approve: true,
      },
      categories: {
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      coupons: {
        view: true,
        create: true,
        edit: true,
        delete: true,
      },
      reports: {
        view: true,
        export: true,
      },
      roles: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        assignRoles: true,
      },
      settings: {
        view: true,
        edit: true,
      },
    };
  }

  /**
   * Get empty/default permissions template (for new roles).
   */
  getDefaultPermissionsTemplate(): Permission {
    return {
      products: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        reject: false,
        feature: false,
      },
      orders: {
        view: false,
        edit: false,
        cancel: false,
        refund: false,
        exportData: false,
      },
      shipments: {
        view: false,
        cancel: false,
        reschedule: false,
        track: false,
      },
      customers: {
        view: false,
        edit: false,
        ban: false,
        exportData: false,
      },
      brands: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
      },
      categories: {
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
      coupons: {
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
      reports: {
        view: false,
        export: false,
      },
      roles: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        assignRoles: false,
      },
      settings: {
        view: false,
        edit: false,
      },
    };
  }

  /**
   * Validate permission data structure.
   */
  validatePermissions(permissions: any): Permission {
    const template = this.getDefaultPermissionsTemplate();

    if (!permissions || typeof permissions !== 'object') {
      return template;
    }

    const result = { ...template };

    for (const section in template) {
      if (permissions[section] && typeof permissions[section] === 'object') {
        result[section] = {
          ...template[section],
          ...permissions[section],
        };
      }
    }

    return result;
  }

  /**
   * Check if role level allows performing an action on another role.
   * Users cannot modify roles at their level or higher.
   */
  canModifyRoleLevel(userLevel: PermissionLevel, targetLevel: PermissionLevel): boolean {
    const userRank = this.getRoleRank(userLevel);
    const targetRank = this.getRoleRank(targetLevel);
    return userRank < targetRank; // lower rank (higher in hierarchy) can modify lower levels
  }

  /**
   * Get all role templates.
   */
  async getRoleTemplates(): Promise<
    Array<{
      id: string;
      name: string;
      description: string | null;
      level: string;
      permissionsData: Permission;
    }>
  > {
    return this.prisma.adminRole.findMany({
      where: { isTemplate: true },
      select: {
        id: true,
        name: true,
        description: true,
        level: true,
        permissionsData: true,
      },
    });
  }
}
