import { Server as HTTPServer } from "http";
import { WebSocketServer } from "../ws";
/**
 * Initialize WebSocket gateway
 */
export declare function initializeWebSocketGateway(httpServer: HTTPServer): void;
/**
 * Get WebSocket gateway instance
 */
export declare function getWebSocketGateway(): WebSocketServer | null;
/**
 * Publish message to a topic
 */
export declare function publishToTopic(topic: string, message: unknown): void;
/**
 * Get gateway statistics
 */
export declare function getGatewayStats(): {
    connectedClients: number;
    authenticatedClients: number;
    topics: number;
    totalSubscriptions: number;
};
/**
 * Close WebSocket gateway
 */
export declare function close(): Promise<void>;
//# sourceMappingURL=gateway.d.ts.map