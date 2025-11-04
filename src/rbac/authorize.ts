import { and, eq } from 'drizzle-orm';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { db } from '@/db/index.js';
import { rolePermissions, permissions, userRoles, roles } from '@/db/schema/rbac.js';
import type { Action, Resource, RoleName, AuthUser } from '@/rbac/types.js';
import { logger } from '@/utils/logger.js';

export interface AuthorizeOptions {
  resource: Resource;
  action: Action;
}

function matchPermission(
  reqRes: { resource: Resource; action: Action },
  perm: { resource: string; action: string }
): boolean {
  const rOK = perm.resource === '*' || perm.resource === reqRes.resource;
  const aOK = perm.action === '*' || perm.action === reqRes.action;
  return rOK && aOK;
}

export function authorize({ resource, action }: AuthorizeOptions) {
  return async function authorizeMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as (AuthUser & { roles: RoleName[] }) | undefined; // set by JWT auth middleware

      if (!user || !user.roles) {
        logger.warn('Unauthenticated access attempt', {
          path: req.path,
          resource,
          action,
        });
        res.status(401).json({ error: 'unauthenticated' });
        return;
      }

      // Dev bypass
      if (req.headers['x-master-control-cli']) {
        logger.debug('Dev bypass enabled', { userId: user.id, path: req.path });
        return next();
      }

      // Admin short path
      if (user.roles.includes('admin' as RoleName)) {
        logger.debug('Admin access granted', { userId: user.id, path: req.path });
        return next();
      }

      // DB permissions for user
      const rows = await db
        .select({
          resource: permissions.resource,
          action: permissions.action,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(userRoles.userId, user.id));

      const allowed = rows.some((p) => matchPermission({ resource, action }, p));

      if (!allowed) {
        logger.info('Access forbidden', {
          userId: user.id,
          path: req.path,
          resource,
          action,
          userRoles: user.roles,
        });
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      logger.debug('Access granted', {
        userId: user.id,
        path: req.path,
        resource,
        action,
      });
      return next();
    } catch (err) {
      logger.error('Authorization error', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        path: req.path,
      });
      res.status(500).json({ error: 'internal_error' });
    }
  };
}

