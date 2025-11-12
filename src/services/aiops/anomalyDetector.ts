import { mean, quantileSeq } from "mathjs";
import { logger } from "@/utils/logger.js";
import { AnomalyScorer } from "@/services/aiops/anomalyScorer.js";

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
  timeline: Array<{ timestamp: number; severity: AnomalySeverity; score: number }>;
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
  range: { start: number; end: number };
}

interface PercentileSnapshot {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

const severityOrder: Record<AnomalySeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const determineSeverity = (score: number): AnomalySeverity => {
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

const toFiniteNumber = (value: number | bigint | unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "object" && value !== null && "valueOf" in value) {
    const numeric = Number((value as { valueOf: () => number }).valueOf());
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
};

const calculatePercentiles = (values: number[]): PercentileSnapshot => {
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
    p50: toFiniteNumber(quantileSeq(sortedValues, 0.5) as number),
    p75: toFiniteNumber(quantileSeq(sortedValues, 0.75) as number),
    p90: toFiniteNumber(quantileSeq(sortedValues, 0.9) as number),
    p95: toFiniteNumber(quantileSeq(sortedValues, 0.95) as number),
    p99: toFiniteNumber(quantileSeq(sortedValues, 0.99) as number),
  };
};

const createAnomalyScore = (
  index: number,
  value: number,
  score: number,
  timestamps: number[],
  percentile: string,
  context?: Record<string, unknown>,
): AnomalyScore => {
  const severity = determineSeverity(score);
  const deviation = score;
  const timestamp = timestamps[index] ?? Date.now();

  const anomalyScore: AnomalyScore = {
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
  detectAnomalies(payload: AnomalyDetectionPayload): AnomalyScore[] {
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

  detectp95Anomaly(payload: { values: number[]; timestamps: number[] }): PercentileDetectionResult {
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

    const anomalyContext: Record<string, unknown> = {
      threshold,
    };

    const anomaly = createAnomalyScore(index, metricValue, score, timestamps, "p95", anomalyContext);

    return {
      result: anomaly,
      percentiles,
    };
  }

  detectp99Anomaly(payload: { values: number[]; timestamps: number[] }): PercentileDetectionResult {
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

    const anomalyContext: Record<string, unknown> = {
      threshold,
    };

    const anomaly = createAnomalyScore(index, metricValue, score, timestamps, "p99", anomalyContext);

    return {
      result: anomaly,
      percentiles,
    };
  }

  aggregateAnomalyScores(scores: AnomalyScore[]): AggregatedAnomalySummary {
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

    const severityDistribution: Record<AnomalySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let aggregatedScore = 0;
    const timeline: Array<{ timestamp: number; severity: AnomalySeverity; score: number }> = [];

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

  identifyCriticalAnomalies(anomalies: AnomalyScore[]): AnomalyScore[] {
    return anomalies.filter((anomaly) => severityOrder[anomaly.severity] >= severityOrder.high);
  }

  detectTrendDeviation(
    payload: { values: number[]; timestamps: number[] },
    windowSize: number,
  ): TrendDeviationResult {
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
    const average = (mean(window) as number) ?? 0;
    const lastValue = window[window.length - 1] ?? average;
    const deviation = lastValue - average;

    let trend: TrendDeviationResult["trend"] = "stable";
    if (deviation > 0.1 * average) {
      trend = "increasing";
    } else if (deviation < -0.1 * average) {
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

  generateAnomalyTimeline(
    scores: AnomalyScore[],
    range?: TimelineRange,
  ): AnomalyTimeline {
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

    const summary: TimelineSummary = {
      totalAnomalies: filteredScores.length,
      criticalAnomalies: filteredScores.filter((score) => score.severity === "critical").length,
      highAnomalies: filteredScores.filter((score) => score.severity === "high").length,
      averageScore:
        filteredScores.length > 0
          ? filteredScores.reduce((acc, score) => acc + Math.abs(score.score), 0) / filteredScores.length
          : 0,
    };

    const timelineEntries: TimelineEntry[] = filteredScores
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

