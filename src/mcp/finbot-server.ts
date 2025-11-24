import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate } from "@/middleware/auth.js";
import { config } from "@/config/index.js";
import { createMcpServer } from "@/lib/mcp-server.js";
import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import type { Request, Response } from "express";
import { initializeMCPWebSocket, pushContextUpdate } from "@/mcp/websocket-server.js";

/**
 * FinBot MCP Server
 * Port: 5555
 * Endpoint: /finbot
 * Purpose: Model Context Protocol server for FinBot module
 */

const PORT = Number(process.env.FINBOT_MCP_PORT ?? 5555);
const BACKEND_BASE = process.env.BACKEND_URL || `http://app:${config.port}`;
const MODULE_ID = "finbot";

const { app } = createMcpServer({
  moduleId: MODULE_ID,
  port: PORT,
  registerRoutes: ({ router, httpServer }) => {
    initializeMCPWebSocket(MODULE_ID, httpServer, PORT);

    /**
     * POST /finbot/query
     * MCP query endpoint for FinBot context
     * Requires authentication
     */
    router.post(
      "/query",
      authenticate,
      asyncHandler(async (req: Request, res: Response) => {
        const { query, context } = req.body;

        logger.info("FinBot MCP query received", {
          query,
          contextType: context?.type,
        });

        const cacheKey = `mcp:finbot:query:${JSON.stringify(req.body)}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info("FinBot MCP query served from cache", { query });
          return res.json(JSON.parse(cached));
        }

        try {
          let analyticsData: unknown = null;
          let metricsData: unknown = null;

          try {
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
            const metricsResponse = await fetch(`${BACKEND_BASE}/metrics`, {
              headers: {
                Accept: "text/plain",
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
              module: MODULE_ID,
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

          await redis.setex(cacheKey, 60, JSON.stringify(response));
          await pushContextUpdate(MODULE_ID, "analytics", response.response.context);

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
    router.get(
      "/context",
      authenticate,
      asyncHandler(async (_req: Request, res: Response) => {
        const cacheKey = "mcp:finbot:context";

        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const context = {
          module: MODULE_ID,
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

        await redis.setex(cacheKey, 300, JSON.stringify(context));

        return res.json(context);
      })
    );

    /**
     * POST /finbot/correlation/run
     * Correlation AI endpoint
     * Requires authentication
     */
    router.post(
      "/correlation/run",
      authenticate,
      asyncHandler(async (req: Request, res: Response) => {
        logger.info("Correlation AI run requested", {
          body: req.body,
        });

        try {
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
  },
});

export default app;
