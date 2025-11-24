import { asyncHandler } from "@/middleware/errorHandler.js";
import { authenticate } from "@/middleware/auth.js";
import { config } from "@/config/index.js";
import { createMcpServer } from "@/lib/mcp-server.js";
import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";
import type { Request, Response } from "express";
import { initializeMCPWebSocket } from "@/mcp/websocket-server.js";
import { getAggregatedContext, selectContextByPriority } from "./context-aggregator.js";

/**
 * Observability MCP Server
 * Port: 5558
 * Endpoint: /observability
 * Purpose: Model Context Protocol server for Observability module
 */

const PORT = Number(process.env.OBSERVABILITY_MCP_PORT ?? 5558);
const BACKEND_BASE = process.env.BACKEND_URL || `http://app:${config.port}`;
const PROMETHEUS_BASE = process.env.PROMETHEUS_URL || "http://prometheus:9090";
const MODULE_ID = "observability";

/**
 * POST /observability/query
 * MCP query endpoint for Observability context
 * Requires authentication
 */
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

        logger.info("Observability MCP query received", {
          query,
          contextType: context?.type,
        });

        // Cache key
        const cacheKey = `mcp:observability:query:${JSON.stringify(req.body)}`;

        // Try to get from cache
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info("Observability MCP query served from cache", { query });
          return res.json(JSON.parse(cached));
        }

        try {
          // Try to fetch real metrics from backend
          let metrics: unknown = null;
          let prometheusMetrics: unknown = null;

          try {
            // Fetch metrics from backend
            const metricsResponse = await fetch(`${BACKEND_BASE}/metrics`, {
              headers: {
                Accept: "text/plain",
              },
            });

            if (metricsResponse.ok) {
              const metricsText = await metricsResponse.text();
              metrics = metricsText;
            }
          } catch (error) {
            logger.warn("Failed to fetch backend metrics", {
              error: error instanceof Error ? error.message : String(error),
            });
          }

          try {
            // Try to fetch from Prometheus (if available)
            const promResponse = await fetch(`${PROMETHEUS_BASE}/api/v1/query?query=up`, {
              headers: {
                Accept: "application/json",
              },
            });

            if (promResponse.ok) {
              prometheusMetrics = await promResponse.json();
            }
          } catch (error) {
            logger.warn("Failed to fetch Prometheus metrics", {
              error: error instanceof Error ? error.message : String(error),
            });
          }

          const response = {
            query,
            response: {
              module: "observability",
              version: "v1.0",
              context: {
                metrics: metrics || context?.metrics || {},
                prometheus: prometheusMetrics || context?.prometheus || {},
                logs: context?.logs || {},
                traces: context?.traces || {},
              },
              metadata: {
                timestamp: new Date().toISOString(),
                source: "observability-mcp-server",
                cached: false,
                backendConnected: metrics !== null,
                prometheusConnected: prometheusMetrics !== null,
              },
            },
          };

          // Cache response (30 seconds TTL - metrics change frequently)
          await redis.setex(cacheKey, 30, JSON.stringify(response));

          return res.json(response);
        } catch (error) {
          logger.error("Observability MCP query error", {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      })
    );

/**
 * GET /observability/context
 * Get Observability module context
 * Requires authentication
 */
    router.get(
      "/context",
      authenticate,
      asyncHandler(async (req: Request, res: Response) => {
        const cacheKey = "mcp:observability:context";

        // Try to get from cache
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        const context = {
          module: "observability",
          version: "v6.8.1",
          endpoints: {
            metrics: "/metrics",
            prometheus: "/api/v1/metrics",
            grafana: process.env.GRAFANA_URL || "http://grafana:3000",
            loki: process.env.LOKI_URL || "http://loki:3100",
            tempo: process.env.TEMPO_URL || "http://tempo:3200",
          },
          metrics: [
            "http_requests_total",
            "http_request_duration_seconds",
            "nodejs_heap_size_total_bytes",
            "nodejs_eventloop_lag_seconds",
          ],
          streams: ["observability.metrics", "observability.logs", "observability.traces"],
          timestamp: new Date().toISOString(),
        };

        // Cache context (5 minutes TTL)
        await redis.setex(cacheKey, 300, JSON.stringify(context));

        return res.json(context);
      })
    );

/**
 * GET /observability/metrics
 * Get current metrics status
 * Requires authentication
 */
    router.get(
      "/metrics",
      authenticate,
      asyncHandler(async (req: Request, res: Response) => {
        const cacheKey = "mcp:observability:metrics:status";

        // Try to get from cache
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }

        try {
          // Fetch metrics from backend
          const metricsResponse = await fetch(`${BACKEND_BASE}/metrics`, {
            headers: {
              Accept: "text/plain",
            },
          });

          const status = {
            backend: {
              connected: metricsResponse.ok,
              status: metricsResponse.status,
              url: `${BACKEND_BASE}/metrics`,
            },
            prometheus: {
              connected: false,
              url: PROMETHEUS_BASE,
            },
            timestamp: new Date().toISOString(),
          };

          // Try Prometheus connection
          try {
            const promResponse = await fetch(`${PROMETHEUS_BASE}/api/v1/status/config`, {
              headers: {
                Accept: "application/json",
              },
            });
            status.prometheus.connected = promResponse.ok;
          } catch {
            // Prometheus not available
          }

          // Cache status (1 minute TTL)
          await redis.setex(cacheKey, 60, JSON.stringify(status));

          return res.json(status);
        } catch (error) {
          logger.error("Failed to fetch metrics status", {
            error: error instanceof Error ? error.message : String(error),
          });

          return res.json({
            backend: {
              connected: false,
              url: `${BACKEND_BASE}/metrics`,
            },
            prometheus: {
              connected: false,
              url: PROMETHEUS_BASE,
            },
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

/**
 * POST /observability/aggregate
 * Aggregate context from multiple MCP modules
 * Requires authentication
 */
    router.post(
      "/aggregate",
      authenticate,
      asyncHandler(async (req: Request, res: Response) => {
        const { query, modules, priority, mergeStrategy, context } = req.body;

        logger.info("Context aggregation requested", {
          query,
          modules,
          priority,
          mergeStrategy,
        });

        const authToken = req.headers.authorization?.replace("Bearer ", "");

        try {
          const aggregated = await getAggregatedContext(
            {
              query: query || "",
              modules,
              priority,
              mergeStrategy,
              context,
            },
            authToken
          );

          // If priority is specified, select context by priority
          let selectedContext = aggregated.merged;
          if (priority && priority !== "auto") {
            selectedContext = selectContextByPriority(aggregated, priority);
          }

          res.json({
            query,
            aggregated: {
              modules: aggregated.modules,
              context: selectedContext,
              priorities: aggregated.priorities,
              timestamps: aggregated.timestamps,
              metadata: aggregated.metadata,
            },
          });
        } catch (error) {
          logger.error("Context aggregation error", {
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      })
    );
  },
});

export default app;
