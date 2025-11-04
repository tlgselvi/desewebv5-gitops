import { Router } from 'express';
import { z } from 'zod';
import { db, seoMetrics, seoProjects, generatedContent, seoAlerts } from '@/db/index.js';
import { eq, desc, gte, sql, and } from 'drizzle-orm';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth.js';
import { logger, analyticsLogger } from '@/utils/logger.js';
import { requireProjectAccess } from '@/utils/projectAccess.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Validation schemas
const AnalyticsQuerySchema = z.object({
  projectId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metric: z.enum(['performance', 'accessibility', 'seo', 'bestPractices']).optional(),
});

const DashboardQuerySchema = z.object({
  projectId: z.string().uuid(),
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
});

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get project dashboard data
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectId:
 *                   type: string
 *                   format: uuid
 *                 period:
 *                   type: string
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalAnalyses:
 *                       type: integer
 *                     avgPerformance:
 *                       type: number
 *                     avgAccessibility:
 *                       type: number
 *                     avgSeo:
 *                       type: number
 *                     avgBestPractices:
 *                       type: number
 *                     contentGenerated:
 *                       type: integer
 *                     activeAlerts:
 *                       type: integer
 *                 trends:
 *                   type: object
 *                   properties:
 *                     performance:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         previous:
 *                           type: number
 *                         change:
 *                           type: number
 *                         changePercent:
 *                           type: number
 *                     accessibility:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         previous:
 *                           type: number
 *                         change:
 *                           type: number
 *                         changePercent:
 *                           type: number
 *                     seo:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: number
 *                         previous:
 *                           type: number
 *                         change:
 *                           type: number
 *                         changePercent:
 *                           type: number
 *                 recentMetrics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SeoMetrics'
 *                 recentContent:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       contentType:
 *                         type: string
 *                       eEatScore:
 *                         type: number
 *                       qualityScore:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       type:
 *                         type: string
 *                       severity:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       isResolved:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Validation error
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { projectId, period } = DashboardQuerySchema.parse(req.query);

  // Verify project access
  const access = await requireProjectAccess(authenticatedReq, projectId);
  if (!access.hasAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this project',
    });
  }

  // Calculate date range
  const now = new Date();
  const periodDays = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  }[period];

  const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  analyticsLogger.info('Generating dashboard data', {
    projectId,
    period,
    startDate: startDate.toISOString(),
  });

  // Get overview metrics
  const overview = await db
    .select({
      totalAnalyses: sql<number>`count(*)`,
      avgPerformance: sql<number>`avg(${seoMetrics.performance})`,
      avgAccessibility: sql<number>`avg(${seoMetrics.accessibility})`,
      avgSeo: sql<number>`avg(${seoMetrics.seo})`,
      avgBestPractices: sql<number>`avg(${seoMetrics.bestPractices})`,
    })
    .from(seoMetrics)
    .where(
      sql`${seoMetrics.projectId} = ${projectId} AND ${seoMetrics.measuredAt} >= ${startDate}`
    );

  // Get content count
  const contentCount = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(generatedContent)
    .where(
      sql`${generatedContent.projectId} = ${projectId} AND ${generatedContent.createdAt} >= ${startDate}`
    );

  // Get active alerts count
  const alertsCount = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(seoAlerts)
    .where(
      sql`${seoAlerts.projectId} = ${projectId} AND ${seoAlerts.isResolved} = false`
    );

  // Get recent metrics
  const recentMetrics = await db
    .select()
    .from(seoMetrics)
    .where(eq(seoMetrics.projectId, projectId))
    .orderBy(desc(seoMetrics.measuredAt))
    .limit(10);

  // Get recent content
  const recentContent = await db
    .select({
      id: generatedContent.id,
      title: generatedContent.title,
      contentType: generatedContent.contentType,
      eEatScore: generatedContent.eEatScore,
      qualityScore: generatedContent.qualityScore,
      createdAt: generatedContent.createdAt,
    })
    .from(generatedContent)
    .where(eq(generatedContent.projectId, projectId))
    .orderBy(desc(generatedContent.createdAt))
    .limit(5);

  // Get recent alerts
  const alerts = await db
    .select({
      id: seoAlerts.id,
      type: seoAlerts.type,
      severity: seoAlerts.severity,
      title: seoAlerts.title,
      description: seoAlerts.description,
      isResolved: seoAlerts.isResolved,
      createdAt: seoAlerts.createdAt,
    })
    .from(seoAlerts)
    .where(eq(seoAlerts.projectId, projectId))
    .orderBy(desc(seoAlerts.createdAt))
    .limit(10);

  // Calculate trends (compare current period with previous period)
  const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  const currentPeriodMetrics = await db
    .select({
      avgPerformance: sql<number>`avg(${seoMetrics.performance})`,
      avgAccessibility: sql<number>`avg(${seoMetrics.accessibility})`,
      avgSeo: sql<number>`avg(${seoMetrics.seo})`,
    })
    .from(seoMetrics)
    .where(
      sql`${seoMetrics.projectId} = ${projectId} AND ${seoMetrics.measuredAt} >= ${startDate}`
    );

  const previousPeriodMetrics = await db
    .select({
      avgPerformance: sql<number>`avg(${seoMetrics.performance})`,
      avgAccessibility: sql<number>`avg(${seoMetrics.accessibility})`,
      avgSeo: sql<number>`avg(${seoMetrics.seo})`,
    })
    .from(seoMetrics)
    .where(
      sql`${seoMetrics.projectId} = ${projectId} AND ${seoMetrics.measuredAt} >= ${previousStartDate} AND ${seoMetrics.measuredAt} < ${startDate}`
    );

  const current = currentPeriodMetrics[0] || { avgPerformance: 0, avgAccessibility: 0, avgSeo: 0 };
  const previous = previousPeriodMetrics[0] || { avgPerformance: 0, avgAccessibility: 0, avgSeo: 0 };

  const trends = {
    performance: {
      current: current.avgPerformance || 0,
      previous: previous.avgPerformance || 0,
      change: (current.avgPerformance || 0) - (previous.avgPerformance || 0),
      changePercent: previous.avgPerformance 
        ? ((current.avgPerformance || 0) - (previous.avgPerformance || 0)) / previous.avgPerformance * 100
        : 0,
    },
    accessibility: {
      current: current.avgAccessibility || 0,
      previous: previous.avgAccessibility || 0,
      change: (current.avgAccessibility || 0) - (previous.avgAccessibility || 0),
      changePercent: previous.avgAccessibility 
        ? ((current.avgAccessibility || 0) - (previous.avgAccessibility || 0)) / previous.avgAccessibility * 100
        : 0,
    },
    seo: {
      current: current.avgSeo || 0,
      previous: previous.avgSeo || 0,
      change: (current.avgSeo || 0) - (previous.avgSeo || 0),
      changePercent: previous.avgSeo 
        ? ((current.avgSeo || 0) - (previous.avgSeo || 0)) / previous.avgSeo * 100
        : 0,
    },
  };

  const dashboard = {
    projectId,
    period,
    overview: {
      totalAnalyses: overview[0]?.totalAnalyses || 0,
      avgPerformance: Math.round(overview[0]?.avgPerformance || 0),
      avgAccessibility: Math.round(overview[0]?.avgAccessibility || 0),
      avgSeo: Math.round(overview[0]?.avgSeo || 0),
      avgBestPractices: Math.round(overview[0]?.avgBestPractices || 0),
      contentGenerated: contentCount[0]?.count || 0,
      activeAlerts: alertsCount[0]?.count || 0,
    },
    trends,
    recentMetrics,
    recentContent,
    alerts,
  };

  res.json(dashboard);
}));

