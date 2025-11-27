import lighthouse from 'lighthouse';
import type { Flags } from 'lighthouse';
import puppeteer from 'puppeteer';
import type { Browser, Page, Protocol, CDPSession } from 'puppeteer';
import { URL } from 'url';
import { z } from 'zod';
import { db, seoMetrics, seoProjects } from '@/db/index.js';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { seoLogger } from '@/utils/logger.js';
import { recordSeoAnalysis } from '@/middleware/prometheus.js';

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

export type SeoAnalysisRequest = z.infer<typeof SeoAnalysisRequestSchema>;

export type CoreWebVitals = {
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  totalBlockingTime?: number;
  speedIndex?: number;
  timeToInteractive?: number;
};

interface LighthouseScoreSummary {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

interface LighthouseAuditDetails {
  type?: string;
  [key: string]: unknown;
}

interface LighthouseAudit {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  numericValue?: number;
  displayValue?: string;
  details?: LighthouseAuditDetails;
}

interface LighthouseCategory {
  score?: number | null;
}

interface LighthouseCategories {
  performance?: LighthouseCategory;
  accessibility?: LighthouseCategory;
  ['best-practices']?: LighthouseCategory;
  seo?: LighthouseCategory;
  [key: string]: LighthouseCategory | undefined;
}

interface LighthouseRunResult {
  lhr: {
    categories: LighthouseCategories;
    audits: Record<string, LighthouseAudit>;
  };
}

interface LighthouseOpportunity {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  numericValue?: number;
  displayValue?: string;
}

interface LighthouseDiagnostic {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  details?: LighthouseAuditDetails;
}

interface LighthouseAnalysisResult {
  url: string;
  scores: LighthouseScoreSummary;
  coreWebVitals: CoreWebVitals;
  opportunities: LighthouseOpportunity[];
  diagnostics: LighthouseDiagnostic[];
  rawData: LighthouseRunResult['lhr'];
  analyzedAt: string;
}

interface SeoProjectAnalysisSummary {
  projectId: string;
  totalUrls: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  results: LighthouseAnalysisResult[];
  errors: Array<{ url: string; error: string }>;
  analyzedAt: string;
}

type AnalyzerOptions = NonNullable<SeoAnalysisRequest['options']>;
type DevicePreset = AnalyzerOptions['device'];
type ThrottlingPreset = AnalyzerOptions['throttling'];
type SeoMetricRow = typeof seoMetrics.$inferSelect;

type MetricTrend = {
  current: number | null;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
};

type MetricTrendSummary = {
  performance: MetricTrend;
  accessibility: MetricTrend;
  seo: MetricTrend;
};

const toNullableDecimal = (value: number | null | undefined, fractionDigits: number = 2): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }

  return numeric.toFixed(fractionDigits);
};

export class SeoAnalyzer {
  private browser: Browser | null = null;

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

  async analyzeUrl(url: string, options?: SeoAnalysisRequest['options']): Promise<LighthouseAnalysisResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const normalizedOptions: Partial<NonNullable<SeoAnalysisRequest['options']>> = options ?? {};

    const device: DevicePreset = normalizedOptions.device ?? 'desktop';
    const throttling: ThrottlingPreset = normalizedOptions.throttling ?? '4G';
    const categories: string[] = normalizedOptions.categories ?? ['performance', 'accessibility', 'best-practices', 'seo'];

