import client from "prom-client";
export declare const mcpWebSocketActiveConnections: client.Gauge<"module">;
export declare const mcpWebSocketEventsPublishedTotal: client.Counter<"module" | "eventType">;
export declare const recordWebSocketEventPublished: (module: string, eventType: string) => void;
export declare const incrementWebSocketActiveConnections: (module: string) => void;
export declare const decrementWebSocketActiveConnections: (module: string) => void;
//# sourceMappingURL=metrics.d.ts.map