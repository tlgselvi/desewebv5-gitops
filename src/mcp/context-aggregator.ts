import { logger } from "@/utils/logger.js";
import { redis } from "@/services/storage/redisClient.js";

/**
 * MCP Context Aggregator
 * Provides multi-module query support and context merging
 */

type MCPModule = "finbot" | "mubot" | "dese" | "observability" | "seo" | "service" | "crm" | "inventory" | "hr" | "iot";

interface MCPContext {
  module: MCPModule;
  data: Record<string, unknown>;
  priority: number;
  timestamp: string;
  source: string;
}

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
  priority?: MCPModule | "auto";
  mergeStrategy?: "merge" | "priority" | "latest";
  context?: Record<string, unknown>;
}

// Module priorities (higher = more important)
const MODULE_PRIORITIES: Record<MCPModule, number> = {
  finbot: 9,
  mubot: 8,
  crm: 7,
  inventory: 6,
  hr: 5,
  iot: 4,
  service: 3,
  seo: 2,
  dese: 1,
  observability: 1,
};


/**
 * Fetch context from a single MCP module
 */
const normalizeContextData = (input: unknown): Record<string, unknown> => {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  return {
    value: input,
  };
};

async function fetchModuleContext(
  module: MCPModule,
  query: string,
  authToken?: string
): Promise<MCPContext | null> {
  const portMap: Record<MCPModule, number> = {
    finbot: 5555,
    mubot: 5556,
    dese: 5557,
    observability: 5558,
    seo: 5559,
    service: 5560,
    crm: 5561,
    inventory: 5562,
    hr: 5563,
    iot: 5564,
  };

  const port = portMap[module];
  const url = `http://localhost:${port}/${module}/query`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify({ query, context: {} }),
    });

    if (!response.ok) {
      logger.warn(`Failed to fetch context from ${module}`, {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();

    const rawContext = data?.response?.context ?? data?.response ?? data;
    const normalizedContext = normalizeContextData(rawContext);

    return {
      module,
      data: normalizedContext,
      priority: MODULE_PRIORITIES[module],
      timestamp: new Date().toISOString(),
      source: `${module}-mcp-server`,
    };
  } catch (error) {
    logger.error(`Error fetching context from ${module}`, {
      error: error instanceof Error ? error.message : String(error),
      module,
    });
    return null;
  }
}

/**
 * Merge contexts based on strategy
 */
function mergeContexts(
  contexts: MCPContext[],
  strategy: "merge" | "priority" | "latest" = "merge"
): Record<string, unknown> {
  if (contexts.length === 0) {
    return {};
  }

  if (strategy === "priority") {
    // Return context from highest priority module
    const sorted = contexts.sort((a, b) => b.priority - a.priority);
    return sorted[0]?.data ?? {};
  }

  if (strategy === "latest") {
    // Return context from most recent module
    const sorted = contexts.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted[0]?.data ?? {};
  }

  // Default: merge strategy
  const merged: Record<string, unknown> = {};

  contexts.forEach((context) => {
    const contextData = context.data;
    if (!contextData || typeof contextData !== "object") {
      return;
    }

    Object.entries(contextData).forEach(([key, value]) => {
      const existing = merged[key];

      if (Array.isArray(existing)) {
        existing.push({
          module: context.module,
          data: value,
          priority: context.priority,
          timestamp: context.timestamp,
        });
        return;
      }

      if (existing && typeof existing === "object") {
        merged[key] = {
          ...(existing as Record<string, unknown>),
          [context.module]: value,
        };
        return;
      }

      merged[key] = [
        {
          module: context.module,
          data: value,
          priority: context.priority,
          timestamp: context.timestamp,
        },
      ];
    });
  });

  return merged;
}

/**
 * Aggregate context from multiple MCP modules
 */
export async function aggregateContext(
  request: QueryRequest,
  authToken?: string
): Promise<AggregatedContext> {
  const { query, modules, priority, mergeStrategy = "merge" } = request;

  // Determine which modules to query
  let modulesToQuery: MCPModule[] = modules || ["finbot", "mubot", "dese", "observability"];

  // If priority is specified, prioritize that module
  if (priority && priority !== "auto") {
    modulesToQuery = [priority, ...modulesToQuery.filter((m) => m !== priority)];
  }

  logger.info("Aggregating context from multiple modules", {
    query,
    modules: modulesToQuery,
    strategy: mergeStrategy,
    priority,
  });

  // Fetch contexts from all modules in parallel
  const contextPromises = modulesToQuery.map((module) =>
    fetchModuleContext(module, query, authToken)
  );

  const contexts = (await Promise.all(contextPromises)).filter(
    (ctx): ctx is MCPContext => ctx !== null
  );

  if (contexts.length === 0) {
    logger.warn("No contexts fetched from any module", { modules: modulesToQuery });
    return {
      modules: [],
      merged: {},
      priorities: MODULE_PRIORITIES,
      timestamps: {} as Record<MCPModule, string>,
      metadata: {
        totalModules: 0,
        aggregatedAt: new Date().toISOString(),
      },
    };
  }

  // Merge contexts
  const merged = mergeContexts(contexts, mergeStrategy);

  // Build aggregated context
  const aggregated: AggregatedContext = {
    modules: contexts.map((ctx) => ctx.module),
    merged,
    priorities: contexts.reduce(
      (acc, ctx) => {
        acc[ctx.module] = ctx.priority;
        return acc;
      },
      {} as Record<MCPModule, number>
    ),
    timestamps: contexts.reduce(
      (acc, ctx) => {
        acc[ctx.module] = ctx.timestamp;
        return acc;
      },
      {} as Record<MCPModule, string>
    ),
    metadata: {
      totalModules: contexts.length,
      aggregatedAt: new Date().toISOString(),
    },
  };

  logger.info("Context aggregation completed", {
    modules: aggregated.modules,
    totalModules: aggregated.metadata.totalModules,
    strategy: mergeStrategy,
  });

  return aggregated;
}

/**
 * Get aggregated context with caching
 */
export async function getAggregatedContext(
  request: QueryRequest,
  authToken?: string,
  ttl: number = 60
): Promise<AggregatedContext> {
  const cacheKey = `mcp:aggregated:${JSON.stringify(request)}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.debug("Aggregated context served from cache", { query: request.query });
    return JSON.parse(cached);
  }

  // Fetch and aggregate
  const aggregated = await aggregateContext(request, authToken);

  // Cache result
  await redis.setex(cacheKey, ttl, JSON.stringify(aggregated));
  aggregated.metadata.cacheKey = cacheKey;

  return aggregated;
}

/**
 * Priority-based context selection
 */
export function selectContextByPriority(
  aggregated: AggregatedContext,
  preferredModule?: MCPModule
): Record<string, unknown> {
  if (preferredModule && aggregated.modules.includes(preferredModule)) {
    // Return context from preferred module if available
    const moduleContext = aggregated.merged[preferredModule];
    if (moduleContext && typeof moduleContext === "object") {
      return moduleContext as Record<string, unknown>;
    }
    return aggregated.merged;
  }

  // Select module with highest priority
  const sortedModules = [...aggregated.modules].sort(
    (a, b) => (aggregated.priorities[b] || 0) - (aggregated.priorities[a] || 0)
  );

  if (sortedModules.length > 0) {
    const [topModule] = sortedModules;
    if (!topModule) {
      return aggregated.merged;
    }
    const moduleContext = aggregated.merged[topModule];
    if (moduleContext && typeof moduleContext === "object") {
      return moduleContext as Record<string, unknown>;
    }
    return aggregated.merged;
  }

  return aggregated.merged;
}
