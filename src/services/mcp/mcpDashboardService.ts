import { config } from "@/config/index.js";
import { createError } from "@/middleware/errorHandler.js";
import { queryInstant } from "@/services/monitoring/prometheusClient.js";
import { redis } from "@/services/storage/redisClient.js";
import { logger } from "@/utils/logger.js";

type ModuleName = "mubot" | "finbot" | "aiops" | "observability";

export type MetricChangeType = "increase" | "decrease" | "neutral";

export type MetricIconKey =
  | "FileInput"
  | "Database"
  | "Repeat"
  | "Scale"
  | "Cpu"
  | "MemoryStick"
  | "AlertTriangle"
  | "Network"
  | "Server"
  | "LogIn"
  | "AlertCircle"
  | "Timer"
  | "Users"
  | "Clock";

export interface DashboardHealthCheck {
  serviceName: string;
  status: string;
  lastChecked: string;
}

export interface DashboardMetric {
  icon: MetricIconKey;
  title: string;
  value: string;
  change?: string;
  changeType?: MetricChangeType;
  footerText?: string;
}

export interface McpDashboardData {
  module: ModuleName;
  generatedAt: string;
  healthChecks: DashboardHealthCheck[];
  metrics: DashboardMetric[];
}

interface HealthEndpointDescriptor {
  serviceName: string;
  url?: string;
}

interface MetricDescriptor {
  title: string;
  icon: MetricIconKey;
  query?: string;
  secondaryQuery?: string;
  footerText: string;
  fallbackValue: string;
  formatValue: (value: number | null, secondary: number | null) => string;
  changeFormatter?: (
    value: number | null,
    secondary: number | null,
  ) => { change: string; changeType: MetricChangeType } | undefined;
}

interface GenericHealthPayload {
  status?: string;
  state?: string;
  message?: string;
  details?: unknown;
}

const DEFAULT_TIMEOUT_MS = config.mcpDashboard.prometheus.timeoutMs ?? 5000;
const FALLBACK_STATUS = "Bilinmiyor";
const FALLBACK_VALUE = "N/A";
const numberFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });

const normalizeStatus = (rawStatus?: string): string => {
  if (!rawStatus) {
    return FALLBACK_STATUS;
  }

  const normalized = rawStatus.trim().toLowerCase();
  if (["healthy", "success", "ok", "up", "pass", "stabil"].includes(normalized)) {
    return "Stabil";
  }

  if (["degraded", "warning", "partial", "monitoring", "izleniyor"].includes(normalized)) {
    return "İzleniyor";
  }

  if (["down", "critical", "fail", "failed", "offline", "kesinti var"].includes(normalized)) {
    return "Kesinti Var";
  }

  return rawStatus;
};

const nowIso = (): string => new Date().toISOString();

const createHealthCheck = (serviceName: string, status: string): DashboardHealthCheck => ({
  serviceName,
  status,
  lastChecked: nowIso(),
});

const getErrorMessage = (reason: unknown): string => {
  if (reason instanceof Error) {
    return reason.message;
  }
  return typeof reason === "string" ? reason : JSON.stringify(reason);
};

const fetchJsonWithTimeout = async <T>(url: string): Promise<T | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchHealthCheck = async (descriptor: HealthEndpointDescriptor): Promise<DashboardHealthCheck> => {
  if (!descriptor.url) {
    throw new Error("Health endpoint URL is not configured");
  }

  try {
    const payload = await fetchJsonWithTimeout<GenericHealthPayload>(descriptor.url);
    const status = normalizeStatus(payload?.status ?? payload?.state ?? "Stabil");
    return createHealthCheck(descriptor.serviceName, status);
  } catch (error) {
    logger.warn("Health endpoint request failed", {
      serviceName: descriptor.serviceName,
      url: descriptor.url,
      error: getErrorMessage(error),
    });
    throw error;
  }
};

