import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate } from "@/middleware/auth.js";
import { config } from "@/config/index.js";
import { createMcpServer } from "@/lib/mcp-server.js";
import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import type { Request, Response } from "express";
import { initializeMCPWebSocket, pushContextUpdate } from "@/mcp/websocket-server.js";

/**
 * IoT MCP Server
 * Port: 5564
 * Endpoint: /iot
 * Purpose: Model Context Protocol server for IoT module
 */

const PORT = Number(process.env.IOT_MCP_PORT ?? 5564);
const BACKEND_BASE = process.env.BACKEND_URL || `http://app:${config.port}`;
const MODULE_ID = "iot";

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

        logger.info("IoT MCP query received", { query });

        const cacheKey = `mcp:iot:query:${JSON.stringify(req.body)}`;
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
                devices: context?.devices || [],
                sensors: context?.sensors || [],
                readings: context?.readings || [],
                alarms: context?.alarms || [],
              },
              metadata: {
                timestamp: new Date().toISOString(),
                source: "iot-mcp-server",
                cached: false,
              },
            },
          };

          await redis.setex(cacheKey, 60, JSON.stringify(response));
          await pushContextUpdate(MODULE_ID, "sensors", response.response.context);

          return res.json(response);
        } catch (error) {
          logger.error("IoT MCP query error", {
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
        const cacheKey = "mcp:iot:context";
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const context = {
          module: MODULE_ID,
          version: "v1.0",
          endpoints: [
            "/api/v1/iot/devices",
            "/api/v1/iot/sensors",
            "/api/v1/iot/readings",
            "/api/v1/iot/alarms",
          ],
          stream: "iot.events",
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

