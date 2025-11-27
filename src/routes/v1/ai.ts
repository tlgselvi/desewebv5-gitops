/**
 * AI Routes
 * 
 * Routes for RAG, Chat, Search, and Indexing services
 */

import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { getRAGService } from '@/services/ai/rag.service.js';
import { getChatService } from '@/services/ai/chat.service.js';
import { getIndexingService } from '@/services/ai/indexing.service.js';
import { getContentIndexerService } from '@/services/ai/content-indexer.service.js';
import { getSearchService } from '@/services/ai/search.service.js';
import { getRecommendationService } from '@/services/ai/recommendation.service.js';
import { getVectorClient } from '@/services/vector/index.js';
import type { Request, Response } from 'express';
import { z } from 'zod';

const router: ExpressRouter = Router();

// Request validation schemas
const ragQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  topK: z.number().int().min(1).max(50).optional(),
  maxTokens: z.number().int().min(100).max(8000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  filter: z.record(z.unknown()).optional(),
});

const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  context: z.record(z.unknown()).optional(),
});

const indexDocumentSchema = z.object({
  content: z.string().min(1),
  sourceType: z.enum(['database', 'file', 'api', 'user_content']),
  sourceId: z.string().optional(),
  sourceTypeDetail: z.string().optional(),
  chunkSize: z.number().int().min(100).max(2000).optional(),
  chunkOverlap: z.number().int().min(0).max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/v1/ai/rag/query
 * RAG query endpoint
 */
router.post(
  '/rag/query',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const body = ragQuerySchema.parse(req.body);

    const ragService = getRAGService();
    const response = await ragService.query({
      query: body.query,
      organizationId: user.organizationId || '',
      topK: body.topK,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      filter: body.filter as any,
    });

    res.json(response);
  }),
);

/**
 * POST /api/v1/ai/chat/message
 * Send chat message
 */
router.post(
  '/chat/message',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const body = chatMessageSchema.parse(req.body);

    const chatService = getChatService();
    const response = await chatService.sendMessage({
      message: body.message,
      sessionId: body.sessionId,
      organizationId: user.organizationId || '',
      userId: user.id,
      context: body.context,
    });

    res.json(response);
  }),
);

/**
 * GET /api/v1/ai/chat/history/:sessionId
 * Get conversation history
 */
router.get(
  '/chat/history/:sessionId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { sessionId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const chatService = getChatService();
    const history = await chatService.getConversationHistory(
      sessionId,
      user.organizationId || '',
      user.id,
      limit,
    );

    res.json({ history });
  }),
);

/**
 * DELETE /api/v1/ai/chat/history/:sessionId
 * Delete conversation history
 */
router.delete(
  '/chat/history/:sessionId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { sessionId } = req.params;

    const chatService = getChatService();
    await chatService.deleteConversationHistory(
      sessionId,
      user.organizationId || '',
      user.id,
    );

    res.json({ success: true });
  }),
);

/**
 * GET /api/v1/ai/chat/sessions
 * List user's chat sessions
 */
router.get(
  '/chat/sessions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    const chatService = getChatService();
    const sessions = await chatService.listSessions(
      user.organizationId || '',
      user.id,
    );

    res.json({ sessions });
  }),
);

/**
 * POST /api/v1/ai/search/semantic
 * Semantic search endpoint (enhanced)
 */
router.post(
  '/search/semantic',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { query, topK, filter, useRAG, minScore } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const searchService = getSearchService();
    const response = await searchService.search({
      query,
      organizationId: user.organizationId || '',
      topK,
      filter,
      useRAG,
      minScore,
    });

    res.json(response);
  }),
);

/**
 * POST /api/v1/ai/recommendations
 * Get recommendations
 */
router.post(
  '/recommendations',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { itemType, limit, context } = req.body;

    if (!itemType) {
      return res.status(400).json({ error: 'itemType is required' });
    }

    const recommendationService = getRecommendationService();
    const response = await recommendationService.getRecommendations({
      userId: user.id,
      organizationId: user.organizationId || '',
      itemType,
      limit,
      context,
    });

    res.json(response);
  }),
);

/**
 * GET /api/v1/ai/recommendations/similar/:itemId
 * Get similar items
 */
router.get(
  '/recommendations/similar/:itemId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { itemId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    const recommendationService = getRecommendationService();
    const recommendations = await recommendationService.getSimilarItems(
      itemId,
      user.organizationId || '',
      limit,
    );

    res.json({ recommendations });
  }),
);

/**
 * POST /api/v1/ai/index/document
 * Index a document
 */
router.post(
  '/index/document',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const body = indexDocumentSchema.parse(req.body);

    const indexingService = getIndexingService();
    const result = await indexingService.indexDocument(body.content, {
      organizationId: user.organizationId || '',
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      sourceTypeDetail: body.sourceTypeDetail,
      chunkSize: body.chunkSize,
      chunkOverlap: body.chunkOverlap,
      metadata: body.metadata,
    });

    res.json(result);
  }),
);

/**
 * POST /api/v1/ai/index/finance
 * Index finance module content
 */
router.post(
  '/index/finance',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { includeInvoices, includeAccounts } = req.body;

    const contentIndexer = getContentIndexerService();
    const result = await contentIndexer.indexFinanceContent(user.organizationId || '', {
      includeInvoices,
      includeAccounts,
    });

    res.json(result);
  }),
);

/**
 * POST /api/v1/ai/index/crm
 * Index CRM module content
 */
router.post(
  '/index/crm',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { includeContacts, includeDeals } = req.body;

    const contentIndexer = getContentIndexerService();
    const result = await contentIndexer.indexCrmContent(user.organizationId || '', {
      includeContacts,
      includeDeals,
    });

    res.json(result);
  }),
);

/**
 * POST /api/v1/ai/index/inventory
 * Index inventory module content
 */
router.post(
  '/index/inventory',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { includeProducts } = req.body;

    const contentIndexer = getContentIndexerService();
    const result = await contentIndexer.indexInventoryContent(user.organizationId || '', {
      includeProducts,
    });

    res.json(result);
  }),
);

/**
 * GET /api/v1/ai/vector/health
 * Vector DB health check
 */
router.get(
  '/vector/health',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const vectorClient = await getVectorClient();
    const healthy = await vectorClient.healthCheck();

    res.json({
      healthy,
      provider: process.env.VECTOR_DB_PROVIDER || 'not configured',
      timestamp: new Date().toISOString(),
    });
  }),
);

export { router as aiRouter };

