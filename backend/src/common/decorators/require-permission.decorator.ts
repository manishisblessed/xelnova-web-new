import { SetMetadata } from '@nestjs/common';
import { REQUIRE_PERMISSION_KEY, PermissionRequirement } from '../guards/rbac.guard';

/**
 * Decorator to specify required permissions for a route.
 * Can be used with single or multiple permissions.
 *
 * @example Single permission
 * @RequirePermission({ section: 'products', action: 'view' })
 *
 * @example Multiple permissions (all required)
 * @RequirePermission([
 *   { section: 'products', action: 'view' },
 *   { section: 'products', action: 'edit' },
 * ])
 *
 * @example Multiple permissions (any one required)
 * @RequirePermission([
 *   { section: 'products', action: 'edit' },
 *   { section: 'products', action: 'approve' },
 * ], false)
 */
export function RequirePermission(
  requirements: PermissionRequirement | PermissionRequirement[],
  requireAll: boolean = true,
) {
  const reqs = Array.isArray(requirements) ? requirements : [requirements];
  reqs.forEach((req) => {
    req.requireAll = requireAll;
  });
  return SetMetadata(REQUIRE_PERMISSION_KEY, reqs);
}