    try {
      const page: Page = await this.browser!.newPage();
      
      // Set viewport based on device
      await page.setViewport({
        width: device === 'mobile' ? 375 : 1280,
        height: device === 'mobile' ? 667 : 720,
        isMobile: device === 'mobile',
      });

      // Configure throttling
      const client: CDPSession = await page.target().createCDPSession();
      await client.send('Network.enable');
      
      if (throttling !== 'none') {
        const throttlingConfig = this.getThrottlingConfig(throttling);
        await client.send('Network.emulateNetworkConditions', throttlingConfig);
      }

      // Run Lighthouse
      const wsEndpoint = await this.browser!.wsEndpoint();
      const parsedPort = Number(new URL(wsEndpoint).port);
      const lighthouseOptions: Flags = {
        logLevel: 'error',
        output: 'json',
        onlyCategories: categories,
      };
      if (!Number.isNaN(parsedPort)) {
        lighthouseOptions.port = parsedPort;
      }

      const result = await lighthouse(url, lighthouseOptions);
      await page.close();

      if (!result) {
        throw new Error('Lighthouse analysis failed');
      }

      return this.processLighthouseResults(result, url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      seoLogger.error('SEO analysis failed', { url, error: errorMessage });
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  private getThrottlingConfig(throttling: ThrottlingPreset): Protocol.Network.EmulateNetworkConditionsRequest {
    const configs: Record<string, Protocol.Network.EmulateNetworkConditionsRequest> = {
      slow3G: {
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // 500 Kbps
        uploadThroughput: 500 * 1024 / 8,
        latency: 400,
      },
      fast3G: {
        offline: false,
        downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 150,
      },
      '4G': {
        offline: false,
        downloadThroughput: 10 * 1024 * 1024 / 8, // 10 Mbps
        uploadThroughput: 5 * 1024 * 1024 / 8, // 5 Mbps
        latency: 20,
      },
      none: {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      },
    };

    const config = configs[throttling] ?? configs['4G'];
    return config as Protocol.Network.EmulateNetworkConditionsRequest;
  }

  private processLighthouseResults(result: LighthouseRunResult, url: string): LighthouseAnalysisResult {
    const { lhr } = result;
    const audits = lhr.audits;

    const coreWebVitals: CoreWebVitals = {};
    const assignCoreVital = (
      key: keyof CoreWebVitals,
      value: number | null | undefined,
    ) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        coreWebVitals[key] = value;
      }
    };

    assignCoreVital('firstContentfulPaint', audits['first-contentful-paint']?.numericValue);
    assignCoreVital('largestContentfulPaint', audits['largest-contentful-paint']?.numericValue);
    assignCoreVital('cumulativeLayoutShift', audits['cumulative-layout-shift']?.numericValue);
    assignCoreVital('firstInputDelay', audits['max-potential-fid']?.numericValue);
    assignCoreVital('totalBlockingTime', audits['total-blocking-time']?.numericValue);
    assignCoreVital('speedIndex', audits['speed-index']?.numericValue);
    assignCoreVital('timeToInteractive', audits['interactive']?.numericValue);

    const categories = lhr.categories;
    const scores: LighthouseScoreSummary = {
      performance: Math.round(((categories.performance?.score ?? 0) || 0) * 100),
      accessibility: Math.round(((categories.accessibility?.score ?? 0) || 0) * 100),
      bestPractices: Math.round(((categories['best-practices']?.score ?? 0) || 0) * 100),
      seo: Math.round(((categories.seo?.score ?? 0) || 0) * 100),
    };

    const auditValues = Object.values(audits) as LighthouseAudit[];

    const opportunities: LighthouseOpportunity[] = auditValues
      .filter((audit) => audit.details?.type === 'opportunity')
      .map((audit) => {
        const opportunity: LighthouseOpportunity = {
          id: audit.id,
          title: audit.title,
          score: audit.score,
        };

        if (typeof audit.description === 'string') {
          opportunity.description = audit.description;
        }
        if (typeof audit.numericValue === 'number') {
          opportunity.numericValue = audit.numericValue;
        }
        if (typeof audit.displayValue === 'string') {
          opportunity.displayValue = audit.displayValue;
        }

        return opportunity;
      });

    const diagnostics: LighthouseDiagnostic[] = auditValues
      .filter((audit) => audit.details?.type === 'diagnostic')
      .map((audit) => {
        const diagnostic: LighthouseDiagnostic = {
          id: audit.id,
          title: audit.title,
          score: audit.score,
        };

        if (typeof audit.description === 'string') {
          diagnostic.description = audit.description;
        }
        if (audit.details) {
          diagnostic.details = audit.details;
        }

        return diagnostic;
      });

    return {
      url,
      scores,
      coreWebVitals,
      opportunities,
      diagnostics,
      rawData: lhr,
      analyzedAt: new Date().toISOString(),
    };
  }

