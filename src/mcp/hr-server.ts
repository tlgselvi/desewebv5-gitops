import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate } from "@/middleware/auth.js";
import { config } from "@/config/index.js";
import { createMcpServer } from "@/lib/mcp-server.js";
import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import type { Request, Response } from "express";
import { initializeMCPWebSocket, pushContextUpdate } from "@/mcp/websocket-server.js";

/**
 * HR MCP Server
 * Port: 5563
 * Endpoint: /hr
 * Purpose: Model Context Protocol server for HR module
 */

const PORT = Number(process.env.HR_MCP_PORT ?? 5563);
const BACKEND_BASE = process.env.BACKEND_URL || `http://app:${config.port}`;
const MODULE_ID = "hr";

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

        logger.info("HR MCP query received", { query });

        const cacheKey = `mcp:hr:query:${JSON.stringify(req.body)}`;
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
                employees: context?.employees || [],
                payroll: context?.payroll || [],
                attendance: context?.attendance || [],
                departments: context?.departments || [],
              },
              metadata: {
                timestamp: new Date().toISOString(),
                source: "hr-mcp-server",
                cached: false,
              },
            },
          };

          await redis.setex(cacheKey, 60, JSON.stringify(response));
          await pushContextUpdate(MODULE_ID, "employees", response.response.context);

          return res.json(response);
        } catch (error) {
          logger.error("HR MCP query error", {
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
        const cacheKey = "mcp:hr:context";
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const context = {
          module: MODULE_ID,
          version: "v1.0",
          endpoints: [
            "/api/v1/hr/employees",
            "/api/v1/hr/payroll",
            "/api/v1/hr/attendance",
          ],
          stream: "hr.events",
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