const buildHealthChecks = async (descriptors: HealthEndpointDescriptor[]): Promise<DashboardHealthCheck[]> => {
  const results = await Promise.allSettled(descriptors.map((descriptor) => fetchHealthCheck(descriptor)));

  return results.map((result, index) => {
    const descriptor = descriptors[index];

    if (result.status === "fulfilled") {
      return result.value;
    }

    logger.warn("Falling back to degraded status for health endpoint", {
      serviceName: descriptor.serviceName,
      error: getErrorMessage(result.reason),
    });

    return createHealthCheck(descriptor.serviceName, FALLBACK_STATUS);
  });
};

const formatPercentage = (value: number | null): string => {
  if (value === null) {
    return FALLBACK_VALUE;
  }

  return `${numberFormatter.format(value)}%`;
};

const formatCount = (value: number | null, suffix?: string): string => {
  if (value === null) {
    return FALLBACK_VALUE;
  }

  const formatted = integerFormatter.format(value);
  return suffix ? `${formatted} ${suffix}` : formatted;
};

const formatBytesPerMinute = (value: number | null): string => {
  if (value === null) {
    return FALLBACK_VALUE;
  }

  const gigabytes = value / (1024 * 1024 * 1024);
  return `${numberFormatter.format(gigabytes)} GB/dk`;
};

const formatLatency = (value: number | null): string => {
  if (value === null) {
    return FALLBACK_VALUE;
  }

  return `${integerFormatter.format(value)} ms`;
};

const fetchMetric = async (descriptor: MetricDescriptor): Promise<DashboardMetric> => {
  if (!descriptor.query) {
    throw new Error("Prometheus query is not configured");
  }

  const [primaryResult, secondaryResult] = await Promise.all([
    queryInstant(descriptor.query),
    descriptor.secondaryQuery ? queryInstant(descriptor.secondaryQuery) : Promise.resolve(null),
  ]);

  const value = descriptor.formatValue(primaryResult, secondaryResult);
  const metric: DashboardMetric = {
    icon: descriptor.icon,
    title: descriptor.title,
    value,
    footerText: descriptor.footerText,
  };

  const changePayload = descriptor.changeFormatter?.(primaryResult, secondaryResult);
  if (changePayload) {
    metric.change = changePayload.change;
    metric.changeType = changePayload.changeType;
  }

  return metric;
};

const createMetricFallback = (descriptor: MetricDescriptor): DashboardMetric => ({
  icon: descriptor.icon,
  title: descriptor.title,
  value: descriptor.fallbackValue,
  footerText: descriptor.footerText,
});

const buildMetrics = async (descriptors: MetricDescriptor[]): Promise<DashboardMetric[]> => {
  const results = await Promise.allSettled(descriptors.map((descriptor) => fetchMetric(descriptor)));

  return results.map((result, index) => {
    const descriptor = descriptors[index];

    if (result.status === "fulfilled") {
      return result.value;
    }

    logger.warn("Falling back to default metric value", {
      title: descriptor.title,
      error: getErrorMessage(result.reason),
    });

    return createMetricFallback(descriptor);
  });
};

const buildResponse = (
  moduleName: ModuleName,
  healthChecks: DashboardHealthCheck[],
  metrics: DashboardMetric[],
): McpDashboardData => ({
  module: moduleName,
  generatedAt: nowIso(),
  healthChecks,
  metrics,
});

const buildModuleDashboard = async (
  module: ModuleName,
  healthDescriptors: HealthEndpointDescriptor[],
  metricDescriptors: MetricDescriptor[],
): Promise<McpDashboardData> => {
  const [healthChecks, metrics] = await Promise.all([
    buildHealthChecks(healthDescriptors),
    buildMetrics(metricDescriptors),
  ]);

  return buildResponse(module, healthChecks, metrics);
};

