import { config } from "@/config/index.js";
import { logger } from "@/utils/logger.js";
const DEFAULT_TIMEOUT_MS = 5000;
const getTimeout = () => {
    return config.mcpDashboard.prometheus.timeoutMs ?? DEFAULT_TIMEOUT_MS;
};
const buildHeaders = () => {
    const headers = {
        Accept: "application/json",
    };
    if (config.mcpDashboard.prometheus.authToken) {
        headers.Authorization = `Bearer ${config.mcpDashboard.prometheus.authToken}`;
    }
    return headers;
};
export const queryInstant = async (query) => {
    const baseUrl = config.mcpDashboard.prometheus.baseUrl;
    if (!baseUrl) {
        logger.warn("Prometheus base URL is not configured", { query });
        return null;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeout());
    try {
        const url = new URL("/api/v1/query", baseUrl);
        url.searchParams.set("query", query);
        const response = await fetch(url, {
            method: "GET",
            headers: buildHeaders(),
            signal: controller.signal,
        });
        if (!response.ok) {
            logger.warn("Prometheus query failed", {
                query,
                status: response.status,
                statusText: response.statusText,
            });
            return null;
        }
        const payload = (await response.json());
        if (payload.status !== "success") {
            logger.warn("Prometheus query returned non-success status", {
                query,
                status: payload.status,
                errorType: payload.errorType,
                error: payload.error,
            });
            return null;
        }
        const vector = payload.data.result[0];
        if (!vector || !vector.value || vector.value.length < 2) {
            logger.warn("Prometheus query returned no data", { query });
            return null;
        }
        const rawValue = Number(vector.value[1]);
        if (Number.isNaN(rawValue)) {
            logger.warn("Prometheus query value is not numeric", { query, value: vector.value[1] });
            return null;
        }
        return rawValue;
    }
    catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            logger.warn("Prometheus query aborted due to timeout", { query });
            return null;
        }
        logger.error("Prometheus query execution failed", {
            query,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
    finally {
        clearTimeout(timeout);
    }
};
//# sourceMappingURL=prometheusClient.js.map