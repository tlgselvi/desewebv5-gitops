import { db, seoProjects, seoMetrics } from '@/db/index.js';
import { eq, desc, and } from 'drizzle-orm';
import { logger, seoLogger } from '@/utils/logger.js';
import { recordSeoAnalysis } from '@/middleware/prometheus.js';
import { z } from 'zod';
import type { CustomError } from '@/middleware/errorHandler.js';
import { redis } from '@/services/storage/redisClient.js';

// Re-export types from seoAnalyzer for backward compatibility
export type { SeoAnalysisRequest } from '@/services/seoAnalyzer.js';

// Validation schemas
const SeoAnalysisRequestSchema = z.object({
  projectId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1).max(10),
  options: z.object({
    device: z.enum(['mobile', 'desktop']).default('desktop'),
    throttling: z.enum(['slow3G', 'fast3G', '4G', 'none']).default('4G'),
    categories: z.array(z.string()).default(['performance', 'accessibility', 'best-practices', 'seo']),
  }).optional(),
});

export type NewProject = {
  organizationId: string;
  name: string;
  description?: string | null;
  domain: string;
  targetRegion?: string;
  primaryKeywords: string[];
  targetDomainAuthority?: number;
  targetCtrIncrease?: number;
  ownerId: string;
};

export type ProjectInput = Omit<NewProject, 'ownerId' | 'organizationId'>;
export type SeoProject = typeof seoProjects.$inferSelect;

/**
 * SEO Service
 * Modern service with multi-tenancy support and proper error handling
 */
export class SeoService {
  // Method removed: invalidateProjectCache (duplicate)
  // See below for the actual implementation

