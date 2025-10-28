import { Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../../utils/logger.js';
import { redis } from '../storage/redisClient.js';

interface MetricSeries {
  metric: string;
  values: number[];
  timestamps: number[];
}

interface CorrelationResult {
  metric1: string;
  metric2: string;
  pearson: number;
  spearman: number;
  strength: 'weak' | 'moderate' | 'strong';
  significance: number;
}

interface CorrelationMatrix {
  metrics: string[];
  correlations: CorrelationResult[];
  generatedAt: number;
  cacheKey: string;
}

export class CorrelationEngine {
  private prometheusUrl: string;
  private cacheTimeout: number;

  constructor(prometheusUrl: string = 'http://prometheus:9090') {
    this.prometheusUrl = prometheusUrl;
    this.cacheTimeout = 300; // 5 minutes
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearson(series1: number[], series2: number[]): number {
    if (series1.length !== series2.length) {
      throw new Error('Series length mismatch');
    }

    const n = series1.length;
    if (n < 2) return 0;

    const mean1 = series1.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = series2.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = series1[i] - mean1;
      const diff2 = series2[i] - mean2;
      
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate Spearman rank correlation coefficient
   */
  private calculateSpearman(series1: number[], series2: number[]): number {
    if (series1.length !== series2.length) {
      throw new Error('Series length mismatch');
    }

    const n = series1.length;
    if (n < 2) return 0;

    // Create rank arrays
    const rank1 = this.getRanks(series1);
    const rank2 = this.getRanks(series2);

    // Calculate Pearson correlation on ranks
    return this.calculatePearson(rank1, rank2);
  }

  /**
   * Get ranks for a series (handles ties)
   */
  private getRanks(series: number[]): number[] {
    const indexed = series.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);

    const ranks = new Array(series.length);
    let currentRank = 1;

    for (let i = 0; i < indexed.length; i++) {
      if (i > 0 && indexed[i].val !== indexed[i - 1].val) {
        currentRank = i + 1;
      }
      ranks[indexed[i].idx] = currentRank;
    }

    return ranks;
  }

  /**
   * Determine correlation strength
   */
  private getCorrelationStrength(correlation: number): 'weak' | 'moderate' | 'strong' {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'strong';
    if (abs >= 0.3) return 'moderate';
    return 'weak';
  }

  /**
   * Fetch metric data from Prometheus
   */
  async fetchMetricData(metric: string, timeRange: string = '1h'): Promise<MetricSeries> {
    try {
      const query = `${metric}[${timeRange}]`;
      const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
        params: { query }
      });

      const data = response.data.data?.result?.[0];
      if (!data) {
        throw new Error(`No data found for metric: ${metric}`);
      }

      const values = data.values?.map(([timestamp, value]) => parseFloat(value)) || [];
      const timestamps = data.values?.map(([timestamp]) => parseInt(timestamp)) || [];

      return {
        metric,
        values,
        timestamps
      };
    } catch (error) {
      logger.error('Error fetching metric data', { metric, error });
      throw error;
    }
  }

  /**
   * Calculate correlation between two metrics
   */
  async calculateCorrelation(
    metric1: string,
    metric2: string,
    timeRange: string = '1h'
  ): Promise<CorrelationResult> {
    try {
      // Fetch data for both metrics
      const [series1, series2] = await Promise.all([
        this.fetchMetricData(metric1, timeRange),
        this.fetchMetricData(metric2, timeRange)
      ]);

      // Ensure same length (take minimum)
      const minLength = Math.min(series1.values.length, series2.values.length);
      const values1 = series1.values.slice(0, minLength);
      const values2 = series2.values.slice(0, minLength);

      // Calculate correlations
      const pearson = this.calculatePearson(values1, values2);
      const spearman = this.calculateSpearman(values1, values2);
      const strength = this.getCorrelationStrength(pearson);

      // Calculate significance (simplified)
      const significance = Math.abs(pearson) > 0.5 ? 0.95 : Math.abs(pearson) * 0.8;

      return {
        metric1,
        metric2,
        pearson: Math.round(pearson * 1000) / 1000,
        spearman: Math.round(spearman * 1000) / 1000,
        strength,
        significance: Math.round(significance * 1000) / 1000
      };
    } catch (error) {
      logger.error('Error calculating correlation', { metric1, metric2, error });
      throw error;
    }
  }

  /**
   * Generate correlation matrix for multiple metrics
   */
  async generateCorrelationMatrix(
    metrics: string[],
    timeRange: string = '1h'
  ): Promise<CorrelationMatrix> {
    const cacheKey = `correlation_matrix:${metrics.sort().join(',')}:${timeRange}`;
    
    try {
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info('Returning cached correlation matrix', { cacheKey });
        return JSON.parse(cached);
      }

      const correlations: CorrelationResult[] = [];
      
      // Calculate correlations for all pairs
      for (let i = 0; i < metrics.length; i++) {
        for (let j = i + 1; j < metrics.length; j++) {
          try {
            const correlation = await this.calculateCorrelation(
              metrics[i],
              metrics[j],
              timeRange
            );
            correlations.push(correlation);
          } catch (error) {
            logger.warn('Failed to calculate correlation', {
              metric1: metrics[i],
              metric2: metrics[j],
              error
            });
          }
        }
      }

      const matrix: CorrelationMatrix = {
        metrics,
        correlations,
        generatedAt: Date.now(),
        cacheKey
      };

      // Cache the result
      await redis.setex(cacheKey, this.cacheTimeout, JSON.stringify(matrix));
      
      logger.info('Generated correlation matrix', {
        metrics: metrics.length,
        correlations: correlations.length,
        cacheKey
      });

      return matrix;
    } catch (error) {
      logger.error('Error generating correlation matrix', { metrics, error });
      throw error;
    }
  }

  /**
   * Get strong correlations only
   */
  async getStrongCorrelations(
    metrics: string[],
    threshold: number = 0.7,
    timeRange: string = '1h'
  ): Promise<CorrelationResult[]> {
    const matrix = await this.generateCorrelationMatrix(metrics, timeRange);
    return matrix.correlations.filter(corr => Math.abs(corr.pearson) >= threshold);
  }

  /**
   * Predict metric impact based on correlations
   */
  async predictMetricImpact(
    targetMetric: string,
    metrics: string[],
    timeRange: string = '1h'
  ): Promise<{ metric: string; impact: number; correlation: number }[]> {
    const impacts: { metric: string; impact: number; correlation: number }[] = [];

    for (const metric of metrics) {
      if (metric === targetMetric) continue;

      try {
        const correlation = await this.calculateCorrelation(targetMetric, metric, timeRange);
        const impact = Math.abs(correlation.pearson) * correlation.significance;
        
        impacts.push({
          metric,
          impact: Math.round(impact * 1000) / 1000,
          correlation: correlation.pearson
        });
      } catch (error) {
        logger.warn('Failed to predict impact', { targetMetric, metric, error });
      }
    }

    return impacts.sort((a, b) => b.impact - a.impact);
  }
}

export default CorrelationEngine;

