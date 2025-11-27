/**
 * Performance Metrics Service
 * Collects and updates performance metrics periodically
 */

import { performance } from 'perf_hooks';
import { 
  updateApiResponseTimePercentiles, 
  memoryUsage, 
  cpuUsage,
  register 
} from '@/middleware/prometheus.js';
import { logger } from '@/utils/logger.js';
import { redis } from '@/services/storage/redisClient.js';

/**
 * Memory usage types
 */
type MemoryType = 'heapUsed' | 'heapTotal' | 'rss' | 'external';

/**
 * Update memory usage metrics
 */
export function updateMemoryMetrics(): void {
  try {
    const usage = process.memoryUsage();

    memoryUsage.set({ type: 'heapUsed' }, usage.heapUsed);
    memoryUsage.set({ type: 'heapTotal' }, usage.heapTotal);
    memoryUsage.set({ type: 'rss' }, usage.rss);
    memoryUsage.set({ type: 'external' }, usage.external);

    logger.debug('Memory metrics updated', {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      external: usage.external,
    });
  } catch (error) {
    logger.error('Failed to update memory metrics', { error });
  }
}

/**
 * CPU usage tracking
 */
let cpuUsageStartTime = process.cpuUsage();
let cpuUsageStartTimeMs = Date.now();

/**
 * Update CPU usage metrics
 */
export function updateCPUMetrics(): void {
  try {
    const currentUsage = process.cpuUsage(cpuUsageStartTime);
    const currentTimeMs = Date.now();
    const elapsedMs = currentTimeMs - cpuUsageStartTimeMs;

    // Calculate CPU percentage
    // cpuUsage is in microseconds, convert to seconds
    const userCpuSeconds = currentUsage.user / 1000000;
    const systemCpuSeconds = currentUsage.system / 1000000;
    const totalCpuSeconds = userCpuSeconds + systemCpuSeconds;
    const elapsedSeconds = elapsedMs / 1000;

    // CPU percentage = (CPU time / elapsed time) * 100
    // Multiplied by 100 to get percentage
    const cpuPercent = elapsedSeconds > 0 
      ? (totalCpuSeconds / elapsedSeconds) * 100 
      : 0;

    cpuUsage.set(Math.min(cpuPercent, 100)); // Cap at 100%

    // Reset for next calculation
    cpuUsageStartTime = process.cpuUsage();
    cpuUsageStartTimeMs = currentTimeMs;

    logger.debug('CPU metrics updated', { cpuPercent: cpuPercent.toFixed(2) });
  } catch (error) {
    logger.error('Failed to update CPU metrics', { error });
  }
}

/**
 * Calculate percentiles from Prometheus histogram data
 * This is a helper - actual calculation happens via PromQL
 */
export interface PercentileCalculation {
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Start periodic metrics collection
 */
let metricsInterval: NodeJS.Timeout | null = null;

export function startPerformanceMetricsCollection(intervalMs: number = 10000): void {
  if (metricsInterval) {
    logger.warn('Performance metrics collection already started');
    return;
  }

  logger.info('Starting performance metrics collection', { intervalMs });

  // Update metrics immediately
  updateMemoryMetrics();
  updateCPUMetrics();

  // Update metrics periodically
  metricsInterval = setInterval(() => {
    updateMemoryMetrics();
    updateCPUMetrics();
  }, intervalMs);

  logger.info('Performance metrics collection started');
}

/**
 * Stop periodic metrics collection
 */
export function stopPerformanceMetricsCollection(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    logger.info('Performance metrics collection stopped');
  }
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

/**
 * Get current CPU usage
 */
export function getCPUUsage(): { user: number; system: number } {
  return process.cpuUsage();
}

/**
 * Measure function execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.debug(`Execution time: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    return { result, duration };
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`Execution failed: ${label}`, { error, duration: `${duration.toFixed(2)}ms` });
    throw error;
  }
}

/**
 * Performance metrics snapshot
 */
export interface PerformanceSnapshot {
  timestamp: Date;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
}

/**
 * Get performance snapshot
 */
export function getPerformanceSnapshot(): PerformanceSnapshot {
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();

  return {
    timestamp: new Date(),
    memory: {
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      rss: memory.rss,
      external: memory.external,
    },
    cpu: {
      user: cpu.user,
      system: cpu.system,
    },
  };
}

/**
 * Export metrics for external monitoring
 */
export async function exportMetrics(): Promise<string> {
  return await register.metrics();
}
