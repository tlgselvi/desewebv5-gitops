import { mean, quantileSeq } from "mathjs";
import { logger } from "@/utils/logger.js";
import { AnomalyScorer } from "@/services/aiops/anomalyScorer.js";
const severityOrder = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
};
const determineSeverity = (score) => {
    const absScore = Math.abs(score);
    if (absScore >= 3.5) {
        return "critical";
    }
    if (absScore >= 3) {
        return "high";
    }
    if (absScore >= 2) {
        return "medium";
    }
    return "low";
};
const toFiniteNumber = (value) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === "bigint") {
        return Number(value);
    }
    if (typeof value === "object" && value !== null && "valueOf" in value) {
        const numeric = Number(value.valueOf());
        return Number.isFinite(numeric) ? numeric : 0;
    }
    return 0;
};
const calculatePercentiles = (values) => {
    if (values.length === 0) {
        return {
            p50: 0,
            p75: 0,
            p90: 0,
            p95: 0,
            p99: 0,
        };
    }
    const sortedValues = [...values].sort((a, b) => a - b);
    return {
        p50: toFiniteNumber(quantileSeq(sortedValues, 0.5)),
        p75: toFiniteNumber(quantileSeq(sortedValues, 0.75)),
        p90: toFiniteNumber(quantileSeq(sortedValues, 0.9)),
        p95: toFiniteNumber(quantileSeq(sortedValues, 0.95)),
        p99: toFiniteNumber(quantileSeq(sortedValues, 0.99)),
    };
};
const createAnomalyScore = (index, value, score, timestamps, percentile, context) => {
    const severity = determineSeverity(score);
    const deviation = score;
    const timestamp = timestamps[index] ?? Date.now();
    const anomalyScore = {
        index,
        value,
        score,
        severity,
        deviation,
        percentile,
        isAnomaly: severityOrder[severity] >= severityOrder["medium"],
        timestamp,
        message: `${severity.toUpperCase()} anomaly detected (score: ${score.toFixed(2)})`,
    };
    if (context && Object.keys(context).length > 0) {
        anomalyScore.context = context;
    }
    return anomalyScore;
};
export class AnomalyDetector {
    detectAnomalies(payload) {
        const { metric, values, timestamps } = payload;
        if (values.length === 0) {
            logger.warn("Anomaly detection skipped: empty values", { metric });
            return [];
        }
        const zScores = AnomalyScorer.calculateZScore(values);
        const percentiles = calculatePercentiles(values);
        return zScores
            .map((score, index) => {
            const metricValue = values[index] ?? 0;
            return createAnomalyScore(index, metricValue, score, timestamps, "zscore", {
                percentileValues: percentiles,
            });
        })
            .filter((entry) => entry.isAnomaly);
    }
    detectp95Anomaly(payload) {
        const { values, timestamps } = payload;
        if (values.length === 0) {
            return {
                result: null,
                percentiles: {
                    p50: 0,
                    p75: 0,
                    p90: 0,
                    p95: 0,
                    p99: 0,
                },
            };
        }
        const percentiles = calculatePercentiles(values);
        const threshold = percentiles.p95;
        const index = values.findIndex((value) => value >= threshold);
        if (index === -1) {
            return { result: null, percentiles };
        }
        const metricValue = values[index] ?? threshold;
        const score = AnomalyScorer.getAnomalyScore(values, metricValue);
        const anomalyContext = {
            threshold,
        };
        const anomaly = createAnomalyScore(index, metricValue, score, timestamps, "p95", anomalyContext);
        return {
            result: anomaly,
            percentiles,
        };
    }
    detectp99Anomaly(payload) {
        const { values, timestamps } = payload;
        if (values.length === 0) {
            return {
                result: null,
                percentiles: {
                    p50: 0,
                    p75: 0,
                    p90: 0,
                    p95: 0,
                    p99: 0,
                },
            };
        }
        const percentiles = calculatePercentiles(values);
        const threshold = percentiles.p99;
        const index = values.findIndex((value) => value >= threshold);
        if (index === -1) {
            return { result: null, percentiles };
        }
        const metricValue = values[index] ?? threshold;
        const score = AnomalyScorer.getAnomalyScore(values, metricValue);
        const anomalyContext = {
            threshold,
        };
        const anomaly = createAnomalyScore(index, metricValue, score, timestamps, "p99", anomalyContext);
        return {
            result: anomaly,
            percentiles,
        };
    }
    aggregateAnomalyScores(scores) {
        if (scores.length === 0) {
            return {
                aggregatedScore: 0,
                totalCount: 0,
                criticalCount: 0,
                highCount: 0,
                mediumCount: 0,
                lowCount: 0,
                severityDistribution: {
                    low: 0,
                    medium: 0,
                    high: 0,
                    critical: 0,
                },
                timeline: [],
            };
        }
        const severityDistribution = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        };
        let aggregatedScore = 0;
        const timeline = [];
        for (const score of scores) {
            severityDistribution[score.severity] += 1;
            aggregatedScore += Math.abs(score.score);
            timeline.push({
                timestamp: score.timestamp,
                severity: score.severity,
                score: score.score,
            });
        }
        return {
            aggregatedScore,
            totalCount: scores.length,
            criticalCount: severityDistribution.critical,
            highCount: severityDistribution.high,
            mediumCount: severityDistribution.medium,
            lowCount: severityDistribution.low,
            severityDistribution,
            timeline: timeline.sort((a, b) => a.timestamp - b.timestamp),
        };
    }
    identifyCriticalAnomalies(anomalies) {
        return anomalies.filter((anomaly) => severityOrder[anomaly.severity] >= severityOrder.high);
    }
    detectTrendDeviation(payload, windowSize) {
        const { values } = payload;
        if (values.length === 0) {
            return {
                trend: "stable",
                deviation: 0,
                isSignificant: false,
                windowSize,
                average: 0,
                lastValue: 0,
            };
        }
        const sliceStart = Math.max(0, values.length - windowSize);
        const window = values.slice(sliceStart);
        const average = mean(window) ?? 0;
        const lastValue = window[window.length - 1] ?? average;
        const deviation = lastValue - average;
        let trend = "stable";
        if (deviation > 0.1 * average) {
            trend = "increasing";
        }
        else if (deviation < -0.1 * average) {
            trend = "decreasing";
        }
        return {
            trend,
            deviation,
            isSignificant: Math.abs(deviation) > Math.abs(average) * 0.1,
            windowSize,
            average,
            lastValue,
        };
    }
    generateAnomalyTimeline(scores, range) {
        if (scores.length === 0) {
            const now = Date.now();
            return {
                timeline: [],
                summary: {
                    totalAnomalies: 0,
                    criticalAnomalies: 0,
                    highAnomalies: 0,
                    averageScore: 0,
                },
                range: {
                    start: range?.start ?? now,
                    end: range?.end ?? now,
                },
            };
        }
        const start = range?.start ?? Math.min(...scores.map((score) => score.timestamp));
        const end = range?.end ?? Math.max(...scores.map((score) => score.timestamp));
        const filteredScores = scores.filter((score) => score.timestamp >= start && score.timestamp <= end);
        const summary = {
            totalAnomalies: filteredScores.length,
            criticalAnomalies: filteredScores.filter((score) => score.severity === "critical").length,
            highAnomalies: filteredScores.filter((score) => score.severity === "high").length,
            averageScore: filteredScores.length > 0
                ? filteredScores.reduce((acc, score) => acc + Math.abs(score.score), 0) / filteredScores.length
                : 0,
        };
        const timelineEntries = filteredScores
            .map((score) => ({
            timestamp: score.timestamp,
            severity: score.severity,
            score: score.score,
        }))
            .sort((a, b) => a.timestamp - b.timestamp);
        return {
            timeline: timelineEntries,
            summary,
            range: { start, end },
        };
    }
}
export const anomalyDetector = new AnomalyDetector();
//# sourceMappingURL=anomalyDetector.js.map