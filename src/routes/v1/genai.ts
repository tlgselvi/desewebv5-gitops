import { Router, type Router as ExpressRouter } from 'express';
import { genAIAppBuilderService } from '@/services/ai/genai-app-builder.js';
import { authenticate } from '@/middleware/auth.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';
import type { Request, Response } from 'express';

const router: ExpressRouter = Router();

/**
 * @swagger
 * /api/v1/genai/status:
 *   get:
 *     summary: Get GenAI App Builder service status
 *     tags: [GenAI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GenAI service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 projectId:
 *                   type: string
 *                 location:
 *                   type: string
 *                 agentId:
 *                   type: string
 *                 dataStoreId:
 *                   type: string
 *                 searchEngineId:
 *                   type: string
 */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const status = genAIAppBuilderService.getStatus();
    res.json(status);
  })
);

/**
 * @swagger
 * /api/v1/genai/chat:
 *   post:
 *     summary: Chat with GenAI Agent
 *     tags: [GenAI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Chat response
 *       400:
 *         description: Invalid request
 *       503:
 *         description: GenAI service not available
 */
router.post(
  '/chat',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string',
      });
    }

    if (!genAIAppBuilderService.isEnabled()) {
      return res.status(503).json({
        error: 'GenAI App Builder is not enabled',
      });
    }

    try {
      const response = await genAIAppBuilderService.chat(
        [{ role: 'user', content: message }],
        context
      );

      logger.info('GenAI chat request processed', {
        userId: req.user?.id,
        messageLength: message.length,
      });

      return res.json(response);
    } catch (error) {
      logger.error('GenAI chat failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
      });
      return res.status(500).json({
        error: 'Failed to process chat request',
      });
    }
  })
);

export { router as genaiRoutes };

