import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate } from "@/middleware/auth.js";
import { config } from "@/config/index.js";
import { createMcpServer } from "@/lib/mcp-server.js";
import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import type { Request, Response } from "express";
import { initializeMCPWebSocket, pushContextUpdate } from "@/mcp/websocket-server.js";

/**
 * CRM MCP Server
 * Port: 5561
 * Endpoint: /crm
 * Purpose: Model Context Protocol server for CRM module
 */

const PORT = Number(process.env.CRM_MCP_PORT ?? 5561);
const BACKEND_BASE = process.env.BACKEND_URL || `http://app:${config.port}`;
const MODULE_ID = "crm";

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

        logger.info("CRM MCP query received", { query });

        const cacheKey = `mcp:crm:query:${JSON.stringify(req.body)}`;
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
                leads: context?.leads || [],
                deals: context?.deals || [],
                contacts: context?.contacts || [],
                activities: context?.activities || [],
              },
              metadata: {
                timestamp: new Date().toISOString(),
                source: "crm-mcp-server",
                cached: false,
              },
            },
          };

          await redis.setex(cacheKey, 60, JSON.stringify(response));
          await pushContextUpdate(MODULE_ID, "pipeline", response.response.context);

          return res.json(response);
        } catch (error) {
          logger.error("CRM MCP query error", {
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
        const cacheKey = "mcp:crm:context";
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const context = {
          module: MODULE_ID,
          version: "v1.0",
          endpoints: [
            "/api/v1/crm/leads",
            "/api/v1/crm/deals",
            "/api/v1/crm/contacts",
            "/api/v1/crm/activities",
          ],
          stream: "crm.events",
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

