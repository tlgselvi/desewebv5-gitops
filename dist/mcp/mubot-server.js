import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticate } from "../middleware/auth.js";
import { createMcpServer } from "../lib/mcp-server.js";
import { logger } from "../utils/logger.js";
import { redis } from "../services/storage/redisClient.js";
import { initializeMCPWebSocket, pushContextUpdate } from "../mcp/websocket-server.js";
/**
 * MuBot MCP Server
 * Port: 5556
 * Endpoint: /mubot
 * Purpose: Model Context Protocol server for MuBot module
 */
const PORT = Number(process.env.MUBOT_MCP_PORT ?? 5556);
const MODULE_ID = "mubot";
const { app } = createMcpServer({
    moduleId: MODULE_ID,
    port: PORT,
    registerRoutes: ({ router, httpServer }) => {
        initializeMCPWebSocket(MODULE_ID, httpServer, PORT);
        /**
         * POST /mubot/query
         * MCP query endpoint for MuBot context
         * Requires authentication
         */
        router.post("/query", authenticate, asyncHandler(async (req, res) => {
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
                const response = {
                    query,
                    response: {
                        module: MODULE_ID,
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
                await pushContextUpdate(MODULE_ID, "ingestion", response.response.context);
                return res.json(response);
            }
            catch (error) {
                logger.error("MuBot MCP query error", {
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        }));
        /**
         * GET /mubot/context
         * Get MuBot module context
         * Requires authentication
         */
        router.get("/context", authenticate, asyncHandler(async (req, res) => {
            const cacheKey = "mcp:mubot:context";
            // Try to get from cache
            const cached = await redis.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
            const context = {
                module: "mubot",
                version: "v6.8.1",
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
            return res.json(context);
        }));
    },
});
export default app;
//# sourceMappingURL=mubot-server.js.map