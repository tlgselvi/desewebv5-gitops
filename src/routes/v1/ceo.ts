import { Router, Request, Response } from 'express';
import { financeService } from '@/modules/finance/service.js';
import { iotService } from '@/modules/iot/service.js';
import { jarvisService } from '@/services/ai/jarvis.js';
import { authenticate, RequestWithUser } from '@/middleware/auth.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router: Router = Router();

// Apply RLS middleware to all CEO routes for tenant isolation
router.use(authenticate);
router.use(setRLSContextMiddleware);

/**
 * @swagger
 * tags:
 *   name: CEO
 *   description: CEO Dashboard - Aggregated Business Metrics and KPIs
 */

/**
 * @swagger
 * /api/v1/ceo/home:
 *   get:
 *     summary: Get CEO Dashboard Home (KPIs and Overview)
 *     tags: [CEO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orgId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID (optional, uses token orgId by default)
 *     responses:
 *       200:
 *         description: Dashboard home data with KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kpis:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recentActivities:
 *                   type: array
 *                 activeEvent:
 *                   type: object
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/ceo/summary:
 *   get:
 *     summary: Get CEO Dashboard Summary (Detailed Metrics)
 *     tags: [CEO]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orgId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID (optional, uses token orgId by default)
 *     responses:
 *       200:
 *         description: Detailed dashboard summary with finance, IoT, and AI predictions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 finance:
 *                   type: object
 *                 system:
 *                   type: object
 *                 iot:
 *                   type: object
 *                 ai:
 *                   type: object
 *                   properties:
 *                     prediction:
 *                       type: object
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Home dashboard endpoint (alias for /summary for frontend compatibility)
router.get('/home', asyncHandler(async (req: Request, res: Response) => {
  // Redirect to summary logic
  const reqWithUser = req as RequestWithUser;
  const organizationId = reqWithUser.user?.organizationId;

  if (!organizationId) {
    if (reqWithUser.user?.role === 'admin' && typeof req.query.orgId === 'string') {
      // Use query param
    } else {
      res.status(400).json({ error: 'Organization ID required' });
      return;
    }
  }

  const targetOrgId = organizationId || (req.query.orgId as string);

  const financialData = await financeService.getFinancialSummary(targetOrgId);
  const iotMetrics = await iotService.getLatestMetrics(targetOrgId);
  
  // Prepare history for AI prediction
  const history = financialData.monthlyRevenue?.map((month: { name: string; total: number }) => ({
    month: month.name,
    revenue: month.total,
  })) || [];
  
  const prediction = await jarvisService.predictFinancials(history);

  // Format as HomeDashboardDto
  res.json({
    kpis: [
      {
        title: "Toplam Gelir",
        value: financialData.totalRevenue?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || "0 ₺",
        description: "Bu ay",
        icon: "TrendingUp",
        trend: { value: 0, direction: "neutral" as const },
        variant: "primary" as const,
      },
      {
        title: "Toplam Gider",
        value: financialData.totalExpenses?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || "0 ₺",
        description: "Bu ay",
        icon: "TrendingDown",
        trend: { value: 0, direction: "neutral" as const },
        variant: "default" as const,
      },
      {
        title: "Net Kar",
        value: ((financialData.totalRevenue || 0) - (financialData.totalExpenses || 0)).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }),
        description: "Bu ay",
        icon: "BarChart3",
        trend: { value: 0, direction: "neutral" as const },
        variant: "success" as const,
      },
      {
        title: "Aktif Cihazlar",
        value: iotMetrics?.deviceCount?.toString() || "0",
        description: "IoT",
        icon: "Activity",
        trend: { value: 0, direction: "neutral" as const },
        variant: "default" as const,
      },
    ],
    recentActivities: [],
    activeEvent: {
      title: "Sistem Aktif",
      description: "Tüm servisler çalışıyor",
      level: "info" as const,
    },
    generatedAt: new Date().toISOString(),
  });
}));

router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const reqWithUser = req as RequestWithUser;
  const organizationId = reqWithUser.user?.organizationId;

  if (!organizationId) {
    // For admins or testing, allow query param if not in token
    if (reqWithUser.user?.role === 'admin' && typeof req.query.orgId === 'string') {
       // Use query param
    } else {
       res.status(400).json({ error: 'Organization ID required' });
       return;
    }
  }

  // Use the org ID (or default if still missing for some reason, though auth middleware should handle)
  const targetOrgId = organizationId || (req.query.orgId as string);

  const financialData = await financeService.getFinancialSummary(targetOrgId);
  
  // Get Real IoT Metrics
  const iotMetrics = await iotService.getLatestMetrics(targetOrgId);
  
  // Get AI Predictions with real financial history
  // Prepare history from monthlyRevenue data for prediction
  const history = financialData.monthlyRevenue?.map((month: { name: string; total: number }) => ({
    month: month.name,
    revenue: month.total,
    timestamp: new Date().toISOString(), // Approximate timestamp
  })) || [];
  
  // If we have recent transactions, add them to history for better prediction
  if (financialData.recentTransactions && financialData.recentTransactions.length > 0) {
    history.push(...financialData.recentTransactions.map((tx: any) => ({
      date: tx.date,
      amount: parseFloat(tx.amount || '0'),
      description: tx.description,
    })));
  }
  
  // Get AI prediction with real data
  const prediction = await jarvisService.predictFinancials(history);

  res.json({
    finance: financialData,
    system: {
      uptime: 99.9,
      activeUsers: 127, // Mock
      openTickets: 3    // Mock
    },
    iot: iotMetrics,
    ai: {
      prediction: prediction
    }
  });
}));

export const ceoRouter = router;

