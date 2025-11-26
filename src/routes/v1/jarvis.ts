import { Router, type Router as ExpressRouter } from 'express';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { authenticate } from '@/middleware/auth.js';
import { jarvisService } from '@/services/ai/jarvis.js';
import { agentCommunication, AgentId } from '@/services/ai/agent-communication.js';
import type { Request, Response } from 'express';

const jarvisRouter: ExpressRouter = Router();

/**
 * GET /api/v1/jarvis/status
 * Get JARVIS service status
 */
jarvisRouter.get(
  '/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const status = {
      enabled: true,
      service: 'jarvis',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };

    res.json(status);
  })
);

/**
 * GET /api/v1/jarvis/agent-status
 * Get all agents status
 */
jarvisRouter.get(
  '/agent-status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const statuses = await jarvisService.getAllAgentsStatus();
    res.json({
      agents: statuses,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/jarvis/agent-status/:agentId
 * Get specific agent status
 */
jarvisRouter.get(
  '/agent-status/:agentId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    
    if (!agentId || !['finbot', 'mubot', 'salesbot', 'stockbot', 'hrbot', 'iotbot', 'seobot', 'servicebot', 'aiopsbot', 'procurementbot'].includes(agentId)) {
      return res.status(400).json({
        error: 'Invalid agent ID',
        validAgents: ['finbot', 'mubot', 'salesbot', 'stockbot', 'hrbot', 'iotbot', 'seobot', 'servicebot', 'aiopsbot', 'procurementbot'],
      });
    }

    const status = await jarvisService.getAgentStatus(agentId as AgentId);
    return res.json(status);
  })
);

/**
 * POST /api/v1/jarvis/ask
 * Ask JARVIS a question
 */
jarvisRouter.post(
  '/ask',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { question, context } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Question is required and must be a string',
      });
    }

    const answer = await jarvisService.answerUserQuestion(question, context);
    
    return res.json({
      question,
      answer,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/jarvis/daily-summary
 * Get daily summary
 */
jarvisRouter.get(
  '/daily-summary',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // For now, return a simple summary
    // TODO: Implement full daily summary generation
    const agentStatuses = await jarvisService.getAllAgentsStatus();
    
    const summary = {
      date: new Date().toISOString().split('T')[0],
      agents: agentStatuses,
      message: 'Günlük özet hazırlanıyor...',
      timestamp: new Date().toISOString(),
    };

    res.json(summary);
  })
);

/**
 * GET /api/v1/jarvis/streams
 * Get all agent streams info
 */
jarvisRouter.get(
  '/streams',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const streamsInfo = await agentCommunication.getAllStreamsInfo();
    res.json({
      streams: streamsInfo,
      timestamp: new Date().toISOString(),
    });
  })
);

export { jarvisRouter };
