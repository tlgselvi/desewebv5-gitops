import express, { Request, Response } from "express";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import { logger } from "@/utils/logger.js";
import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate, optionalAuth } from "@/middleware/auth.js";
import { redis } from "@/services/storage/redisClient.js";
import { config } from "@/config/index.js";
import { initializeMCPWebSocket, pushContextUpdate } from "./websocket-server.js";

/**
 * MuBot MCP Server
 * Port: 5556
 * Endpoint: /mubot
 * Purpose: Model Context Protocol server for MuBot module
 */

const app = express();
const PORT = process.env.MUBOT_MCP_PORT || 5556;
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
app.use("/mubot", mcpRateLimit);

// Authentication middleware (optional for health check, required for others)
app.use("/mubot", optionalAuth);

/**
 * GET /mubot/health
 * Health check endpoint
 */
app.get("/mubot/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "mubot-mcp",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /mubot/query
 * MCP query endpoint for MuBot context
 * Requires authentication
 */
app.post(
  "/mubot/query",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { query, context } = req.body;

    logger.info("MuBot MCP query received", {
      query,
      contextType: context?.type,
    });

    // Cache key
    const cacheKey = `mcp:mubot:query:${JSON.stringify(req.body)}`;
    
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info("MuBot MCP query served from cache", { query });
      return res.json(JSON.parse(cached));
    }

    try {
      // TODO: Replace with real MuBot API calls when available
      // For now, return context structure
      const response = {
        query,
        response: {
          module: "mubot",
          version: "v1.0",
          context: {
            dataIngestion: context?.dataIngestion || {},
            dataQuality: context?.dataQuality || {},
            accounting: context?.accounting || {},
          },
          metadata: {
            timestamp: new Date().toISOString(),
            source: "mubot-mcp-server",
            cached: false,
          },
        },
      };

      // Cache response (60 seconds TTL)
      await redis.setex(cacheKey, 60, JSON.stringify(response));

      // Push context update to WebSocket subscribers
      await pushContextUpdate("mubot", "ingestion", response.response.context);

      res.json(response);
    } catch (error) {
      logger.error("MuBot MCP query error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  })
);

/**
 * GET /mubot/context
 * Get MuBot module context
 * Requires authentication
 */
app.get(
  "/mubot/context",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = "mcp:mubot:context";
    
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const context = {
      module: "mubot",
      version: "v1.0",
      endpoints: [
        "/api/v1/mubot/data-ingestion",
        "/api/v1/mubot/data-quality",
        "/api/v1/mubot/accounting",
        "/api/v1/mubot/health",
      ],
      metrics: [
        "mubot_data_ingestion_total",
        "mubot_data_quality_score",
        "mubot_accounting_metrics_total",
      ],
      stream: "mubot.events",
      timestamp: new Date().toISOString(),
    };

    // Cache context (5 minutes TTL)
    await redis.setex(cacheKey, 300, JSON.stringify(context));

    res.json(context);
  })
);

// Error handler
app.use((err: Error, req: Request, res: Response, next: Function) => {
  logger.error("MuBot MCP server error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
  });
  
  res.status(500).json({
    error: "internal_error",
    message: "Failed to process MuBot MCP request",
    timestamp: new Date().toISOString(),
  });
});

// Create HTTP server for WebSocket support
const httpServer = createServer(app);

// Initialize WebSocket server
initializeMCPWebSocket("mubot", httpServer, PORT);

// Start server
httpServer.listen(PORT, () => {
  logger.info(`MuBot MCP Server started`, {
    port: PORT,
    endpoint: `/mubot`,
    wsEndpoint: `/mubot/ws`,
    version: "1.0.0",
    backendUrl: BACKEND_BASE,
  });
});

export default app;

