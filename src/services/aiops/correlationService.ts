import { redis } from '@/services/storage/redisClient.js';
import { logger } from '@/utils/logger.js';
import { CorrelationUtils } from './correlationUtils.js';
import { Gauge } from 'prom-client';
import { register } from '@/middleware/prometheus.js';

/**
 * Prometheus metrics for correlation analysis
 */
export const correlationScoreGauge = new Gauge({
  name: 'ai_correlation_score',
  help: 'Last computed correlation score',
  labelNames: ['type'],
  registers: [register],
});

export const anomalyRateGauge = new Gauge({
  name: 'ai_anomaly_rate',
  help: 'Ratio of detected anomalies in recent window',
  registers: [register],
});

// Register metrics
register.registerMetric(correlationScoreGauge);
register.registerMetric(anomalyRateGauge);

/**
 * Interface for metric data stored in Redis
 */
interface MetricDataPoint {
  metricA: number;
  metricB: number;
  timestamp?: number;
}

/**
 * Correlation Service - Redis-based correlation computation
 * Reads from Redis metrics:window list and computes correlations
 */
export async function computeCorrelation(): Promise<{
  pearson: number;
  spearman: number;
  anomalyRate: number;
  dataPoints: number;
}> {
  try {
    // Get recent metrics from Redis window
    const recent = await redis.lrange('metrics:window', -50, -1);
    
    if (recent.length < 10) {
      logger.warn('Insufficient data for correlation', {
        dataPoints: recent.length,
        required: 10,
      });
      return {
        pearson: 0,
        spearman: 0,
        anomalyRate: 0,
        dataPoints: recent.length,
      };
    }

    // Parse metric data
    const data: MetricDataPoint[] = recent.map((r) => {
      try {
        return JSON.parse(r);
      } catch (error) {
        logger.warn('Failed to parse metric data point', { raw: r, error });
        return null;
      }
    }).filter((d): d is MetricDataPoint => d !== null && typeof d.metricA === 'number' && typeof d.metricB === 'number');

    if (data.length < 10) {
      logger.warn('Insufficient valid data points for correlation', {
        validPoints: data.length,
        required: 10,
      });
      return {
        pearson: 0,
        spearman: 0,
        anomalyRate: 0,
        dataPoints: data.length,
      };
    }

    // Extract series
    const x = data.map((d) => d.metricA);
    const y = data.map((d) => d.metricB);

    // Calculate correlations
    const pearson = CorrelationUtils.pearson(x, y);
    const spearman = CorrelationUtils.spearman(x, y);
    const anomalies = CorrelationUtils.anomalyScores(y, 2);
    const anomalyRate = anomalies.reduce((a, b) => a + b, 0) / anomalies.length;

    // Update Prometheus metrics
    correlationScoreGauge.set({ type: 'pearson' }, pearson);
    correlationScoreGauge.set({ type: 'spearman' }, spearman);
    anomalyRateGauge.set(anomalyRate);

    logger.info('AI correlation metrics computed', {
      pearson: Math.round(pearson * 1000) / 1000,
      spearman: Math.round(spearman * 1000) / 1000,
      anomalyRate: Math.round(anomalyRate * 1000) / 1000,
      anomalies: anomalies.filter((a) => a === 1).length,
      dataPoints: data.length,
    });

    return {
      pearson: Math.round(pearson * 1000) / 1000,
      spearman: Math.round(spearman * 1000) / 1000,
      anomalyRate: Math.round(anomalyRate * 1000) / 1000,
      dataPoints: data.length,
    };
  } catch (error) {
    logger.error('Correlation computation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Store metric data point in Redis window
 * @param metricA - First metric value
 * @param metricB - Second metric value
 * @param timestamp - Optional timestamp
 */
export async function storeMetricPoint(
  metricA: number,
  metricB: number,
  timestamp?: number
): Promise<void> {
  try {
    const dataPoint = {
      metricA,
      metricB,
      timestamp: timestamp || Date.now(),
    };

    await redis.lpush('metrics:window', JSON.stringify(dataPoint));
    // Keep only last 1000 points
    await redis.ltrim('metrics:window', 0, 999);

    logger.debug('Metric data point stored', {
      metricA,
      metricB,
      timestamp: dataPoint.timestamp,
    });
  } catch (error) {
    logger.error('Failed to store metric data point', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
