import express, { Request, Response } from 'express';
import { logger } from '@/utils/logger.js';

/**
 * Observability MCP Server
 * Port: 5558
 * Endpoint: /observability
 * Purpose: Model Context Protocol server for Observability and Metrics module
 */

const app = express();
const PORT = 5558;

app.use(express.json());

/**
 * GET /observability/health
 * Health check endpoint
 */
app.get('/observability/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'observability-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /observability/query
 * MCP query endpoint for Observability context
 */
app.post('/observability/query', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;

    logger.info('Observability MCP query received', {
      query,
      contextType: context?.type,
    });

    // Observability context response
    const response = {
      query,
      response: {
        module: 'observability',
        version: 'v1.0.0',
        context: {
          metrics: context?.metrics || {},
          prometheus: context?.prometheus || {},
          grafana: context?.grafana || {},
          logs: context?.logs || [],
          traces: context?.traces || [],
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'observability-mcp-server',
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Observability MCP query error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to process Observability MCP query',
    });
  }
});

/**
 * GET /observability/context
 * Get Observability module context
 */
app.get('/observability/context', async (req: Request, res: Response) => {
  try {
    const context = {
      module: 'observability',
      version: 'v1.0.0',
      endpoints: [
        '/metrics',
        '/metrics/aiops',
        '/api/v1/metrics',
        '/api/v1/metrics/realtime',
        '/api/v1/aiops',
        '/api/v1/aiops/anomalies',
        '/api/v1/aiops/correlation',
      ],
      metrics: [
        'http_request_total',
        'http_request_duration_seconds',
        'aiops_anomalies_detected_total',
        'aiops_correlations_matched_total',
        'aiops_predictions_generated_total',
        'prometheus_metrics_scraped_total',
      ],
      streams: ['observability.metrics', 'observability.logs', 'observability.traces'],
      prometheus: {
        endpoint: 'http://localhost:3000/metrics',
        scrapeInterval: '15s',
      },
      grafana: {
        dashboards: [
          'dashboard-aiops-health.json',
          'dashboard-predictive-risk.json',
          'dashboard-seo-drift.json',
        ],
      },
      timestamp: new Date().toISOString(),
    };

    res.json(context);
  } catch (error) {
    logger.error('Observability MCP context error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get Observability context',
    });
  }
});

/**
 * GET /observability/metrics
 * Get current metrics status
 */
app.get('/observability/metrics', async (req: Request, res: Response) => {
  try {
    const metricsStatus = {
      metrics: 'ok',
      timestamp: new Date().toISOString(),
      prometheus: {
        endpoint: 'http://localhost:3000/metrics',
        status: 'available',
      },
      aiops: {
        endpoint: 'http://localhost:3000/metrics/aiops',
        status: 'available',
      },
      realtime: {
        endpoint: 'http://localhost:3000/api/v1/metrics/realtime',
        status: 'available',
      },
    };

    res.json(metricsStatus);
  } catch (error) {
    logger.error('Observability metrics status error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get metrics status',
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Observability MCP Server started`, {
    port: PORT,
    endpoint: `/observability`,
    version: '1.0.0',
  });
});

export default app;

