import { asyncHandler } from "../middleware/errorHandler.js";
import { authenticate } from "../middleware/auth.js";
import { config } from "../config/index.js";
import { createMcpServer } from "../lib/mcp-server.js";
import { logger } from "../utils/logger.js";
import { redis } from "../services/storage/redisClient.js";
import { initializeMCPWebSocket, pushContextUpdate } from "../mcp/websocket-server.js";
/**
 * Dese MCP Server
 * Port: 5557
 * Endpoint: /dese
 * Purpose: Model Context Protocol server for Dese AIOps module
 */
const PORT = Number(process.env.DESE_MCP_PORT ?? 5557);
const BACKEND_BASE = process.env.BACKEND_URL || `http://localhost:${config.port}`;
const MODULE_ID = "dese";
const { app } = createMcpServer({
    moduleId: MODULE_ID,
    port: PORT,
    registerRoutes: ({ router, httpServer }) => {
        initializeMCPWebSocket(MODULE_ID, httpServer, PORT);
        /**
         * POST /dese/query
         * MCP query endpoint for Dese context
         * Requires authentication
         */
        router.post("/query", authenticate, asyncHandler(async (req, res) => {
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
                let aiopsData = null;
                let metricsData = null;
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
                }
                catch (error) {
                    logger.warn("Failed to fetch AIOps data", {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
                try {
                    // Fetch metrics
                    const metricsResponse = await fetch(`${BACKEND_BASE}/metrics`, {
                        headers: {
                            Accept: "text/plain",
                        },
                    });
                    if (metricsResponse.ok) {
                        const metricsText = await metricsResponse.text();
                        metricsData = metricsText;
                    }
                }
                catch (error) {
                    logger.warn("Failed to fetch metrics data", {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
                const response = {
                    query,
                    response: {
                        module: "dese",
                        version: "v6.8.1",
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
                // Push context update to WebSocket subscribers
                await pushContextUpdate("dese", "anomalies", response.response.context);
                return res.json(response);
            }
            catch (error) {
                logger.error("Dese MCP query error", {
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        }));
        /**
         * GET /dese/context
         * Get Dese module context
         * Requires authentication
         */
        router.get("/context", authenticate, asyncHandler(async (req, res) => {
            const cacheKey = "mcp:dese:context";
            // Try to get from cache
            const cached = await redis.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
            const context = {
                module: "dese",
                version: "v6.8.1",
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
            return res.json(context);
        }));
    },
});
export default app;
//# sourceMappingURL=dese-server.js.map