const buildMuBotDashboard = async (): Promise<McpDashboardData> => {
  const endpoints = config.mcpDashboard.mubot.healthEndpoints;
  const queries = config.mcpDashboard.mubot.metricsQueries;

  const healthDescriptors: HealthEndpointDescriptor[] = [
    { serviceName: "MuBot API", url: endpoints.api },
    { serviceName: "PostgreSQL DB", url: endpoints.postgres },
    { serviceName: "Data Ingestion Worker", url: endpoints.ingestion },
    { serviceName: "Reconciliation Job", url: endpoints.reconciliation },
  ];

  const metricDescriptors: MetricDescriptor[] = [
    {
      title: "İşlenen Kayıt",
      icon: "FileInput",
      query: queries.recordsProcessed,
      footerText: "Son 1 saat",
      fallbackValue: "N/A",
      formatValue: (value) => formatCount(value, "kayıt"),
    },
    {
      title: "DB Yazma Gecikmesi",
      icon: "Database",
      query: queries.dbWriteLatency,
      footerText: "p95",
      fallbackValue: "N/A",
      formatValue: (value) => formatLatency(value),
      changeFormatter: (value) =>
        value === null
          ? undefined
          : {
              change: `${integerFormatter.format(value)} ms`,
              changeType: value > 0 ? "increase" : "neutral",
            },
    },
    {
      title: "Reconciliation Oranı",
      icon: "Repeat",
      query: queries.reconciliationRate,
      footerText: "Son 24 saat",
      fallbackValue: "N/A",
      formatValue: (value) => formatPercentage(value),
    },
    {
      title: "Veri Kalite Skoru",
      icon: "Scale",
      query: queries.dataQualityScore,
      footerText: "Ortalama",
      fallbackValue: "N/A",
      formatValue: (value) => (value === null ? FALLBACK_VALUE : `${value.toFixed(0)}/100`),
    },
  ];

  return buildModuleDashboard("mubot", healthDescriptors, metricDescriptors);
};

const buildObservabilityDashboard = async (): Promise<McpDashboardData> => {
  const endpoints = config.mcpDashboard.observability.healthEndpoints;
  const queries = config.mcpDashboard.observability.metricsQueries;

  const healthDescriptors: HealthEndpointDescriptor[] = [
    { serviceName: "Prometheus", url: endpoints.prometheus },
    { serviceName: "Grafana", url: endpoints.grafana },
    { serviceName: "Loki Ingester", url: endpoints.loki },
    { serviceName: "Tempo Distributor", url: endpoints.tempo },
  ];

  const metricDescriptors: MetricDescriptor[] = [
    {
      title: "Aktif Hedefler",
      icon: "Server",
      query: queries.activeTargets,
      secondaryQuery: queries.totalTargets,
      footerText: "Prometheus scrape pool",
      fallbackValue: "N/A",
      formatValue: (active, total) => {
        if (active === null && total === null) {
          return FALLBACK_VALUE;
        }

        if (total === null) {
          return formatCount(active, "hedef");
        }

        if (active === null) {
          return `0/${formatCount(total)}`;
        }

        return `${formatCount(active)}/${formatCount(total)}`;
      },
    },
    {
      title: "Log Ingestion Oranı",
      icon: "LogIn",
      query: queries.logIngestion,
      footerText: "Son 15 dakika",
      fallbackValue: "N/A",
      formatValue: (value) => formatBytesPerMinute(value),
    },
    {
      title: "Aktif Alarmlar",
      icon: "AlertCircle",
      query: queries.activeAlerts,
      footerText: "Alertmanager",
      fallbackValue: "N/A",
      formatValue: (value) => formatCount(value, "alarm"),
    },
    {
      title: "Query Gecikmesi (p99)",
      icon: "Timer",
      query: queries.queryLatency,
      footerText: "Grafana sorguları",
      fallbackValue: "N/A",
      formatValue: (value) => formatLatency(value),
    },
  ];

  return buildModuleDashboard("observability", healthDescriptors, metricDescriptors);
};

