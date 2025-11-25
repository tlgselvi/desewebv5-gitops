import { Router, Request, Response } from 'express';
import { financeService } from '@/modules/finance/service.js';
import { iotService } from '@/modules/iot/service.js';
import { jarvisService } from '@/services/ai/jarvis.js';
import { authenticate, RequestWithUser } from '@/middleware/auth.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router: Router = Router();

/**
 * @swagger
 * /api/v1/ceo/summary:
 *   get:
 *     summary: Get CEO Dashboard Summary
 *     tags: [CEO]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary metrics
 */
// Home dashboard endpoint (alias for /summary for frontend compatibility)
router.get('/home', authenticate, asyncHandler(async (req: Request, res: Response) => {
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
  const prediction = await jarvisService.predictFinancials([]);

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

router.get('/summary', authenticate, asyncHandler(async (req: Request, res: Response) => {
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
  
  // Get AI Predictions
  // In a real scenario, pass real history. For now, passing empty triggers mock/simple prediction.
  const prediction = await jarvisService.predictFinancials([]);

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

