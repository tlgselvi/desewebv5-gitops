import { db } from '@/db/index.js';
import { roles, permissions, rolePermissions } from '@/db/schema/rbac.js';
import { ROLE_MATRIX } from '@/rbac/matrix.js';
import { eq } from 'drizzle-orm';
import type { RoleName } from '@/rbac/types.js';
import { logger } from '@/utils/logger.js';

async function upsertRole(name: RoleName): Promise<string> {
  const existing = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
  if (existing.length > 0) {
    return existing[0].id;
  }
  const [row] = await db.insert(roles).values({ name }).returning({ id: roles.id });
  if (!row) {
    throw new Error(`Failed to create role: ${name}`);
  }
  return row.id;
}

async function upsertPermission(resource: string, action: string): Promise<string> {
  const [row] = await db
    .insert(permissions)
    .values({ resource, action })
    .onConflictDoNothing()
    .returning({ id: permissions.id });
  
  if (row) {
    return row.id;
  }

  const [found] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.resource, resource))
    .limit(1);
  
  if (!found) {
    throw new Error(`Failed to find permission: ${resource}:${action}`);
  }
  
  return found.id;
}

export async function seedRbac(): Promise<void> {
  logger.info('Starting RBAC seed');
  
  for (const [roleName, perms] of Object.entries(ROLE_MATRIX)) {
    const roleId = await upsertRole(roleName as RoleName);
    logger.debug('Role upserted', { roleName, roleId });

    for (const p of perms) {
      const permId = await upsertPermission(p.resource, p.action);
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: permId })
        .onConflictDoNothing();
      logger.debug('Permission assigned', {
        roleName,
        resource: p.resource,
        action: p.action,
      });
    }
  }

  logger.info('RBAC seed completed');
}

if (require.main === module) {
  seedRbac()
    .then(() => {
      logger.info('RBAC seed script completed successfully');
      process.exit(0);
    })
    .catch((e) => {
      logger.error('RBAC seed script failed', { error: e });
      console.error(e);
      process.exit(1);
    });
}

