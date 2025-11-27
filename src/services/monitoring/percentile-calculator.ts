/**
 * Percentile Calculator Service
 * 
 * Calculates percentiles (p50, p95, p99) from Prometheus histograms
 */

import { register } from '@/middleware/prometheus.js';
import { updateApiResponseTimePercentiles } from '@/middleware/prometheus.js';
import { logger } from '@/utils/logger.js';
import client from 'prom-client';

/**
 * Calculate percentiles from histogram
 */
export function calculatePercentiles(
  histogram: client.Histogram,
  labels: Record<string, string>,
  percentiles: number[] = [0.5, 0.95, 0.99]
): Record<string, number> {
  const result: Record<string, number> = {};
  
  try {
    // Get histogram values
    const metric = histogram.hashMap[histogram.hashLabels(labels)];
    if (!metric) {
      return result;
    }
    
    // Calculate percentiles from buckets
    const buckets = metric.buckets;
    const total = metric.count;
    
    if (total === 0) {
      return result;
    }
    
    for (const percentile of percentiles) {
      const target = total * percentile;
      let cumulative = 0;
      
      for (let i = 0; i < buckets.length; i++) {
        cumulative += buckets[i];
        if (cumulative >= target) {
          // Linear interpolation between buckets
          const bucketStart = i > 0 ? histogram.bucketUpperBounds[i - 1] : 0;
          const bucketEnd = histogram.bucketUpperBounds[i];
          
          const prevCumulative = i > 0 ? buckets.slice(0, i).reduce((a, b) => a + b, 0) : 0;
          const bucketCount = buckets[i];
          
          if (bucketCount > 0) {
            const ratio = (target - prevCumulative) / bucketCount;
            result[`p${percentile * 100}`] = bucketStart + (bucketEnd - bucketStart) * ratio;
          } else {
            result[`p${percentile * 100}`] = bucketEnd;
          }
          break;
        }
      }
    }
  } catch (error) {
    logger.error('Error calculating percentiles', { error, labels });
  }
  
  return result;
}

/**
 * Update API response time percentiles from histogram
 */
export function updateApiResponseTimePercentilesFromHistogram(): void {
  try {
    // This would need access to the httpRequestDuration histogram
    // For now, we'll use a different approach - query Prometheus API
    logger.debug('Updating API response time percentiles from histogram');
    
    // In a real implementation, we would:
    // 1. Query Prometheus for histogram_quantile
    // 2. Update the gauge metrics with calculated percentiles
    // This is better done via PromQL queries in Grafana
  } catch (error) {
    logger.error('Error updating API response time percentiles', { error });
  }
}

/**
 * Query Prometheus for percentiles
 */
export async function queryPrometheusPercentiles(
  prometheusUrl: string,
  metricName: string,
  labels: Record<string, string> = {},
  percentiles: number[] = [0.5, 0.95, 0.99]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  
  try {
    // Build label selector
    const labelSelectors = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    const labelFilter = labelSelectors ? `{${labelSelectors}}` : '';
    
    // Query each percentile
    for (const percentile of percentiles) {
      const query = `histogram_quantile(${percentile}, rate(${metricName}_bucket${labelFilter}[5m]))`;
      
      const response = await fetch(
        `${prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        logger.warn(`Failed to query percentile ${percentile}`, { status: response.status });
        continue;
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data?.result?.length > 0) {
        const value = parseFloat(data.data.result[0].value[1]);
        if (!isNaN(value)) {
          result[`p${percentile * 100}`] = value;
        }
      }
    }
  } catch (error) {
    logger.error('Error querying Prometheus percentiles', { error, metricName, labels });
  }
  
  return result;
}

