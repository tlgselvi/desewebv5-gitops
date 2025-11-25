import { db, seoProjects, seoMetrics } from '@/db/index.js';
import { eq, desc } from 'drizzle-orm';
import { logger, seoLogger } from '@/utils/logger.js';
import { recordSeoAnalysis } from '@/middleware/prometheus.js';
import lighthouse from 'lighthouse';
import type { Flags } from 'lighthouse';
import puppeteer from 'puppeteer';
import type { Browser, Page, Protocol, CDPSession } from 'puppeteer';
import { URL } from 'url';
import { z } from 'zod';

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
export type SeoProject = typeof seoProjects.$inferSelect;

/**
 * SEO Service
 * Combines project management and analysis functionality
 */
export class SeoService {
  private browser: Browser | null = null;

  // Project Management Methods (from seoService)
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

  // Analysis Methods (from seoAnalyzer)
  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });
      seoLogger.info('SEO Analyzer initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      seoLogger.error('Failed to initialize SEO Analyzer', { error: errorMessage });
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  async analyzeUrl(url: string, options?: SeoAnalysisRequestSchema['options']): Promise<unknown> {
    // Import and use seoAnalyzer for analysis
    const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
    return seoAnalyzer.analyzeUrl(url, options);
  }

  async analyzeProject(request: z.infer<typeof SeoAnalysisRequestSchema>): Promise<unknown> {
    const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
    return seoAnalyzer.analyzeProject(request);
  }

  async getProjectMetrics(projectId: string, limit: number = 10) {
    const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
    return seoAnalyzer.getProjectMetrics(projectId, limit);
  }

  async getProjectTrends(projectId: string, days: number = 30) {
    const { seoAnalyzer } = await import('@/services/seoAnalyzer.js');
    return seoAnalyzer.getProjectTrends(projectId, days);
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      seoLogger.info('SEO Analyzer cleaned up');
    }
  }
}

export const seoService = new SeoService();

