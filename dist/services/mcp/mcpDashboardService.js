import { config } from "@/config/index.js";
import { createError } from "@/middleware/errorHandler.js";
import { queryInstant } from "@/services/monitoring/prometheusClient.js";
import { redis } from "@/services/storage/redisClient.js";
import { logger } from "@/utils/logger.js";
const DEFAULT_TIMEOUT_MS = config.mcpDashboard.prometheus.timeoutMs ?? 5000;
const FALLBACK_STATUS = "Bilinmiyor";
const FALLBACK_VALUE = "N/A";
const numberFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const createHealthDescriptor = (serviceName, url) => isNonEmptyString(url) ? { serviceName, url: url.trim() } : { serviceName };
const createMetricDescriptor = (descriptor) => {
    const { query, secondaryQuery, ...rest } = descriptor;
    return {
        ...rest,
        ...(isNonEmptyString(query) ? { query: query.trim() } : {}),
        ...(isNonEmptyString(secondaryQuery)
            ? { secondaryQuery: secondaryQuery.trim() }
            : {}),
    };
};
const normalizeStatus = (rawStatus) => {
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
const nowIso = () => new Date().toISOString();
const createHealthCheck = (serviceName, status) => ({
    serviceName,
    status,
    lastChecked: nowIso(),
});
const getErrorMessage = (reason) => {
    if (reason instanceof Error) {
        return reason.message;
    }
    return typeof reason === "string" ? reason : JSON.stringify(reason);
};
const fetchJsonWithTimeout = async (url) => {
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
        return JSON.parse(text);
    }
    finally {
        clearTimeout(timeout);
    }
};
const fetchHealthCheck = async (descriptor) => {
    const endpointUrl = descriptor.url;
    if (!isNonEmptyString(endpointUrl)) {
        throw new Error("Health endpoint URL is not configured");
    }
    try {
        const payload = await fetchJsonWithTimeout(endpointUrl.trim());
        const status = normalizeStatus(payload?.status ?? payload?.state ?? "Stabil");
        return createHealthCheck(descriptor.serviceName, status);
    }
    catch (error) {
        logger.warn("Health endpoint request failed", {
            serviceName: descriptor.serviceName,
            url: descriptor.url,
            error: getErrorMessage(error),
        });
        throw error;
    }
};
const buildHealthChecks = async (descriptors) => {
    const results = await Promise.allSettled(descriptors.map((descriptor) => fetchHealthCheck(descriptor)));
    return results.map((result, index) => {
        const descriptor = descriptors[index];
        if (!descriptor) {
            logger.error("Missing health descriptor for MCP dashboard", { index });
            return createHealthCheck("Bilinmeyen Servis", FALLBACK_STATUS);
        }
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
const formatPercentage = (value) => {
    if (value === null) {
        return FALLBACK_VALUE;
    }
    return `${numberFormatter.format(value)}%`;
};
const formatCount = (value, suffix) => {
    if (value === null) {
        return FALLBACK_VALUE;
    }
    const formatted = integerFormatter.format(value);
    return suffix ? `${formatted} ${suffix}` : formatted;
};
const formatBytesPerMinute = (value) => {
    if (value === null) {
        return FALLBACK_VALUE;
    }
    const gigabytes = value / (1024 * 1024 * 1024);
    return `${numberFormatter.format(gigabytes)} GB/dk`;
};
const formatLatency = (value) => {
    if (value === null) {
        return FALLBACK_VALUE;
    }
    return `${integerFormatter.format(value)} ms`;
};
const fetchMetric = async (descriptor) => {
    const primaryQuery = descriptor.query;
    if (!isNonEmptyString(primaryQuery)) {
        throw new Error("Prometheus query is not configured");
    }
    const secondaryQuery = descriptor.secondaryQuery;
    const [primaryResult, secondaryResult] = await Promise.all([
        queryInstant(primaryQuery.trim()),
        isNonEmptyString(secondaryQuery)
            ? queryInstant(secondaryQuery.trim())
            : Promise.resolve(null),
    ]);
    const value = descriptor.formatValue(primaryResult, secondaryResult);
    const metric = {
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
const createMetricFallback = (descriptor) => ({
    icon: descriptor.icon,
    title: descriptor.title,
    value: descriptor.fallbackValue,
    footerText: descriptor.footerText,
});
const buildMetrics = async (descriptors) => {
    const results = await Promise.allSettled(descriptors.map((descriptor) => fetchMetric(descriptor)));
    return results.map((result, index) => {
        const descriptor = descriptors[index];
        if (!descriptor) {
            logger.error("Missing metric descriptor for MCP dashboard", { index });
            return {
                icon: "AlertTriangle",
                title: "Bilinmeyen Metri̇k",
                value: FALLBACK_VALUE,
                footerText: "Veri bulunamadı",
            };
        }
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
const buildResponse = (moduleName, healthChecks, metrics) => ({
    module: moduleName,
    generatedAt: nowIso(),
    healthChecks,
    metrics,
});
const buildModuleDashboard = async (module, healthDescriptors, metricDescriptors) => {
    const [healthChecks, metrics] = await Promise.all([
        buildHealthChecks(healthDescriptors),
        buildMetrics(metricDescriptors),
    ]);
    return buildResponse(module, healthChecks, metrics);
};
const buildMuBotDashboard = async () => {
    const endpoints = config.mcpDashboard.mubot.healthEndpoints;
    const queries = config.mcpDashboard.mubot.metricsQueries;
    const healthDescriptors = [
        createHealthDescriptor("MuBot API", endpoints.api),
        createHealthDescriptor("PostgreSQL DB", endpoints.postgres),
        createHealthDescriptor("Data Ingestion Worker", endpoints.ingestion),
        createHealthDescriptor("Reconciliation Job", endpoints.reconciliation),
    ];
    const metricDescriptors = [
        createMetricDescriptor({
            title: "İşlenen Kayıt",
            icon: "FileInput",
            query: queries.recordsProcessed ?? null,
            footerText: "Son 1 saat",
            fallbackValue: "N/A",
            formatValue: (value) => formatCount(value, "kayıt"),
        }),
        createMetricDescriptor({
            title: "DB Yazma Gecikmesi",
            icon: "Database",
            query: queries.dbWriteLatency ?? null,
            footerText: "p95",
            fallbackValue: "N/A",
            formatValue: (value) => formatLatency(value),
            changeFormatter: (value) => value === null
                ? undefined
                : {
                    change: `${integerFormatter.format(value)} ms`,
                    changeType: value > 0 ? "increase" : "neutral",
                },
        }),
        createMetricDescriptor({
            title: "Reconciliation Oranı",
            icon: "Repeat",
            query: queries.reconciliationRate ?? null,
            footerText: "Son 24 saat",
            fallbackValue: "N/A",
            formatValue: (value) => formatPercentage(value),
        }),
        createMetricDescriptor({
            title: "Veri Kalite Skoru",
            icon: "Scale",
            query: queries.dataQualityScore ?? null,
            footerText: "Ortalama",
            fallbackValue: "N/A",
            formatValue: (value) => value === null ? FALLBACK_VALUE : `${value.toFixed(0)}/100`,
        }),
    ];
    return buildModuleDashboard("mubot", healthDescriptors, metricDescriptors);
};
const buildObservabilityDashboard = async () => {
    const endpoints = config.mcpDashboard.observability.healthEndpoints;
    const queries = config.mcpDashboard.observability.metricsQueries;
    const healthDescriptors = [
        createHealthDescriptor("Prometheus", endpoints.prometheus),
        createHealthDescriptor("Grafana", endpoints.grafana),
        createHealthDescriptor("Loki Ingester", endpoints.loki),
        createHealthDescriptor("Tempo Distributor", endpoints.tempo),
    ];
    const metricDescriptors = [
        createMetricDescriptor({
            title: "Aktif Hedefler",
            icon: "Server",
            query: queries.activeTargets ?? null,
            secondaryQuery: queries.totalTargets ?? null,
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
        }),
        createMetricDescriptor({
            title: "Log Ingestion Oranı",
            icon: "LogIn",
            query: queries.logIngestion ?? null,
            footerText: "Son 15 dakika",
            fallbackValue: "N/A",
            formatValue: (value) => formatBytesPerMinute(value),
        }),
        createMetricDescriptor({
            title: "Aktif Alarmlar",
            icon: "AlertCircle",
            query: queries.activeAlerts ?? null,
            footerText: "Alertmanager",
            fallbackValue: "N/A",
            formatValue: (value) => formatCount(value, "alarm"),
        }),
        createMetricDescriptor({
            title: "Query Gecikmesi (p99)",
            icon: "Timer",
            query: queries.queryLatency ?? null,
            footerText: "Grafana sorguları",
            fallbackValue: "N/A",
            formatValue: (value) => formatLatency(value),
        }),
    ];
    return buildModuleDashboard("observability", healthDescriptors, metricDescriptors);
};
const buildFinBotDashboard = async () => {
    const endpoints = config.mcpDashboard.finbot.healthEndpoints;
    const queries = config.mcpDashboard.finbot.metricsQueries;
    const healthDescriptors = [
        createHealthDescriptor("FinBot API", endpoints.api),
        createHealthDescriptor("Redis Cache", endpoints.redis),
        createHealthDescriptor("Forecast Engine", endpoints.forecast),
        createHealthDescriptor("Kyverno Sync", endpoints.kyverno),
    ];
    const metricDescriptors = [
        createMetricDescriptor({
            title: "Forecast CPU Kullanımı",
            icon: "Cpu",
            query: queries.cpuUsage ?? null,
            footerText: "Son 1 saat",
            fallbackValue: "N/A",
            formatValue: (value) => formatPercentage(value),
        }),
        createMetricDescriptor({
            title: "Forecast Bellek",
            icon: "MemoryStick",
            query: queries.memoryUsage ?? null,
            footerText: "Düne göre",
            fallbackValue: "N/A",
            formatValue: (value) => value === null ? FALLBACK_VALUE : `${numberFormatter.format(value)} GB`,
        }),
        createMetricDescriptor({
            title: "Aktif Senaryo Oturumları",
            icon: "Users",
            query: queries.activeSessions ?? null,
            footerText: "Bugün",
            fallbackValue: "N/A",
            formatValue: (value) => formatCount(value, "oturum"),
        }),
        createMetricDescriptor({
            title: "API Gecikmesi (p95)",
            icon: "Clock",
            query: queries.apiLatency ?? null,
            footerText: "Son 15 dakika",
            fallbackValue: "N/A",
            formatValue: (value) => formatLatency(value),
        }),
    ];
    return buildModuleDashboard("finbot", healthDescriptors, metricDescriptors);
};
const buildAiOpsDashboard = async () => {
    const endpoints = config.mcpDashboard.aiops.healthEndpoints;
    const queries = config.mcpDashboard.aiops.metricsQueries;
    const healthDescriptors = [
        createHealthDescriptor("AIOps API", endpoints.api),
        createHealthDescriptor("Correlation Engine", endpoints.correlation),
        createHealthDescriptor("Anomaly Detector", endpoints.anomaly),
        createHealthDescriptor("Telemetry Ingestion", endpoints.ingestion),
    ];
    const metricDescriptors = [
        createMetricDescriptor({
            title: "ML Model CPU",
            icon: "Cpu",
            query: queries.modelCpu ?? null,
            footerText: "Son 1 saat",
            fallbackValue: "N/A",
            formatValue: (value) => formatPercentage(value),
        }),
        createMetricDescriptor({
            title: "ML Model Bellek",
            icon: "MemoryStick",
            query: queries.modelMemory ?? null,
            footerText: "Düne göre",
            fallbackValue: "N/A",
            formatValue: (value) => value === null ? FALLBACK_VALUE : `${numberFormatter.format(value)} GB`,
        }),
        createMetricDescriptor({
            title: "Tespit Edilen Anomali",
            icon: "AlertTriangle",
            query: queries.anomaliesDetected ?? null,
            footerText: "Bugün",
            fallbackValue: "N/A",
            formatValue: (value) => formatCount(value, "anomali"),
        }),
        createMetricDescriptor({
            title: "Ingestion Gecikmesi",
            icon: "Network",
            query: queries.ingestionDelay ?? null,
            footerText: "Son 15 dakika",
            fallbackValue: "N/A",
            formatValue: (value) => formatLatency(value),
        }),
    ];
    return buildModuleDashboard("aiops", healthDescriptors, metricDescriptors);
};
const fetchModuleData = async (moduleName) => {
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
    async getDashboardData(moduleName) {
        try {
            logger.info("Fetching MCP dashboard data", { moduleName });
            const cacheKey = `mcp:dashboard:${moduleName}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
                logger.debug("MCP dashboard cache hit", { moduleName });
                return JSON.parse(cached);
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
        }
        catch (error) {
            logger.error("Failed to fetch MCP dashboard data", {
                moduleName,
                error: error instanceof Error ? error.message : String(error),
            });
            throw createError("Failed to fetch MCP dashboard data", 500);
        }
    },
};
//# sourceMappingURL=mcpDashboardService.js.map