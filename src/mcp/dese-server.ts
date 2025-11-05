import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "@/utils/logger.js";
import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate, optionalAuth } from "@/middleware/auth.js";
import { redis } from "@/services/storage/redisClient.js";
import { config } from "@/config/index.js";

/**
 * Dese MCP Server
 * Port: 5557
 * Endpoint: /dese
 * Purpose: Model Context Protocol server for Dese AIOps module
 */

const app = express();
const PORT = process.env.DESE_MCP_PORT || 5557;
const BACKEND_BASE = process.env.BACKEND_URL || `http://localhost:${config.port}`;

app.use(express.json());

// Rate limiting for MCP endpoints
const mcpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all MCP endpoints
app.use("/dese", mcpRateLimit);

// Authentication middleware (optional for health check, required for others)
app.use("/dese", optionalAuth);

/**
 * GET /dese/health
 * Health check endpoint
 */
app.get("/dese/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "dese-mcp",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /dese/query
 * MCP query endpoint for Dese context
 * Requires authentication
 */
app.post(
  "/dese/query",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { query, context } = req.body;

    logger.info("Dese MCP query received", {
      query,
      contextType: context?.type,
    });

    // Cache key
    const cacheKey = `mcp:dese:query:${JSON.stringify(req.body)}`;
    
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info("Dese MCP query served from cache", { query });
      return res.json(JSON.parse(cached));
    }

    try {
      // Fetch real AIOps data from backend
      let aiopsData: unknown = null;
      let metricsData: unknown = null;

      try {
        // Fetch AIOps telemetry data
        const aiopsResponse = await fetch(`${BACKEND_BASE}/api/v1/aiops/collect`, {
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.authorization && { Authorization: req.headers.authorization }),
          },
        });
        
        if (aiopsResponse.ok) {
          aiopsData = await aiopsResponse.json();
        }
      } catch (error) {
        logger.warn("Failed to fetch AIOps data", {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      try {
        // Fetch metrics
        const metricsResponse = await fetch(`${BACKEND_BASE}/metrics`, {
          headers: {
            "Accept": "text/plain",
          },
        });
        
        if (metricsResponse.ok) {
          const metricsText = await metricsResponse.text();
          metricsData = metricsText;
        }
      } catch (error) {
        logger.warn("Failed to fetch metrics data", {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      const response = {
        query,
        response: {
          module: "dese",
          version: "v6.8.0",
          context: {
            aiops: aiopsData || context?.aiops || {},
            anomalies: context?.anomalies || [],
            correlations: context?.correlations || [],
            predictions: context?.predictions || [],
            metrics: metricsData || null,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            source: "dese-mcp-server",
            cached: false,
            backendConnected: aiopsData !== null || metricsData !== null,
          },
        },
      };

      // Cache response (60 seconds TTL)
      await redis.setex(cacheKey, 60, JSON.stringify(response));

      res.json(response);
    } catch (error) {
      logger.error("Dese MCP query error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  })
);

/**
 * GET /dese/context
 * Get Dese module context
 * Requires authentication
 */
app.get(
  "/dese/context",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = "mcp:dese:context";
    
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const context = {
      module: "dese",
      version: "v6.8.0",
      endpoints: [
        "/api/v1/aiops/collect",
        "/api/v1/aiops/health",
        "/api/v1/aiops/anomalies",
        "/api/v1/aiops/correlation",
        "/api/v1/aiops/predict",
        "/api/v1/audit",
        "/api/v1/privacy",
        "/metrics",
      ],
      metrics: [
        "aiops_anomalies_detected_total",
        "aiops_correlations_matched_total",
        "aiops_predictions_generated_total",
        "http_requests_total",
        "http_request_duration_seconds",
      ],
      streams: ["dese.events", "dese.alerts"],
      backendUrl: BACKEND_BASE,
      timestamp: new Date().toISOString(),
    };

    // Cache context (5 minutes TTL)
    await redis.setex(cacheKey, 300, JSON.stringify(context));

    res.json(context);
  })
);

// Error handler
app.use((err: Error, req: Request, res: Response, next: Function) => {
  logger.error("Dese MCP server error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
  });
  
  res.status(500).json({
    error: "internal_error",
    message: "Failed to process Dese MCP request",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Dese MCP Server started`, {
    port: PORT,
    endpoint: `/dese`,
    version: "1.0.0",
    backendUrl: BACKEND_BASE,
  });
});

export default app;
