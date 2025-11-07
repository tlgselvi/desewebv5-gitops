import axios from 'axios';
import { logger } from '../../utils/logger.js';
export class TelemetryAgent {
    prometheusUrl;
    constructor(prometheusUrl = 'http://prometheus-service.monitoring:9090') {
        this.prometheusUrl = prometheusUrl;
    }
    /**
     * Collect metrics from Prometheus
     */
    async collectMetrics() {
        try {
            const query = 'rate(http_request_duration_seconds_sum[5m])';
            const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
                params: { query },
            });
            return response.data;
        }
        catch (error) {
            logger.error('TelemetryAgent: failed to collect metrics from Prometheus', {
                error: error instanceof Error ? error.message : String(error),
                prometheusUrl: this.prometheusUrl,
            });
            return {
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * Detect drift between actual and predicted values
     */
    detectDrift(actual, predicted, threshold = 0.05) {
        const drift = Math.abs(actual - predicted) / Math.max(predicted, 1e-6);
        return drift > threshold;
    }
    /**
     * Calculate average latency from metrics
     */
    calculateAverageLatency(data) {
        try {
            const results = data.data?.result ?? [];
            const values = results
                .map((item) => {
                const rawValue = item.value?.[1];
                const parsed = rawValue ? Number.parseFloat(rawValue) : Number.NaN;
                return Number.isNaN(parsed) ? null : parsed;
            })
                .filter((value) => value !== null);
            if (values.length === 0) {
                return 0;
            }
            const sum = values.reduce((acc, val) => acc + val, 0);
            return sum / values.length;
        }
        catch (error) {
            logger.error('TelemetryAgent: error calculating average latency', {
                error: error instanceof Error ? error.message : String(error),
            });
            return 0;
        }
    }
    /**
     * Run telemetry collection and detection
     */
    async run(_interval = 60000) {
        const data = await this.collectMetrics();
        const avgLatency = this.calculateAverageLatency(data);
        const drift = this.detectDrift(avgLatency, 1.0);
        const telemetryData = {
            timestamp: Date.now(),
            avgLatency,
            drift,
            metrics: {
                avgLatency,
                predictedLatency: 1.0,
                driftPercentage: avgLatency > 0 ? ((avgLatency - 1.0) / 1.0) * 100 : 0,
            },
        };
        logger.info('TelemetryAgent: telemetry data collected', telemetryData);
        return telemetryData;
    }
    /**
     * Get current system state
     */
    async getSystemState(threshold = 0.05) {
        const data = await this.collectMetrics();
        const avgLatency = this.calculateAverageLatency(data);
        const drift = this.detectDrift(avgLatency, 1.0, threshold);
        const telemetryData = {
            timestamp: Date.now(),
            avgLatency,
            drift,
            metrics: {
                avgLatency,
                predictedLatency: 1.0,
                driftPercentage: avgLatency > 0 ? ((avgLatency - 1.0) / 1.0) * 100 : 0,
            },
        };
        return telemetryData;
    }
}
//# sourceMappingURL=telemetryAgent.js.map