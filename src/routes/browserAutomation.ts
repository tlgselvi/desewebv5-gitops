import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '@/utils/logger.js';
import { browserAutomation } from '@/services/browserAutomation.js';
import { authenticate } from '@/middleware/auth.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/v1/browser-automation/status:
 *   get:
 *     summary: Get browser automation service status
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Browser automation service status
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chromeAvailable = await browserAutomation.checkChromeAvailability();
    const connections = browserAutomation.listConnections();

    res.json({
      status: 'operational',
      chromeAvailable,
      connections: connections.length,
      activeConnections: connections.filter(c => c.status === 'connected').length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/connect:
 *   post:
 *     summary: Connect to browser via CDP
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cdpUrl:
 *                 type: string
 *                 example: "ws://127.0.0.1:9222/devtools/browser/..."
 *               browserType:
 *                 type: string
 *                 enum: [chrome, chromium, edge]
 *                 default: chrome
 *     responses:
 *       200:
 *         description: CDP connection established
 *       400:
 *         description: Invalid CDP URL
 */
router.post('/connect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      cdpUrl: z.string().url('Invalid CDP connection URL'),
      browserType: z.enum(['chrome', 'chromium', 'edge']).optional().default('chrome'),
    });

    const { cdpUrl, browserType } = schema.parse(req.body);

    const connection = await browserAutomation.connectCDP(cdpUrl, browserType);

    logger.info('CDP connection established via API', {
      connectionId: connection.id,
      userId: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      connection,
    });
  } catch (error: any) {
    logger.error('CDP connection failed', { error: error.message });
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/launch:
 *   post:
 *     summary: Launch a new browser instance
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               headless:
 *                 type: boolean
 *                 default: true
 *               args:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Browser launched successfully
 */
router.post('/launch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      headless: z.boolean().optional().default(true),
      args: z.array(z.string()).optional(),
    });

    const options = schema.parse(req.body);

    const connection = await browserAutomation.launchBrowser(options);

    logger.info('Browser launched via API', {
      connectionId: connection.id,
      userId: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      connection,
    });
  } catch (error: any) {
    logger.error('Browser launch failed', { error: error.message });
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/connections:
 *   get:
 *     summary: List all browser connections
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of browser connections
 */
router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connections = browserAutomation.listConnections();

    res.json({
      success: true,
      connections,
      count: connections.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/connections/:connectionId:
 *   get:
 *     summary: Get connection details
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: connectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection details
 *       404:
 *         description: Connection not found
 */
router.get('/connections/:connectionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { connectionId } = req.params;

    const connection = browserAutomation.getConnection(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
      });
    }

    res.json({
      success: true,
      connection,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/pages:
 *   post:
 *     summary: Create a new page
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               connectionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Page created successfully
 */
router.post('/pages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      connectionId: z.string(),
    });

    const { connectionId } = schema.parse(req.body);

    const pageId = await browserAutomation.createPage(connectionId);

    res.status(200).json({
      success: true,
      pageId,
    });
  } catch (error: any) {
    logger.error('Page creation failed', { error: error.message });
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/pages/:pageId/cdp-session:
 *   post:
 *     summary: Create CDP session for a page
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CDP session created
 */
router.post('/pages/:pageId/cdp-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pageId } = req.params;

    const sessionId = await browserAutomation.createCDPSession(pageId);

    res.status(200).json({
      success: true,
      sessionId,
    });
  } catch (error: any) {
    logger.error('CDP session creation failed', { error: error.message });
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/pages/:pageId/action:
 *   post:
 *     summary: Execute browser action
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [navigate, screenshot, evaluate, click, type, wait]
 *               params:
 *                 type: object
 *     responses:
 *       200:
 *         description: Action executed successfully
 */
router.post('/pages/:pageId/action', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pageId } = req.params;
    const schema = z.object({
      action: z.enum(['navigate', 'screenshot', 'evaluate', 'click', 'type', 'wait']),
      params: z.record(z.any()).optional(),
    });

    const { action, params } = schema.parse(req.body);

    const result = await browserAutomation.executeAction(pageId, action, params || {});

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('Browser action failed', { error: error.message });
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/cdp-sessions/:sessionId/command:
 *   post:
 *     summary: Send CDP command
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method:
 *                 type: string
 *               params:
 *                 type: object
 *     responses:
 *       200:
 *         description: CDP command executed successfully
 */
router.post('/cdp-sessions/:sessionId/command', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const schema = z.object({
      method: z.string(),
      params: z.record(z.any()).optional(),
    });

    const { method, params } = schema.parse(req.body);

    const result = await browserAutomation.sendCDPCommand(sessionId, method, params || {});

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('CDP command failed', { error: error.message });
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/browser-automation/connections/:connectionId/disconnect:
 *   post:
 *     summary: Disconnect browser
 *     tags: [Browser Automation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: connectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Browser disconnected successfully
 */
router.post('/connections/:connectionId/disconnect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { connectionId } = req.params;

    await browserAutomation.disconnect(connectionId);

    logger.info('Browser disconnected via API', {
      connectionId,
      userId: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      message: 'Browser disconnected successfully',
    });
  } catch (error: any) {
    logger.error('Browser disconnection failed', { error: error.message });
    next(error);
  }
});

export { router as browserAutomationRoutes };

