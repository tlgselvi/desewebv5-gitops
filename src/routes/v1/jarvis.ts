import { Router } from 'express';
import { jarvisService } from '@/services/ai/jarvis.js';
import { authenticate } from '@/middleware/auth.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /api/v1/jarvis/analyze-logs:
 *   post:
 *     summary: Analyze logs for root cause
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logs:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Analysis result
 */
router.post('/analyze-logs', authenticate, asyncHandler(async (req, res) => {
  const schema = z.object({
    logs: z.array(z.string())
  });
  
  const { logs } = schema.parse(req.body);
  const result = await jarvisService.analyzeLogs(logs);
  res.json(result);
}));

/**
 * @swagger
 * /api/v1/jarvis/predict-finance:
 *   post:
 *     summary: Predict future revenue
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Financial prediction
 */
router.post('/predict-finance', authenticate, asyncHandler(async (req, res) => {
  const { history } = req.body;
  const result = await jarvisService.predictFinancials(history || []);
  res.json(result);
}));

/**
 * @swagger
 * /api/v1/jarvis/score-lead:
 *   post:
 *     summary: Score a sales lead
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Lead score
 */
router.post('/score-lead', authenticate, asyncHandler(async (req, res) => {
  const { leadData } = req.body;
  const result = await jarvisService.scoreLead(leadData);
  res.json(result);
}));

export const jarvisRouter = router;