  /**
   * Create a new SEO project
   * Requires organizationId for multi-tenancy
   */
  async createProject(data: NewProject): Promise<SeoProject> {
    try {
      logger.info('Creating new SEO project', {
        name: data.name,
        domain: data.domain,
        organizationId: data.organizationId,
        ownerId: data.ownerId,
      });

      const [project] = await db
        .insert(seoProjects)
        .values({
          organizationId: data.organizationId,
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
        logger.error('Project creation returned empty result', {
          organizationId: data.organizationId,
          ownerId: data.ownerId,
        });
        throw new Error('Project creation failed: No project returned from database');
      }

      logger.info('SEO project created successfully', {
        projectId: project.id,
        organizationId: project.organizationId,
        name: project.name,
        domain: project.domain,
      });

      // Invalidate related caches
      await this.invalidateProjectCache(project.id, project.organizationId);

      return project;
    } catch (error) {
      logger.error('Failed to create SEO project', {
        error: error instanceof Error ? error.message : String(error),
        organizationId: data.organizationId,
        ownerId: data.ownerId,
      });
      throw error;
    }
  }

  /**
   * Get project by ID with organizationId check for multi-tenancy
   * Uses Redis cache for performance optimization
   */
  async getProjectById(id: string, organizationId: string): Promise<SeoProject | null> {
    try {
      // Try to get from cache first
      const cacheKey = `seo:project:${id}:${organizationId}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Project retrieved from cache', { projectId: id });
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        // Cache miss or error - continue to database query
        logger.debug('Cache miss or error, querying database', {
          projectId: id,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      // Query database
      const [project] = await db
        .select()
        .from(seoProjects)
        .where(and(
          eq(seoProjects.id, id),
          eq(seoProjects.organizationId, organizationId)
        ))
        .limit(1);

      // Cache the result if found (TTL: 5 minutes)
      if (project) {
        try {
          await redis.setex(cacheKey, 300, JSON.stringify(project));
        } catch (cacheError) {
          // Cache write error - log but don't fail
          logger.warn('Failed to cache project', {
            projectId: id,
            error: cacheError instanceof Error ? cacheError.message : String(cacheError),
          });
        }
      }

      return project ?? null;
    } catch (error) {
      logger.error('Failed to get project by ID', {
        error: error instanceof Error ? error.message : String(error),
        projectId: id,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get projects for an organization
   * Uses Redis cache for performance optimization
   */
  async getOrganizationProjects(organizationId: string): Promise<Array<{
    id: string;
    name: string;
    domain: string;
    targetRegion: string | null;
    status: string;
    createdAt: Date;
  }>> {
    try {
      // Try to get from cache first
      const cacheKey = `seo:projects:org:${organizationId}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Organization projects retrieved from cache', { organizationId });
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        // Cache miss or error - continue to database query
        logger.debug('Cache miss or error, querying database', {
          organizationId,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      // Query database
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
        .where(eq(seoProjects.organizationId, organizationId))
        .orderBy(desc(seoProjects.createdAt));

      // Cache the result (TTL: 2 minutes - shorter for list queries)
      try {
        await redis.setex(cacheKey, 120, JSON.stringify(projects));
      } catch (cacheError) {
        // Cache write error - log but don't fail
        logger.warn('Failed to cache organization projects', {
          organizationId,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      logger.debug('Retrieved organization projects', {
        organizationId,
        count: projects.length,
      });
      return projects;
    } catch (error) {
      logger.error('Failed to get organization projects', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get projects for a user (within their organization)
   * @deprecated Use getOrganizationProjects instead for better multi-tenancy support
   */
  async getUserProjects(userId: string, organizationId: string): Promise<Array<{
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
        .where(and(
          eq(seoProjects.ownerId, userId),
          eq(seoProjects.organizationId, organizationId)
        ))
        .orderBy(desc(seoProjects.createdAt));

      logger.debug('Retrieved user projects', {
        userId,
        organizationId,
        count: projects.length,
      });
      return projects;
    } catch (error) {
      logger.error('Failed to get user projects', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        organizationId,
      });
      throw error;
    }
  }

  // Analysis Methods - Delegates to seoAnalyzer service
  async analyzeUrl(
    url: string,
    options?: z.infer<typeof SeoAnalysisRequestSchema>['options'],
  ): Promise<unknown> {
    try {
      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      return await seoAnalyzer.analyzeUrl(url, options);
    } catch (error) {
      logger.error('Failed to analyze URL', {
        error: error instanceof Error ? error.message : String(error),
        url,
      });
      throw error;
    }
  }

  /**
   * Analyze project URLs
   * Validates project belongs to organization before analysis
   * Invalidates metrics and trends cache after analysis
   */
  async analyzeProject(
    request: z.infer<typeof SeoAnalysisRequestSchema>,
    organizationId: string,
  ): Promise<unknown> {
    try {
      // Verify project belongs to organization
      const project = await this.getProjectById(request.projectId, organizationId);
      if (!project) {
        throw new Error('Proje bulunamadı veya erişim reddedildi');
      }

      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      const result = await seoAnalyzer.analyzeProject(request);

      // Invalidate metrics and trends cache after new analysis
      try {
        // Delete metrics cache patterns (common limit-based caches)
        const cacheKeys = [
          `seo:metrics:${request.projectId}:10`,
          `seo:metrics:${request.projectId}:20`,
          `seo:metrics:${request.projectId}:50`,
          `seo:trends:${request.projectId}:30`,
          `seo:trends:${request.projectId}:90`,
          `seo:trends:${request.projectId}:365`,
        ];
        
        for (const key of cacheKeys) {
          try {
            await redis.del(key);
          } catch (error) {
            // Ignore individual cache deletion errors
          }
        }
        
        logger.debug('Invalidated metrics and trends cache after analysis', {
          projectId: request.projectId,
        });
      } catch (cacheError) {
        // Cache invalidation error - log but don't fail
        logger.warn('Failed to invalidate metrics cache', {
          projectId: request.projectId,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to analyze project', {
        error: error instanceof Error ? error.message : String(error),
        projectId: request.projectId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get project metrics
   * Validates project belongs to organization
   * Uses Redis cache for performance optimization
   */
  async getProjectMetrics(
    projectId: string,
    organizationId: string,
    limit: number = 10,
  ) {
    try {
      // Verify project belongs to organization
      const project = await this.getProjectById(projectId, organizationId);
      if (!project) {
        throw new Error('Proje bulunamadı veya erişim reddedildi');
      }

      // Try to get from cache first
      const cacheKey = `seo:metrics:${projectId}:${limit}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Project metrics retrieved from cache', { projectId });
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        // Cache miss or error - continue to query
        logger.debug('Cache miss or error, querying metrics', {
          projectId,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      const metrics = await seoAnalyzer.getProjectMetrics(projectId, limit);

      // Cache the result (TTL: 1 minute - metrics change frequently)
      try {
        await redis.setex(cacheKey, 60, JSON.stringify(metrics));
      } catch (cacheError) {
        // Cache write error - log but don't fail
        logger.warn('Failed to cache project metrics', {
          projectId,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      return metrics;
    } catch (error) {
      logger.error('Failed to get project metrics', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get project trends
   * Validates project belongs to organization
   * Uses Redis cache for performance optimization
   */
  async getProjectTrends(
    projectId: string,
    organizationId: string,
    days: number = 30,
  ) {
    try {
      // Verify project belongs to organization
      const project = await this.getProjectById(projectId, organizationId);
      if (!project) {
        throw new Error('Proje bulunamadı veya erişim reddedildi');
      }

      // Try to get from cache first
      const cacheKey = `seo:trends:${projectId}:${days}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.debug('Project trends retrieved from cache', { projectId, days });
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        // Cache miss or error - continue to query
        logger.debug('Cache miss or error, querying trends', {
          projectId,
          days,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
      const trends = await seoAnalyzer.getProjectTrends(projectId, days);

      // Cache the result (TTL: 5 minutes - trends change less frequently)
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(trends));
      } catch (cacheError) {
        // Cache write error - log but don't fail
        logger.warn('Failed to cache project trends', {
          projectId,
          days,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError),
        });
      }

      return trends;
    } catch (error) {
      logger.error('Failed to get project trends', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Invalidate cache for a project
   * Called when project data is updated
   */
  async invalidateProjectCache(projectId: string, organizationId: string): Promise<void> {
    try {
      const keys = [
        `seo:project:${projectId}:${organizationId}`,
        `seo:projects:org:${organizationId}`,
        `seo:metrics:${projectId}:*`,
        `seo:trends:${projectId}:*`,
      ];

      // Delete specific keys
      await redis.del(`seo:project:${projectId}:${organizationId}`);
      await redis.del(`seo:projects:org:${organizationId}`);

      // Delete pattern-based keys (metrics and trends with different limits/days)
      const patternKeys = await redis.keys(`seo:metrics:${projectId}:*`);
      const trendKeys = await redis.keys(`seo:trends:${projectId}:*`);
      
      if (patternKeys.length > 0) {
        await redis.del(...patternKeys);
      }
      if (trendKeys.length > 0) {
        await redis.del(...trendKeys);
      }

      logger.debug('Project cache invalidated', { projectId, organizationId });
    } catch (error) {
      // Cache invalidation error - log but don't fail
      logger.warn('Failed to invalidate project cache', {
        projectId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const seoService = new SeoService();

