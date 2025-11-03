import { mean, std } from 'mathjs';
import { logger } from '@/utils/logger.js';

/**
 * Simple correlation utilities (Sprint 2.6 - Predictive Correlation AI)
 * Stateless utility functions for correlation and anomaly detection
 */
export class CorrelationUtils {
  /**
   * Calculate Pearson correlation coefficient
   * @param x - First data series
   * @param y - Second data series
   * @returns Pearson correlation coefficient (-1 to 1)
   */
  static pearson(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      logger.warn('Invalid input for Pearson correlation', {
        xLength: x.length,
        yLength: y.length,
      });
      return 0;
    }

    try {
      const mx = mean(x) as number;
      const my = mean(y) as number;

      const numerator = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0);
      const stdX = std(x) as number;
      const stdY = std(y) as number;
      const denominator = (x.length - 1) * stdX * stdY;

      return denominator === 0 ? 0 : numerator / denominator;
    } catch (error) {
      logger.error('Error calculating Pearson correlation', { error });
      return 0;
    }
  }

  /**
   * Calculate Spearman rank correlation coefficient
   * @param x - First data series
   * @param y - Second data series
   * @returns Spearman correlation coefficient (-1 to 1)
   */
  static spearman(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      logger.warn('Invalid input for Spearman correlation', {
        xLength: x.length,
        yLength: y.length,
      });
      return 0;
    }

    try {
      const rank = (arr: number[]): number[] => {
        return arr
          .map((v, i) => ({ v, i }))
          .sort((a, b) => a.v - b.v)
          .map((o, i) => ({ ...o, r: i + 1 }))
          .sort((a, b) => a.i - b.i)
          .map((o) => o.r);
      };

      const rx = rank(x);
      const ry = rank(y);
      const n = x.length;
      const diff = rx.map((r, i) => r - ry[i]);
      const sumDiffSq = diff.reduce((s, d) => s + d * d, 0);

      // Handle division by zero
      const denominator = n * (n * n - 1);
      return denominator === 0 ? 0 : 1 - (6 * sumDiffSq) / denominator;
    } catch (error) {
      logger.error('Error calculating Spearman correlation', { error });
      return 0;
    }
  }

  /**
   * Calculate anomaly scores using Z-score method
   * @param values - Data series to analyze
   * @param threshold - Z-score threshold (default: 2)
   * @returns Array of 1 (anomaly) or 0 (normal) for each value
   */
  static anomalyScores(values: number[], threshold: number = 2): number[] {
    if (values.length === 0) {
      return [];
    }

    try {
      const m = mean(values) as number;
      const sd = std(values, 'uncorrected') as number;
      const safeSd = sd === 0 ? 1 : sd;

      return values.map((v) => (Math.abs(v - m) / safeSd > threshold ? 1 : 0));
    } catch (error) {
      logger.error('Error calculating anomaly scores', { error });
      return new Array(values.length).fill(0);
    }
  }

  /**
   * Get anomaly rate (ratio of anomalies in dataset)
   * @param values - Data series to analyze
   * @param threshold - Z-score threshold (default: 2)
   * @returns Anomaly rate between 0 and 1
   */
  static anomalyRate(values: number[], threshold: number = 2): number {
    if (values.length === 0) return 0;

    const scores = this.anomalyScores(values, threshold);
    const anomalyCount = scores.reduce((a, b) => a + b, 0);
    return anomalyCount / scores.length;
  }
}
