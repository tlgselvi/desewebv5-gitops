import express, { Request, Response } from 'express';
import { logger } from '@/utils/logger.js';

/**
 * FinBot MCP Server
 * Port: 5555
 * Endpoint: /finbot
 * Purpose: Model Context Protocol server for FinBot module
 */

const app = express();
const PORT = 5555;

app.use(express.json());

/**
 * GET /finbot/health
 * Health check endpoint
 */
app.get('/finbot/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'finbot-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /finbot/query
 * MCP query endpoint for FinBot context
 */
app.post('/finbot/query', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;

    logger.info('FinBot MCP query received', {
      query,
      contextType: context?.type,
    });

    // Simulated FinBot context response
    const response = {
      query,
      response: {
        module: 'finbot',
        version: 'v2.0',
        context: {
          accounts: context?.accounts || [],
          transactions: context?.transactions || [],
          budgets: context?.budgets || [],
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'finbot-mcp-server',
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('FinBot MCP query error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to process FinBot MCP query',
    });
  }
});

/**
 * GET /finbot/context
 * Get FinBot module context
 */
app.get('/finbot/context', async (req: Request, res: Response) => {
  try {
    const context = {
      module: 'finbot',
      version: 'v2.0',
      endpoints: [
        '/api/v1/finbot/accounts',
        '/api/v1/finbot/transactions',
        '/api/v1/finbot/budgets',
        '/api/v1/finbot/health',
      ],
      metrics: [
        'finbot_api_request_total',
        'finbot_api_request_duration_seconds',
      ],
      stream: 'finbot.events',
      timestamp: new Date().toISOString(),
    };

    res.json(context);
  } catch (error) {
    logger.error('FinBot MCP context error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get FinBot context',
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`FinBot MCP Server started`, {
    port: PORT,
    endpoint: `/finbot`,
    version: '1.0.0',
  });
});

export default app;

