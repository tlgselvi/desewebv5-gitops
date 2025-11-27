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
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param tokenRole - Optional role from JWT token (for mock login support)
 */
export async function getUserPermissions(
  userId: string,
  organizationId: string,
  tokenRole?: string
): Promise<ModulePermission[]> {
  try {
    // First, check if this is an admin from token (mock login or JWT)
    // This allows development/testing without database permission records
    if (tokenRole === 'admin' || tokenRole === 'super_admin') {
      logger.debug('Admin role detected from token, granting all permissions', { userId, tokenRole });
      return getAllModulePermissions();
    }

    // Get user role from database
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId));

    // If user not found in DB but has a tokenRole, use default permissions
    if (!user && tokenRole) {
      logger.debug('User not in DB, using default permissions for role', { userId, tokenRole });
      return DEFAULT_ROLE_PERMISSIONS[tokenRole] || [];
    }

    if (!user) {
      logger.warn('User not found for permission check', { userId });
      return [];
    }

    // Super admin has all permissions
    if (user.role === 'super_admin' || user.role === 'admin') {
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

    // If no permissions in DB, use defaults for the role
    if (userPermissions.length === 0) {
      logger.debug('No DB permissions found, using defaults for role', { userId, role: user.role });
      return DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    }

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
    // On error, if tokenRole is admin, still grant permissions (fail-open for dev)
    if (tokenRole === 'admin') {
      logger.warn('Permission check failed, but admin token detected - granting access', { userId });
      return getAllModulePermissions();
    }
    return [];
  }
}

/**
 * Check if user has permission for a module and action
 * @param userId - User ID
 * @param organizationId - Organization ID  
 * @param module - Module to check
 * @param action - Action to check
 * @param tokenRole - Optional role from JWT token
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  module: Module,
  action: Action,
  tokenRole?: string
): Promise<boolean> {
  // Fast path: admin role from token has all permissions
  if (tokenRole === 'admin' || tokenRole === 'super_admin') {
    logger.debug('Admin role from token - permission granted', { userId, module, action });
    return true;
  }

  const userPermissions = await getUserPermissions(userId, organizationId, tokenRole);

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

