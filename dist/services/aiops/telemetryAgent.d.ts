export interface TelemetryData {
    timestamp: number;
    avgLatency: number;
    drift: boolean;
    metrics: Record<string, number>;
}
interface PrometheusSample {
    metric: Record<string, string>;
    value: [number, string];
}
interface PrometheusQueryResponse {
    status: 'success' | 'error';
    data?: {
        resultType?: string;
        result?: PrometheusSample[];
    };
    errorType?: string;
    error?: string;
}
export declare class TelemetryAgent {
    private prometheusUrl;
    constructor(prometheusUrl?: string);
    /**
     * Collect metrics from Prometheus
     */
    collectMetrics(): Promise<PrometheusQueryResponse>;
    /**
     * Detect drift between actual and predicted values
     */
    detectDrift(actual: number, predicted: number, threshold?: number): boolean;
    /**
     * Calculate average latency from metrics
     */
    calculateAverageLatency(data: PrometheusQueryResponse): number;
    /**
     * Run telemetry collection and detection
     */
    run(_interval?: number): Promise<TelemetryData>;
    /**
     * Get current system state
     */
    getSystemState(threshold?: number): Promise<TelemetryData>;
}
export {};
//# sourceMappingURL=telemetryAgent.d.ts.map