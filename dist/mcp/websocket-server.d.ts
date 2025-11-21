import { WebSocketServer } from "../ws";
import { Server as HTTPServer } from "http";
type MCPModule = "finbot" | "mubot" | "dese" | "observability";
/**
 * Initialize MCP WebSocket Server for a module
 */
export declare function initializeMCPWebSocket(module: MCPModule, httpServer: HTTPServer, port: number): WebSocketServer;
/**
 * Push context update to subscribed clients
 */
export declare function pushContextUpdate(module: MCPModule, topic: string, context: unknown): Promise<void>;
/**
 * Push event to subscribed clients
 */
export declare function pushEvent(module: MCPModule, topic: string, event: unknown): Promise<void>;
/**
 * Get WebSocket server statistics
 */
export declare function getWebSocketStats(module: MCPModule): {
    connectedClients: number;
    topics: number;
    subscriptions: number;
} | null;
export {};
//# sourceMappingURL=websocket-server.d.ts.map