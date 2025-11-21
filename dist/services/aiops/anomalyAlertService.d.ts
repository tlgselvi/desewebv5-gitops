import type { AnomalyScore, AnomalySeverity } from "@/services/aiops/anomalyDetector.js";
interface AnomalyAlert {
    id: string;
    metric: string;
    anomalyScore: AnomalyScore;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    timestamp: number;
    isResolved: boolean;
    resolvedAt?: number;
    resolvedBy?: string;
}
interface AlertHistory {
    alerts: AnomalyAlert[];
    totalCount: number;
    criticalCount: number;
    highCount: number;
    timeRange: {
        start: number;
        end: number;
    };
}
export declare class AnomalyAlertService {
    private readonly STREAM_KEY;
    private readonly ALERT_TTL;
    private parseSeverity;
    private buildFieldsMap;
    private parsePayload;
    private mapMessageToAlert;
    /**
     * Create and send critical anomaly alert
     */
    createCriticalAlert(metric: string, anomalyScore: AnomalyScore, additionalContext?: Record<string, unknown>): Promise<AnomalyAlert>;
    /**
     * Generate human-readable alert message
     */
    private generateAlertMessage;
    /**
     * Get recent alerts from Redis Stream
     */
    getRecentAlerts(limit?: number, severity?: AnomalySeverity): Promise<AnomalyAlert[]>;
    /**
     * Get alert history for a time range
     */
    getAlertHistory(startTime: number, endTime?: number, severity?: AnomalySeverity): Promise<AlertHistory>;
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean>;
    /**
     * Get alert statistics
     */
    getAlertStats(timeRange?: string): Promise<{
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        resolved: number;
        unresolved: number;
    }>;
    /**
     * Parse time range string to milliseconds
     */
    private parseTimeRange;
}
export declare const anomalyAlertService: AnomalyAlertService;
export {};
//# sourceMappingURL=anomalyAlertService.d.ts.map