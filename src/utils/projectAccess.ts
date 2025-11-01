import { db, seoProjects } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from './logger.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

/**
 * Check if user has access to a project
 * Returns project if accessible, null otherwise
 */
export async function verifyProjectAccess(
  projectId: string,
  userId: string,
  userRole: string
): Promise<{ id: string; ownerId: string; name: string } | null> {
  try {
    const project = await db
      .select({
        id: seoProjects.id,
        ownerId: seoProjects.ownerId,
        name: seoProjects.name,
      })
      .from(seoProjects)
      .where(eq(seoProjects.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return null; // Project not found
    }

    // Admins can access any project
    if (userRole === 'admin') {
      return project[0];
    }

    // Regular users can only access their own projects
    if (project[0].ownerId === userId) {
      return project[0];
    }

    return null; // Access denied
  } catch (error) {
    logger.error('Error verifying project access', { error, projectId, userId });
    return null;
  }
}

/**
 * Middleware helper to check project access
 */
export async function requireProjectAccess(
  req: AuthenticatedRequest,
  projectId: string
): Promise<{ hasAccess: boolean; project?: { id: string; ownerId: string; name: string } }> {
  if (!req.user) {
    return { hasAccess: false };
  }

  const project = await verifyProjectAccess(
    projectId,
    req.user.id,
    req.user.role
  );

  if (!project) {
    return { hasAccess: false };
  }

  return { hasAccess: true, project };
}

