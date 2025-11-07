/**
 * MCP Context Aggregator
 * Provides multi-module query support and context merging
 */
type MCPModule = "finbot" | "mubot" | "dese" | "observability";
interface AggregatedContext {
    modules: MCPModule[];
    merged: Record<string, unknown>;
    priorities: Record<MCPModule, number>;
    timestamps: Record<MCPModule, string>;
    metadata: {
        totalModules: number;
        aggregatedAt: string;
        cacheKey?: string;
    };
}
interface QueryRequest {
    query: string;
    modules?: MCPModule[];
    priority?: "finbot" | "mubot" | "dese" | "observability" | "auto";
    mergeStrategy?: "merge" | "priority" | "latest";
    context?: Record<string, unknown>;
}
/**
 * Aggregate context from multiple MCP modules
 */
export declare function aggregateContext(request: QueryRequest, authToken?: string): Promise<AggregatedContext>;
/**
 * Get aggregated context with caching
 */
export declare function getAggregatedContext(request: QueryRequest, authToken?: string, ttl?: number): Promise<AggregatedContext>;
/**
 * Priority-based context selection
 */
export declare function selectContextByPriority(aggregated: AggregatedContext, preferredModule?: MCPModule): Record<string, unknown>;
export {};
//# sourceMappingURL=context-aggregator.d.ts.map