import { db, seoProjects } from '@/db/index.js';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

export type NewProject = {
  name: string;
  description?: string | null;
  domain: string;
  targetRegion?: string;
  primaryKeywords: string[];
  targetDomainAuthority?: number;
  targetCtrIncrease?: number;
  ownerId: string;
};

export type ProjectInput = Omit<NewProject, 'ownerId'>;

// Infer SeoProject type from schema
export type SeoProject = typeof seoProjects.$inferSelect;

/**
 * SEO Service
 * Handles business logic for SEO projects
 */
export class SeoService {
  /**
   * Create a new SEO project
   */
  async createProject(data: NewProject): Promise<SeoProject> {
    try {
      logger.info('Creating new SEO project', {
        name: data.name,
        domain: data.domain,
        ownerId: data.ownerId,
      });

      const [project] = await db
        .insert(seoProjects)
        .values({
          name: data.name,
          description: data.description ?? null,
          domain: data.domain,
          targetRegion: data.targetRegion ?? 'Türkiye',
          primaryKeywords: data.primaryKeywords ?? [],
          targetDomainAuthority: data.targetDomainAuthority ?? 50,
          targetCtrIncrease: data.targetCtrIncrease ?? 25,
          status: 'active',
          ownerId: data.ownerId,
        })
        .returning();

      if (!project) {
        logger.error('Project creation returned empty result', { ownerId: data.ownerId });
        throw new Error('Project creation failed: No project returned from database');
      }

      logger.info('SEO project created successfully', {
        projectId: project.id,
        name: project.name,
        domain: project.domain,
      });

      return project;
    } catch (error) {
      logger.error('Failed to create SEO project', {
        error: error instanceof Error ? error.message : String(error),
        ownerId: data.ownerId,
      });
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<SeoProject | null> {
    try {
      const [project] = await db
        .select()
        .from(seoProjects)
        .where(eq(seoProjects.id, id))
        .limit(1);

      return project ?? null;
    } catch (error) {
      logger.error('Failed to get project by ID', {
        error: error instanceof Error ? error.message : String(error),
        projectId: id,
      });
      throw error;
    }
  }

  /**
   * Get projects by owner ID
   */
  async getProjectsByOwner(ownerId: string): Promise<SeoProject[]> {
    try {
      const projects = await db
        .select()
        .from(seoProjects)
        .where(eq(seoProjects.ownerId, ownerId))
        .orderBy(seoProjects.createdAt);

      return projects;
    } catch (error) {
      logger.error('Failed to get projects by owner', {
        error: error instanceof Error ? error.message : String(error),
        ownerId,
      });
      throw error;
    }
  }

  /**
   * Get user projects
   * Returns projects ordered by createdAt descending (newest first)
   */
  async getUserProjects(userId: string): Promise<Array<{
    id: string;
    name: string;
    domain: string;
    targetRegion: string | null;
    status: string;
    createdAt: Date;
  }>> {
    try {
      const projects = await db
        .select({
          id: seoProjects.id,
          name: seoProjects.name,
          domain: seoProjects.domain,
          targetRegion: seoProjects.targetRegion,
          status: seoProjects.status,
          createdAt: seoProjects.createdAt,
        })
        .from(seoProjects)
        .where(eq(seoProjects.ownerId, userId))
        .orderBy(desc(seoProjects.createdAt));

      logger.debug('Retrieved user projects', { userId, count: projects.length });
      return projects;
    } catch (error) {
      logger.error('Failed to get user projects', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }
}

export const seoService = new SeoService();

