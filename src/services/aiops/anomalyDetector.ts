import { logger } from '@/utils/logger.js';
import { std, mean } from 'mathjs';

interface AnomalyData {
  values: number[];
  timestamps: number[];
}

interface PercentileResult {
  p50: number;
  p75: number;
  p95: number;
  p99: number;
  mean: number;
  std: number;
}

interface AnomalyScore {
  metric: string;
  score: number;
  percentile: 'p95' | 'p99';
  isAnomaly: boolean;
  deviation: number;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AggregatedAnomaly {
  scores: AnomalyScore[];
  aggregatedScore: number;
  criticalCount: number;
  highCount: number;
  timestamp: number;
}

export class AnomalyDetector {
  /**
   * Calculate percentiles from data array
   */
  private calculatePercentiles(data: number[]): PercentileResult {
    if (data.length === 0) {
      return { p50: 0, p75: 0, p95: 0, p99: 0, mean: 0, std: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: this.getPercentile(sorted, 50, len),
      p75: this.getPercentile(sorted, 75, len),
      p95: this.getPercentile(sorted, 95, len),
      p99: this.getPercentile(sorted, 99, len),
      mean: mean(sorted) as unknown as number,
      std: std(sorted) as unknown as number
    };
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sorted: number[], percentile: number, length: number): number {
    const index = (percentile / 100) * (length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate Z-score for anomaly detection
   */
  private calculateZScore(value: number, mean: number, std: number): number {
    if (std === 0) return 0;
    return (value - mean) / std;
  }

  /**
   * Detect anomalies in data (public method for routes)
   */
  detectAnomalies(data: AnomalyData): AnomalyScore[] {
    const results: AnomalyScore[] = [];
    
    // Detect p95 and p99 anomalies
    const p95Result = this.detectp95Anomaly(data);
    if (p95Result.result) {
      results.push(p95Result.result);
    }
    
    const p99Result = this.detectp99Anomaly(data);
    if (p99Result.result) {
      results.push(p99Result.result);
    }
    
    return results;
  }

  /**
   * Detect anomalies in p95 percentile
   */
  detectp95Anomaly(data: AnomalyData): {
    result: AnomalyScore | null;
    percentiles: PercentileResult;
  } {
    const percentiles = this.calculatePercentiles(data.values);
    const zScore = this.calculateZScore(percentiles.p95, percentiles.mean, percentiles.std);
    
    const isAnomaly = Math.abs(zScore) > 2.5; // 99% confidence interval
    const severity = this.getSeverityFromZScore(Math.abs(zScore));

    const result: AnomalyScore = {
      metric: 'p95',
      score: Math.round(zScore * 100) / 100,
      percentile: 'p95',
      isAnomaly,
      deviation: percentiles.p95 - percentiles.mean,
      timestamp: data.timestamps[data.timestamps.length - 1] || Date.now(),
      severity
    };

    return {
      result,
      percentiles
    };
  }

  /**
   * Detect anomalies in p99 percentile
   */
  detectp99Anomaly(data: AnomalyData): {
    result: AnomalyScore | null;
    percentiles: PercentileResult;
  } {
    const percentiles = this.calculatePercentiles(data.values);
    const zScore = this.calculateZScore(percentiles.p99, percentiles.mean, percentiles.std);
    
    const isAnomaly = Math.abs(zScore) > 2.5; // 99% confidence interval
    const severity = this.getSeverityFromZScore(Math.abs(zScore));

    const result: AnomalyScore = {
      metric: 'p99',
      score: Math.round(zScore * 100) / 100,
      percentile: 'p99',
      isAnomaly,
      deviation: percentiles.p99 - percentiles.mean,
      timestamp: data.timestamps[data.timestamps.length - 1] || Date.now(),
      severity
    };

    return {
      result,
      percentiles
    };
  }

  /**
   * Get severity based on Z-score
   */
  private getSeverityFromZScore(absZScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (absZScore >= 3.5) return 'critical';
    if (absZScore >= 3.0) return 'high';
    if (absZScore >= 2.5) return 'medium';
    return 'low';
  }

  /**
   * Aggregate anomaly scores
   */
  aggregateAnomalyScores(scores: AnomalyScore[]): AggregatedAnomaly {
    if (scores.length === 0) {
      return {
        scores: [],
        aggregatedScore: 0,
        criticalCount: 0,
        highCount: 0,
        timestamp: Date.now()
      };
    }

    // Weighted aggregation: critical and high severity get higher weights
    const weights = {
      critical: 1.0,
      high: 0.7,
      medium: 0.4,
      low: 0.2
    };

    let weightedSum = 0;
    let totalWeight = 0;
    let criticalCount = 0;
    let highCount = 0;

    scores.forEach(score => {
      const weight = weights[score.severity];
      weightedSum += Math.abs(score.score) * weight;
      totalWeight += weight;

      if (score.severity === 'critical') criticalCount++;
      if (score.severity === 'high') highCount++;
    });

    const aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      scores,
      aggregatedScore: Math.round(aggregatedScore * 100) / 100,
      criticalCount,
      highCount,
      timestamp: Date.now()
    };
  }

  /**
   * Identify critical anomalies
   */
  identifyCriticalAnomalies(anomalies: AnomalyScore[]): AnomalyScore[] {
    return anomalies.filter(anomaly => 
      (anomaly.severity === 'critical' || anomaly.severity === 'high') && 
      anomaly.isAnomaly
    ).sort((a, b) => {
      // Sort by severity first, then by score
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return Math.abs(b.score) - Math.abs(a.score);
    });
  }

  /**
   * Detect trend deviation
   */
  detectTrendDeviation(data: AnomalyData, windowSize: number = 10): {
    trend: 'increasing' | 'decreasing' | 'stable';
    deviation: number;
    isSignificant: boolean;
  } {
    if (data.values.length < windowSize * 2) {
      return { trend: 'stable', deviation: 0, isSignificant: false };
    }

    const recent = data.values.slice(-windowSize);
    const previous = data.values.slice(-windowSize * 2, -windowSize);

    const recentMean = mean(recent) as number;
    const previousMean = mean(previous) as number;

    const deviation = ((recentMean - previousMean) / Math.max(previousMean, 1)) * 100;
    const isSignificant = Math.abs(deviation) > 10; // > 10% change

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (deviation > 5) trend = 'increasing';
    else if (deviation < -5) trend = 'decreasing';
    else trend = 'stable';

    return {
      trend,
      deviation: Math.round(deviation * 100) / 100,
      isSignificant
    };
  }

  /**
   * Get anomaly timeline for visualization
   */
  generateAnomalyTimeline(scores: AnomalyScore[], timeRange: string = '1h'): {
    timeline: Array<{ timestamp: number; score: number; severity: string }>;
    summary: {
      totalAnomalies: number;
      criticalAnomalies: number;
      highAnomalies: number;
      averageScore: number;
    };
  } {
    const timeline = scores.map(s => ({
      timestamp: s.timestamp,
      score: s.score,
      severity: s.severity
    }));

    const criticalAnomalies = scores.filter(s => s.severity === 'critical').length;
    const highAnomalies = scores.filter(s => s.severity === 'high').length;
    const avgScore = mean(scores.map(s => Math.abs(s.score))) as number;

    return {
      timeline,
      summary: {
        totalAnomalies: scores.filter(s => s.isAnomaly).length,
        criticalAnomalies,
        highAnomalies,
        averageScore: Math.round(avgScore * 100) / 100
      }
    };
  }
}

export default AnomalyDetector;

