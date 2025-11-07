import express, { Request, Response, NextFunction } from "express";
import type { Application } from "express";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import { logger } from "@/utils/logger.js";
import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate, optionalAuth } from "@/middleware/auth.js";
import { redis } from "@/services/storage/redisClient.js";
import { config } from "@/config/index.js";
import { initializeMCPWebSocket, pushContextUpdate } from "./websocket-server.js";

/**
 * FinBot MCP Server
 * Port: 5555
 * Endpoint: /finbot
 * Purpose: Model Context Protocol server for FinBot module
 */

const app: Application = express();
const PORT = Number(process.env.FINBOT_MCP_PORT ?? 5555);
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
app.use("/finbot", mcpRateLimit);

// Authentication middleware (optional for health check, required for others)
app.use("/finbot", optionalAuth);

/**
 * GET /finbot/health
 * Health check endpoint
 */
app.get("/finbot/health", (req: Request, res: Response) => {
  return res.json({
    status: "healthy",
    service: "finbot-mcp",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /finbot/query
 * MCP query endpoint for FinBot context
 * Requires authentication
 */
app.post(
  "/finbot/query",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { query, context } = req.body;

    logger.info("FinBot MCP query received", {
      query,
      contextType: context?.type,
    });

    // Cache key
    const cacheKey = `mcp:finbot:query:${JSON.stringify(req.body)}`;
    
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info("FinBot MCP query served from cache", { query });
      return res.json(JSON.parse(cached));
    }

    try {
      // Try to fetch real data from backend analytics (closest to FinBot data)
      let analyticsData: unknown = null;
      let metricsData: unknown = null;

      try {
        // Fetch analytics data (projects, metrics)
        const analyticsResponse = await fetch(`${BACKEND_BASE}/api/v1/analytics/dashboard`, {
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.authorization && { Authorization: req.headers.authorization }),
          },
        });
        
        if (analyticsResponse.ok) {
          analyticsData = await analyticsResponse.json();
        }
      } catch (error) {
        logger.warn("Failed to fetch analytics data", {
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
          module: "finbot",
          version: "v2.0",
          context: {
            accounts: context?.accounts || [],
            transactions: context?.transactions || [],
            budgets: context?.budgets || [],
            analytics: analyticsData || null,
            metrics: metricsData || null,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            source: "finbot-mcp-server",
            cached: false,
            backendConnected: analyticsData !== null || metricsData !== null,
          },
        },
      };

      // Cache response (60 seconds TTL)
      await redis.setex(cacheKey, 60, JSON.stringify(response));

      // Push context update to WebSocket subscribers
      await pushContextUpdate("finbot", "analytics", response.response.context);

      return res.json(response);
    } catch (error) {
      logger.error("FinBot MCP query error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  })
);

/**
 * GET /finbot/context
 * Get FinBot module context
 * Requires authentication
 */
app.get(
  "/finbot/context",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = "mcp:finbot:context";
    
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const context = {
      module: "finbot",
        version: "v6.8.1",
      version: "v6.8.1",
      endpoints: [
        "/api/v1/analytics/dashboard",
        "/api/v1/analytics/projects",
        "/metrics",
        "/api/v1/finbot/health",
      ],
      metrics: [
        "http_requests_total",
        "http_request_duration_seconds",
        "finbot_api_request_total",
        "finbot_api_request_duration_seconds",
      ],
      stream: "finbot.events",
      backendUrl: BACKEND_BASE,
      timestamp: new Date().toISOString(),
    };

    // Cache context (5 minutes TTL)
    await redis.setex(cacheKey, 300, JSON.stringify(context));

    return res.json(context);
  })
);

/**
 * POST /finbot/correlation/run
 * Correlation AI endpoint
 * Requires authentication
 */
app.post(
  "/finbot/correlation/run",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info("Correlation AI run requested", {
      body: req.body,
    });

    try {
      // Try to call AIOps correlation endpoint if available
      let correlationResult: unknown = null;
      
      try {
        const correlationResponse = await fetch(`${BACKEND_BASE}/api/v1/aiops/collect`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(req.headers.authorization && { Authorization: req.headers.authorization }),
          },
        });
        
        if (correlationResponse.ok) {
          correlationResult = await correlationResponse.json();
        }
      } catch (error) {
        logger.warn("Failed to fetch correlation data", {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      res.json({
        status: "ok",
        correlation: correlationResult || "pending",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Correlation AI run error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  })
);

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error("FinBot MCP server error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
  });
  
  return res.status(500).json({
    error: "internal_error",
    message: "Failed to process FinBot MCP request",
    timestamp: new Date().toISOString(),
  });
});

// Create HTTP server for WebSocket support
const httpServer = createServer(app);

// Initialize WebSocket server
initializeMCPWebSocket("finbot", httpServer, PORT);

// Start server
httpServer.listen(PORT, () => {
  logger.info(`FinBot MCP Server started`, {
    port: PORT,
    endpoint: `/finbot`,
    wsEndpoint: `/finbot/ws`,
    version: "1.0.0",
    backendUrl: BACKEND_BASE,
  });
});

export default app;
