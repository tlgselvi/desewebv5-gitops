import { db } from '@/db/index.js';
import { permissions, users } from '@/db/schema/saas.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

/**
 * Module-based Permission System
 * 
 * Modules: finance, crm, inventory, hr, iot, seo, service, settings
 * Actions: read, write, delete, all
 */

export type Module = 'finance' | 'crm' | 'inventory' | 'hr' | 'iot' | 'seo' | 'service' | 'settings' | 'admin';
export type Action = 'read' | 'write' | 'delete' | 'all';

export interface ModulePermission {
  module: Module;
  action: Action;
}

/**
 * Get user permissions from database
 */
export async function getUserPermissions(
  userId: string,
  organizationId: string
): Promise<ModulePermission[]> {
  try {
    // Get user role
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      logger.warn('User not found for permission check', { userId });
      return [];
    }

    // Super admin has all permissions
    if (user.role === 'super_admin') {
      return getAllModulePermissions();
    }

    // Get permissions from database
    const userPermissions = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(permissions)
      .where(
        and(
          eq(permissions.organizationId, organizationId),
          eq(permissions.role, user.role)
        )
      );

    return userPermissions.map((p) => ({
      module: p.resource as Module,
      action: p.action as Action,
    }));
  } catch (error) {
    logger.error('Error fetching user permissions', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      organizationId,
    });
    return [];
  }
}

/**
 * Check if user has permission for a module and action
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  module: Module,
  action: Action
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, organizationId);

  // Check for exact match
  const hasExactMatch = userPermissions.some(
    (p) => p.module === module && (p.action === action || p.action === 'all')
  );

  if (hasExactMatch) {
    return true;
  }

  // Check for wildcard module (admin role)
  const hasAdminAccess = userPermissions.some(
    (p) => p.module === 'admin' && (p.action === action || p.action === 'all')
  );

  return hasAdminAccess;
}

/**
 * Get all module permissions (for super admin)
 */
function getAllModulePermissions(): ModulePermission[] {
  const modules: Module[] = ['finance', 'crm', 'inventory', 'hr', 'iot', 'seo', 'service', 'settings', 'admin'];
  return modules.map((module) => ({ module, action: 'all' as Action }));
}

/**
 * Default permissions for roles
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, ModulePermission[]> = {
  admin: [
    { module: 'finance', action: 'all' },
    { module: 'crm', action: 'all' },
    { module: 'inventory', action: 'all' },
    { module: 'hr', action: 'all' },
    { module: 'iot', action: 'all' },
    { module: 'seo', action: 'all' },
    { module: 'service', action: 'all' },
    { module: 'settings', action: 'all' },
  ],
  accountant: [
    { module: 'finance', action: 'all' },
    { module: 'inventory', action: 'read' },
  ],
  sales: [
    { module: 'crm', action: 'all' },
    { module: 'finance', action: 'read' },
  ],
  hr_manager: [
    { module: 'hr', action: 'all' },
    { module: 'finance', action: 'read' },
  ],
  user: [
    { module: 'crm', action: 'read' },
    { module: 'finance', action: 'read' },
  ],
};