const buildFinBotDashboard = async (): Promise<McpDashboardData> => {
  const endpoints = config.mcpDashboard.finbot.healthEndpoints;
  const queries = config.mcpDashboard.finbot.metricsQueries;

  const healthDescriptors: HealthEndpointDescriptor[] = [
    { serviceName: "FinBot API", url: endpoints.api },
    { serviceName: "Redis Cache", url: endpoints.redis },
    { serviceName: "Forecast Engine", url: endpoints.forecast },
    { serviceName: "Kyverno Sync", url: endpoints.kyverno },
  ];

  const metricDescriptors: MetricDescriptor[] = [
    {
      title: "Forecast CPU Kullanımı",
      icon: "Cpu",
      query: queries.cpuUsage,
      footerText: "Son 1 saat",
      fallbackValue: "N/A",
      formatValue: (value) => formatPercentage(value),
    },
    {
      title: "Forecast Bellek",
      icon: "MemoryStick",
      query: queries.memoryUsage,
      footerText: "Düne göre",
      fallbackValue: "N/A",
      formatValue: (value) =>
        value === null ? FALLBACK_VALUE : `${numberFormatter.format(value)} GB`,
    },
    {
      title: "Aktif Senaryo Oturumları",
      icon: "Users",
      query: queries.activeSessions,
      footerText: "Bugün",
      fallbackValue: "N/A",
      formatValue: (value) => formatCount(value, "oturum"),
    },
    {
      title: "API Gecikmesi (p95)",
      icon: "Clock",
      query: queries.apiLatency,
      footerText: "Son 15 dakika",
      fallbackValue: "N/A",
      formatValue: (value) => formatLatency(value),
    },
  ];

  return buildModuleDashboard("finbot", healthDescriptors, metricDescriptors);
};

const buildAiOpsDashboard = async (): Promise<McpDashboardData> => {
  const endpoints = config.mcpDashboard.aiops.healthEndpoints;
  const queries = config.mcpDashboard.aiops.metricsQueries;

  const healthDescriptors: HealthEndpointDescriptor[] = [
    { serviceName: "AIOps API", url: endpoints.api },
    { serviceName: "Correlation Engine", url: endpoints.correlation },
    { serviceName: "Anomaly Detector", url: endpoints.anomaly },
    { serviceName: "Telemetry Ingestion", url: endpoints.ingestion },
  ];

  const metricDescriptors: MetricDescriptor[] = [
    {
      title: "ML Model CPU",
      icon: "Cpu",
      query: queries.modelCpu,
      footerText: "Son 1 saat",
      fallbackValue: "N/A",
      formatValue: (value) => formatPercentage(value),
    },
    {
      title: "ML Model Bellek",
      icon: "MemoryStick",
      query: queries.modelMemory,
      footerText: "Düne göre",
      fallbackValue: "N/A",
      formatValue: (value) =>
        value === null ? FALLBACK_VALUE : `${numberFormatter.format(value)} GB`,
    },
    {
      title: "Tespit Edilen Anomali",
      icon: "AlertTriangle",
      query: queries.anomaliesDetected,
      footerText: "Bugün",
      fallbackValue: "N/A",
      formatValue: (value) => formatCount(value, "anomali"),
    },
    {
      title: "Ingestion Gecikmesi",
      icon: "Network",
      query: queries.ingestionDelay,
      footerText: "Son 15 dakika",
      fallbackValue: "N/A",
      formatValue: (value) => formatLatency(value),
    },
  ];

  return buildModuleDashboard("aiops", healthDescriptors, metricDescriptors);
};

const fetchModuleData = async (moduleName: ModuleName): Promise<McpDashboardData> => {
  switch (moduleName) {
    case "mubot":
      return buildMuBotDashboard();
    case "observability":
      return buildObservabilityDashboard();
    case "finbot":
      return buildFinBotDashboard();
    case "aiops":
      return buildAiOpsDashboard();
    default:
      logger.warn("MCP dashboard requested with unsupported module", { moduleName });
      throw createError("Unsupported MCP module", 400);
  }
};

export const mcpDashboardService = {
  async getDashboardData(moduleName: ModuleName): Promise<McpDashboardData> {
    try {
      logger.info("Fetching MCP dashboard data", { moduleName });

      const cacheKey = `mcp:dashboard:${moduleName}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.debug("MCP dashboard cache hit", { moduleName });
        return JSON.parse(cached) as McpDashboardData;
      }

      const data = await fetchModuleData(moduleName);

      logger.info("MCP dashboard data fetched", {
        moduleName,
        healthChecks: data.healthChecks.length,
        metrics: data.metrics.length,
      });

      const ttlSeconds = config.mcpDashboard.cache.ttlSeconds;
      await redis.setex(cacheKey, ttlSeconds, JSON.stringify(data));

      return data;
    } catch (error) {
      logger.error("Failed to fetch MCP dashboard data", {
        moduleName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw createError("Failed to fetch MCP dashboard data", 500);
    }
  },
};