  async analyzeProject(request: SeoAnalysisRequest): Promise<SeoProjectAnalysisSummary> {
    // Validate request
    const validatedRequest = SeoAnalysisRequestSchema.parse(request);

    // Verify project exists
    // Note: organizationId check should be done at service layer, not here
    // This is a low-level analyzer service
    const [project] = await db
      .select()
      .from(seoProjects)
      .where(eq(seoProjects.id, validatedRequest.projectId))
      .limit(1);

    if (!project) {
      throw new Error('Project not found');
    }

    const results: LighthouseAnalysisResult[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    seoLogger.info('Starting SEO analysis', {
      projectId: validatedRequest.projectId,
      urlCount: validatedRequest.urls.length,
    });

    // Record metrics
    recordSeoAnalysis(validatedRequest.projectId, 'lighthouse');

    // Batch insert optimization: Collect all metric records first, then insert in batch
    const metricRecords: Array<typeof seoMetrics.$inferInsert> = [];

    for (const url of validatedRequest.urls) {
      try {
        const analysis = await this.analyzeUrl(url, validatedRequest.options);
        
        // Prepare metric record for batch insert
        const metricRecord = {
          projectId: validatedRequest.projectId,
          url,
          performance: toNullableDecimal(analysis.scores.performance),
          accessibility: toNullableDecimal(analysis.scores.accessibility),
          bestPractices: toNullableDecimal(analysis.scores.bestPractices),
          seo: toNullableDecimal(analysis.scores.seo),
          firstContentfulPaint: toNullableDecimal(analysis.coreWebVitals.firstContentfulPaint, 2),
          largestContentfulPaint: toNullableDecimal(analysis.coreWebVitals.largestContentfulPaint, 2),
          cumulativeLayoutShift: toNullableDecimal(analysis.coreWebVitals.cumulativeLayoutShift, 4),
          firstInputDelay: toNullableDecimal(analysis.coreWebVitals.firstInputDelay, 2),
          totalBlockingTime: toNullableDecimal(analysis.coreWebVitals.totalBlockingTime, 2),
          speedIndex: toNullableDecimal(analysis.coreWebVitals.speedIndex, 2),
          timeToInteractive: toNullableDecimal(analysis.coreWebVitals.timeToInteractive, 2),
          rawData: analysis.rawData,
        } satisfies typeof seoMetrics.$inferInsert;

        metricRecords.push(metricRecord);
        results.push(analysis);
        
        seoLogger.info('URL analysis completed', { url, scores: analysis.scores });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        seoLogger.error('URL analysis failed', { url, error: errorMessage });
        errors.push({ url, error: errorMessage });
      }
    }

    // Batch insert all metrics at once (optimization: reduces N+1 query problem)
    if (metricRecords.length > 0) {
      try {
        await db.insert(seoMetrics).values(metricRecords);
        seoLogger.info('Batch inserted metrics', { count: metricRecords.length });
      } catch (error) {
        seoLogger.error('Failed to batch insert metrics', {
          error: error instanceof Error ? error.message : String(error),
          count: metricRecords.length,
        });
        // Don't fail the entire operation if batch insert fails
      }
    }

    return {
      projectId: validatedRequest.projectId,
      totalUrls: validatedRequest.urls.length,
      successfulAnalyses: results.length,
      failedAnalyses: errors.length,
      results,
      errors,
      analyzedAt: new Date().toISOString(),
    };
  }

  async getProjectMetrics(projectId: string, limit: number = 10) {
    // Use desc order to get most recent metrics first
    const metrics = await db
      .select()
      .from(seoMetrics)
      .where(eq(seoMetrics.projectId, projectId))
      .orderBy(desc(seoMetrics.measuredAt))
      .limit(limit);

    return metrics;
  }

  /**
   * Get project metrics with organizationId check
   * This method should be used when organizationId validation is required
   */
  async getProjectMetricsWithOrg(
    projectId: string,
    organizationId: string,
    limit: number = 10,
  ) {
    // First verify project belongs to organization
    const [project] = await db
      .select()
      .from(seoProjects)
      .where(and(
        eq(seoProjects.id, projectId),
        eq(seoProjects.organizationId, organizationId)
      ))
      .limit(1);

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return this.getProjectMetrics(projectId, limit);
  }

  async getProjectTrends(projectId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Optimized query with date filter and proper ordering
    // Uses indexed columns: projectId (indexed) and measuredAt (indexed)
    const metrics = await db
      .select()
      .from(seoMetrics)
      .where(
        and(
          eq(seoMetrics.projectId, projectId),
          gte(seoMetrics.measuredAt, startDate) // Use indexed column for date filter
        )
      )
      .orderBy(seoMetrics.measuredAt); // Order by indexed column

    // Calculate trends
    const trends = this.calculateTrends(metrics);
    
    return {
      projectId,
      period: `${days} days`,
      metrics,
      trends,
    };
  }

  /**
   * Get project trends with organizationId check
   * This method should be used when organizationId validation is required
   */
  async getProjectTrendsWithOrg(
    projectId: string,
    organizationId: string,
    days: number = 30,
  ) {
    // First verify project belongs to organization
    const [project] = await db
      .select()
      .from(seoProjects)
      .where(and(
        eq(seoProjects.id, projectId),
        eq(seoProjects.organizationId, organizationId)
      ))
      .limit(1);

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return this.getProjectTrends(projectId, days);
  }

  private calculateTrends(metrics: SeoMetricRow[]): MetricTrendSummary | null {
    if (metrics.length < 2) {
      return null;
    }

    const latest = metrics[metrics.length - 1]!;
    const previous = metrics[metrics.length - 2]!;

    const calculateTrend = (current: number | string | null | undefined, prev: number | string | null | undefined): MetricTrend => {
      const currentValue = typeof current === 'string' ? Number.parseFloat(current) : current ?? null;
      const previousValue = typeof prev === 'string' ? Number.parseFloat(prev) : prev ?? null;

      if (currentValue === null || previousValue === null) {
        return {
          current: currentValue,
          previous: previousValue,
          change: null,
          changePercent: null,
        };
      }

      const change = currentValue - previousValue;
      const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : null;

      return {
        current: currentValue,
        previous: previousValue,
        change,
        changePercent,
      };
    };

    return {
      performance: calculateTrend(latest.performance, previous.performance),
      accessibility: calculateTrend(latest.accessibility, previous.accessibility),
      seo: calculateTrend(latest.seo, previous.seo),
    };
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      seoLogger.info('SEO Analyzer cleaned up');
    }
  }
}

// Singleton instance
export const seoAnalyzer = new SeoAnalyzer();
