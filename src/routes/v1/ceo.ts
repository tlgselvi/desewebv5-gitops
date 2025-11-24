import { Router } from 'express';
import { financeService } from '@/modules/finance/service.js';
import { authenticate } from '@/middleware/auth.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router = Router();

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
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  // In a real scenario, we would get the organizationId from the user's token or context
  // For now, we'll assume a default one or take it from the query if admin
  // const organizationId = req.user?.organizationId; 
  
  // Mock organization ID for MVP since multi-tenancy is just set up
  const organizationId = 'default-org-id'; 

  const financialData = await financeService.getFinancialSummary(organizationId);
  
  res.json({
    finance: financialData,
    system: {
      uptime: 99.9,
      activeUsers: 127, // Mock
      openTickets: 3    // Mock
    },
    iot: {
      poolTemp: 28.5,
      phLevel: 7.4,
      chlorine: 1.2
    }
  });
}));

export const ceoRouter = router;