/**
 * @swagger
 * /analytics/metrics:
 *   get:
 *     summary: Get detailed metrics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [performance, accessibility, seo, bestPractices]
 *     responses:
 *       200:
 *         description: Detailed metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SeoMetrics'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     average:
 *                       type: number
 *                     min:
 *                       type: number
 *                     max:
 *                       type: number
 *                     trend:
 *                       type: string
 *                       enum: [up, down, stable]
 *       400:
 *         description: Validation error
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { projectId, startDate, endDate, metric } = AnalyticsQuerySchema.parse(req.query);

  // Verify project access
  const access = await requireProjectAccess(authenticatedReq, projectId);
  if (!access.hasAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this project',
    });
  }

  const conditions = [eq(seoMetrics.projectId, projectId)];
  
  if (startDate) {
    conditions.push(gte(seoMetrics.measuredAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(sql`${seoMetrics.measuredAt} <= ${new Date(endDate)}`);
  }

  const query = db
    .select()
    .from(seoMetrics)
    .where(and(...conditions));

  const metrics = await query.orderBy(desc(seoMetrics.measuredAt));

  // Calculate summary statistics
  const metricKey = (metric || 'performance') as keyof typeof metrics[0];
  const values = metrics.map(m => {
    const value = m[metricKey];
    return typeof value === 'number' ? value : null;
  }).filter((v): v is number => v !== null);

  const summary = {
    count: values.length,
    average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    trend: values.length >= 2 
      ? values[0] > values[values.length - 1] ? 'up' : values[0] < values[values.length - 1] ? 'down' : 'stable'
      : 'stable',
  };

  res.json({ metrics, summary });
}));

export { router as analyticsRoutes };
