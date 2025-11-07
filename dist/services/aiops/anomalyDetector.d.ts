export type AnomalySeverity = "low" | "medium" | "high" | "critical";
export interface AnomalyDetectionPayload {
    metric: string;
    values: number[];
    timestamps: number[];
}
export interface AnomalyScore {
    index: number;
    value: number;
    score: number;
    severity: AnomalySeverity;
    deviation: number;
    percentile: string;
    isAnomaly: boolean;
    timestamp: number;
    message?: string;
    context?: Record<string, unknown>;
}
export interface PercentileDetectionResult {
    result: AnomalyScore | null;
    percentiles: PercentileSnapshot;
}
export interface AggregatedAnomalySummary {
    aggregatedScore: number;
    totalCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    severityDistribution: Record<AnomalySeverity, number>;
    timeline: Array<{
        timestamp: number;
        severity: AnomalySeverity;
        score: number;
    }>;
}
export interface TrendDeviationResult {
    trend: "increasing" | "decreasing" | "stable";
    deviation: number;
    isSignificant: boolean;
    windowSize: number;
    average: number;
    lastValue: number;
}
export interface TimelineRange {
    start?: number;
    end?: number;
    granularity?: "minute" | "hour" | "day";
}
export interface TimelineEntry {
    timestamp: number;
    severity: AnomalySeverity;
    score: number;
}
export interface TimelineSummary {
    totalAnomalies: number;
    criticalAnomalies: number;
    highAnomalies: number;
    averageScore: number;
}
export interface AnomalyTimeline {
    timeline: TimelineEntry[];
    summary: TimelineSummary;
    range: {
        start: number;
        end: number;
    };
}
interface PercentileSnapshot {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
}
export declare class AnomalyDetector {
    detectAnomalies(payload: AnomalyDetectionPayload): AnomalyScore[];
    detectp95Anomaly(payload: {
        values: number[];
        timestamps: number[];
    }): PercentileDetectionResult;
    detectp99Anomaly(payload: {
        values: number[];
        timestamps: number[];
    }): PercentileDetectionResult;
    aggregateAnomalyScores(scores: AnomalyScore[]): AggregatedAnomalySummary;
    identifyCriticalAnomalies(anomalies: AnomalyScore[]): AnomalyScore[];
    detectTrendDeviation(payload: {
        values: number[];
        timestamps: number[];
    }, windowSize: number): TrendDeviationResult;
    generateAnomalyTimeline(scores: AnomalyScore[], range?: TimelineRange): AnomalyTimeline;
}
export declare const anomalyDetector: AnomalyDetector;
export {};
//# sourceMappingURL=anomalyDetector.d.ts.map