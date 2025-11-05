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

async function upsertPermission(
  resource: string,
  action: string,
  description?: string,
  category?: string
): Promise<string> {
  const [row] = await db
    .insert(permissions)
    .values({
      resource,
      action,
      description: description || null,
      category: category || null,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: permissions.id });
  
  if (row) {
    return row.id;
  }

  // Try to find by both resource and action
  const [found] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.resource, resource))
    .limit(1);
  
  if (!found) {
    // If not found, try to insert again (might be a race condition)
    const [newRow] = await db
      .insert(permissions)
      .values({
        resource,
        action,
        description: description || null,
        category: category || null,
        updatedAt: new Date(),
      })
      .returning({ id: permissions.id });
    
    if (!newRow) {
      throw new Error(`Failed to create or find permission: ${resource}:${action}`);
    }
    
    return newRow.id;
  }
  
  // Update existing permission with description/category if provided
  if (description || category) {
    await db
      .update(permissions)
      .set({
        description: description || undefined,
        category: category || undefined,
        updatedAt: new Date(),
      })
      .where(eq(permissions.id, found.id));
  }
  
  return found.id;
}

export async function seedRbac(): Promise<void> {
  logger.info('Starting RBAC seed');
  
  for (const [roleName, perms] of Object.entries(ROLE_MATRIX)) {
    const roleId = await upsertRole(roleName as RoleName);
    logger.debug('Role upserted', { roleName, roleId });

    for (const p of perms) {
      // Determine category based on resource
      const category = p.resource.startsWith('finbot')
        ? 'finance'
        : p.resource === 'seo'
          ? 'seo'
          : p.resource === '*'
            ? 'system'
            : 'analytics';
      
      // Create description
      const description =
        p.resource === '*'
          ? 'Full system access'
          : `${p.action} access to ${p.resource}`;

      const permId = await upsertPermission(p.resource, p.action, description, category);
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: permId })
        .onConflictDoNothing();
      logger.debug('Permission assigned', {
        roleName,
        resource: p.resource,
        action: p.action,
        permissionId: permId,
      });
    }
  }

  logger.info('RBAC seed completed');
}

// ESM module check - run if executed directly
const isMainModule = import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) ||
                     process.argv[1]?.includes('seed.ts');

if (isMainModule || process.argv[1]?.includes('seed')) {
  seedRbac()
    .then(() => {
      console.log('✅ RBAC seed completed successfully');
      logger.info('RBAC seed script completed successfully');
      process.exit(0);
    })
    .catch((e) => {
      console.error('❌ RBAC seed failed:', e);
      logger.error('RBAC seed script failed', { error: e });
      process.exit(1);
    });
}

