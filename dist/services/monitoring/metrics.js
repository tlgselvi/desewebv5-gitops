import client from "prom-client";
import { register } from "../../middleware/prometheus.js";
const METRIC_ALREADY_EXISTS = "A metric with the name";
const registerMetric = (metric) => {
    try {
        register.registerMetric(metric);
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes(METRIC_ALREADY_EXISTS)) {
            return;
        }
        throw error;
    }
};
export const mcpWebSocketActiveConnections = new client.Gauge({
    name: 'mcp_websocket_active_connections',
    help: 'Current number of active MCP WebSocket connections',
    labelNames: ['module'],
});
export const mcpWebSocketEventsPublishedTotal = new client.Counter({
    name: 'mcp_websocket_events_published_total',
    help: 'Total number of MCP WebSocket events published to clients',
    labelNames: ['module', 'eventType'],
});
registerMetric(mcpWebSocketActiveConnections);
registerMetric(mcpWebSocketEventsPublishedTotal);
export const recordWebSocketEventPublished = (module, eventType) => {
    mcpWebSocketEventsPublishedTotal.inc({ module, eventType });
};
export const incrementWebSocketActiveConnections = (module) => mcpWebSocketActiveConnections.inc({ module });
export const decrementWebSocketActiveConnections = (module) => mcpWebSocketActiveConnections.dec({ module });
//# sourceMappingURL=metrics.js.map