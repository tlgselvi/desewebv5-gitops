import { db } from '@/db/index.js';
import { permissions, rolePermissions, roles } from '@/db/schema/rbac.js';
import { eq, and, or } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

export interface CreatePermissionInput {
  resource: string;
  action: string;
  description?: string;
  category?: string;
}

export interface UpdatePermissionInput {
  description?: string;
  category?: string;
}

export interface PermissionWithRoles {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Permission Management Service
 * Handles CRUD operations for permissions and role-permission relationships
 */
export const permissionService = {
  /**
   * Create a new permission
   */
  async create(input: CreatePermissionInput): Promise<typeof permissions.$inferSelect> {
    try {
      const [permission] = await db
        .insert(permissions)
        .values({
          resource: input.resource,
          action: input.action,
          description: input.description || null,
          category: input.category || null,
          updatedAt: new Date(),
        })
        .returning();

      logger.info('Permission created', {
        permissionId: permission.id,
        resource: input.resource,
        action: input.action,
      });

      return permission;
    } catch (error) {
      logger.error('Failed to create permission', {
        error: error instanceof Error ? error.message : String(error),
        input,
      });
      throw error;
    }
  },

  /**
   * Get all permissions with their associated roles
   */
  async findAll(): Promise<PermissionWithRoles[]> {
    try {
      const allPermissions = await db.query.permissions.findMany({
        orderBy: (permissions, { asc }) => [asc(permissions.resource), asc(permissions.action)],
      });

      const permissionsWithRoles = await Promise.all(
        allPermissions.map(async (perm) => {
          const rolePerms = await db
            .select({
              roleId: rolePermissions.roleId,
              roleName: roles.name,
            })
            .from(rolePermissions)
            .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
            .where(eq(rolePermissions.permissionId, perm.id));

          return {
            ...perm,
            roles: rolePerms.map((rp) => ({
              id: rp.roleId,
              name: rp.roleName,
            })),
          };
        })
      );

      return permissionsWithRoles;
    } catch (error) {
      logger.error('Failed to fetch permissions', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  /**
   * Get permission by ID
   */
  async findById(id: string): Promise<PermissionWithRoles | null> {
    try {
      const permission = await db.query.permissions.findFirst({
        where: eq(permissions.id, id),
      });

      if (!permission) {
        return null;
      }

      const rolePerms = await db
        .select({
          roleId: rolePermissions.roleId,
          roleName: roles.name,
        })
        .from(rolePermissions)
        .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
        .where(eq(rolePermissions.permissionId, id));

      return {
        ...permission,
        roles: rolePerms.map((rp) => ({
          id: rp.roleId,
          name: rp.roleName,
        })),
      };
    } catch (error) {
      logger.error('Failed to find permission', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  /**
   * Find permission by resource and action
   */
  async findByResourceAndAction(
    resource: string,
    action: string
  ): Promise<typeof permissions.$inferSelect | null> {
    try {
      const permission = await db.query.permissions.findFirst({
        where: and(eq(permissions.resource, resource), eq(permissions.action, action)),
      });

      return permission ?? null;
    } catch (error) {
      logger.error('Failed to find permission by resource and action', {
        resource,
        action,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  /**
   * Update permission
   */
  async update(id: string, input: UpdatePermissionInput): Promise<typeof permissions.$inferSelect> {
    try {
      const [updated] = await db
        .update(permissions)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(permissions.id, id))
        .returning();

      if (!updated) {
        throw new Error(`Permission with id ${id} not found`);
      }

      logger.info('Permission updated', {
        permissionId: id,
        updates: input,
      });

      return updated;
    } catch (error) {
      logger.error('Failed to update permission', {
        id,
        error: error instanceof Error ? error.message : String(error),
        input,
      });
      throw error;
    }
  },

  /**
   * Delete permission (cascades to role_permissions)
   */
  async delete(id: string): Promise<void> {
    try {
      await db.delete(permissions).where(eq(permissions.id, id));

      logger.info('Permission deleted', {
        permissionId: id,
      });
    } catch (error) {
      logger.error('Failed to delete permission', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  /**
   * Assign permission to role
   */
  async assignToRole(permissionId: string, roleId: string): Promise<void> {
    try {
      await db.insert(rolePermissions).values({
        permissionId,
        roleId,
      });

      logger.info('Permission assigned to role', {
        permissionId,
        roleId,
      });
    } catch (error) {
      logger.error('Failed to assign permission to role', {
        permissionId,
        roleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  /**
   * Remove permission from role
   */
  async removeFromRole(permissionId: string, roleId: string): Promise<void> {
    try {
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.permissionId, permissionId),
            eq(rolePermissions.roleId, roleId)
          )
        );

      logger.info('Permission removed from role', {
        permissionId,
        roleId,
      });
    } catch (error) {
      logger.error('Failed to remove permission from role', {
        permissionId,
        roleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  /**
   * Get permissions by category
   */
  async findByCategory(category: string): Promise<typeof permissions.$inferSelect[]> {
    try {
      return await db.query.permissions.findMany({
        where: eq(permissions.category, category),
        orderBy: (permissions, { asc }) => [asc(permissions.resource), asc(permissions.action)],
      });
    } catch (error) {
      logger.error('Failed to find permissions by category', {
        category,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};

