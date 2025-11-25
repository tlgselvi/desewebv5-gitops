import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate } from "@/middleware/auth.js";
import { config } from "@/config/index.js";
import { createMcpServer } from "@/lib/mcp-server.js";
import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import type { Request, Response } from "express";
import { initializeMCPWebSocket, pushContextUpdate } from "@/mcp/websocket-server.js";

/**
 * Service MCP Server
 * Port: 5560
 * Endpoint: /service
 * Purpose: Model Context Protocol server for Service module
 */

const PORT = Number(process.env.SERVICE_MCP_PORT ?? 5560);
const BACKEND_BASE = process.env.BACKEND_URL || `http://app:${config.port}`;
const MODULE_ID = "service";

const { app } = createMcpServer({
  moduleId: MODULE_ID,
  port: PORT,
  registerRoutes: ({ router, httpServer }) => {
    initializeMCPWebSocket(MODULE_ID, httpServer, PORT);

    router.post(
      "/query",
      authenticate,
      asyncHandler(async (req: Request, res: Response) => {
        const { query, context } = req.body;

        logger.info("Service MCP query received", { query });

        const cacheKey = `mcp:service:query:${JSON.stringify(req.body)}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        try {
          const response = {
            query,
            response: {
              module: MODULE_ID,
              version: "v1.0",
              context: {
                requests: context?.requests || [],
                technicians: context?.technicians || [],
                maintenancePlans: context?.maintenancePlans || [],
              },
              metadata: {
                timestamp: new Date().toISOString(),
                source: "service-mcp-server",
                cached: false,
              },
            },
          };

          await redis.setex(cacheKey, 60, JSON.stringify(response));
          await pushContextUpdate(MODULE_ID, "requests", response.response.context);

          return res.json(response);
        } catch (error) {
          logger.error("Service MCP query error", {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      })
    );

    router.get(
      "/context",
      authenticate,
      asyncHandler(async (_req: Request, res: Response) => {
        const cacheKey = "mcp:service:context";
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const context = {
          module: MODULE_ID,
          version: "v1.0",
          endpoints: [
            "/api/v1/service/requests",
            "/api/v1/service/technicians",
            "/api/v1/service/maintenance-plans",
          ],
          stream: "service.events",
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

