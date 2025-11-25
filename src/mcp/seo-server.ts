import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate } from "@/middleware/auth.js";
import { config } from "@/config/index.js";
import { createMcpServer } from "@/lib/mcp-server.js";
import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import type { Request, Response } from "express";
import { initializeMCPWebSocket, pushContextUpdate } from "@/mcp/websocket-server.js";

/**
 * SEO MCP Server
 * Port: 5559
 * Endpoint: /seo
 * Purpose: Model Context Protocol server for SEO module
 */

const PORT = Number(process.env.SEO_MCP_PORT ?? 5559);
const BACKEND_BASE = process.env.BACKEND_URL || `http://app:${config.port}`;
const MODULE_ID = "seo";

const { app } = createMcpServer({
  moduleId: MODULE_ID,
  port: PORT,
  registerRoutes: ({ router, httpServer }) => {
    initializeMCPWebSocket(MODULE_ID, httpServer, PORT);

    /**
     * POST /seo/query
     * MCP query endpoint for SEO context
     * Requires authentication
     */
    router.post(
      "/query",
      authenticate,
      asyncHandler(async (req: Request, res: Response) => {
        const { query, context } = req.body;

        logger.info("SEO MCP query received", {
          query,
          contextType: context?.type,
        });

        const cacheKey = `mcp:seo:query:${JSON.stringify(req.body)}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info("SEO MCP query served from cache", { query });
          return res.json(JSON.parse(cached));
        }

        try {
          let metricsData: unknown = null;
          let trendsData: unknown = null;

          try {
            const metricsResponse = await fetch(`${BACKEND_BASE}/api/v1/seo/metrics`, {
              headers: {
                "Content-Type": "application/json",
                ...(req.headers.authorization && { Authorization: req.headers.authorization }),
              },
            });

            if (metricsResponse.ok) {
              metricsData = await metricsResponse.json();
            }
          } catch (error) {
            logger.warn("Failed to fetch SEO metrics data", {
              error: error instanceof Error ? error.message : String(error),
            });
          }

          try {
            const trendsResponse = await fetch(`${BACKEND_BASE}/api/v1/seo/trends`, {
              headers: {
                "Content-Type": "application/json",
                ...(req.headers.authorization && { Authorization: req.headers.authorization }),
              },
            });

            if (trendsResponse.ok) {
              trendsData = await trendsResponse.json();
            }
          } catch (error) {
            logger.warn("Failed to fetch SEO trends data", {
              error: error instanceof Error ? error.message : String(error),
            });
          }

          const response = {
            query,
            response: {
              module: MODULE_ID,
              version: "v1.0",
              context: {
                metrics: metricsData || null,
                trends: trendsData || null,
                projects: context?.projects || [],
              },
              metadata: {
                timestamp: new Date().toISOString(),
                source: "seo-mcp-server",
                cached: false,
                backendConnected: metricsData !== null || trendsData !== null,
              },
            },
          };

          await redis.setex(cacheKey, 60, JSON.stringify(response));
          await pushContextUpdate(MODULE_ID, "metrics", response.response.context);

          return res.json(response);
        } catch (error) {
          logger.error("SEO MCP query error", {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      })
    );

    /**
     * GET /seo/context
     * Get SEO module context
     * Requires authentication
     */
    router.get(
      "/context",
      authenticate,
      asyncHandler(async (_req: Request, res: Response) => {
        const cacheKey = "mcp:seo:context";

        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const context = {
          module: MODULE_ID,
          version: "v1.0",
          endpoints: [
            "/api/v1/seo/analyze",
            "/api/v1/seo/metrics",
            "/api/v1/seo/trends",
            "/api/v1/seo/analyze/url",
          ],
          metrics: [
            "seo_score",
            "core_web_vitals",
            "lighthouse_score",
            "backlink_count",
          ],
          stream: "seo.events",
          backendUrl: BACKEND_BASE,
          timestamp: new Date().toISOString(),
        };

        await redis.setex(cacheKey, 300, JSON.stringify(context));

        return res.json(context);
      })
    );
  },
});

export default app;

