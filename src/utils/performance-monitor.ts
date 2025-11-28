/**
 * Performance Monitoring Utilities
 * 
 * Track and monitor:
 * - Request timing
 * - Memory usage
 * - CPU usage
 * - Function execution time
 * - Performance profiling
 * 
 * Based on proven patterns from:
 * - Node.js performance hooks
 * - APM tools (New Relic, Datadog)
 * - Performance API standards
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { logger } from './logger.js';

export interface PerformanceMetrics {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memory?: NodeJS.MemoryUsage;
  timestamp: number;
}

export interface PerformanceConfig {
  /** Enable detailed memory tracking */
  trackMemory?: boolean;
  /** Enable CPU tracking */
  trackCPU?: boolean;
  /** Log metrics automatically */
  autoLog?: boolean;
  /** Custom logger function */
  customLogger?: (metrics: PerformanceMetrics) => void;
}

/**
 * Performance Monitor class
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private observers: PerformanceObserver[] = [];
  private config: Required<PerformanceConfig>;

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      trackMemory: config.trackMemory ?? true,
      trackCPU: config.trackCPU ?? false,
      autoLog: config.autoLog ?? true,
      customLogger: config.customLogger ?? ((m) => logger.info('[Performance]', m)),
    };

    this.setupObservers();
  }

  /**
   * Setup performance observers
   */
  private setupObservers(): void {
    if (this.config.trackMemory) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            endTime: entry.startTime + entry.duration,
            memory: process.memoryUsage(),
            timestamp: Date.now(),
          });
        }
      });

      observer.observe({ entryTypes: ['measure', 'function'] });
      this.observers.push(observer);
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetrics): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    this.metrics.get(metric.name)!.push(metric);

    if (this.config.autoLog) {
      this.config.customLogger(metric);
    }
  }

  /**
   * Measure function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.config.trackMemory ? process.memoryUsage() : undefined;

    try {
      const result = await fn();
      const endTime = performance.now();
      const endMemory = this.config.trackMemory ? process.memoryUsage() : undefined;

      const metric: PerformanceMetrics = {
        name,
        duration: endTime - startTime,
        startTime,
        endTime,
        memory: endMemory,
        timestamp: Date.now(),
      };

      this.recordMetric(metric);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const metric: PerformanceMetrics = {
        name: `${name}:error`,
        duration: endTime - startTime,
        startTime,
        endTime,
        timestamp: Date.now(),
      };

      this.recordMetric(metric);
      throw error;
    }
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string): PerformanceMetrics[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get aggregated statistics for a metric
   */
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      avg: sum / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics[]> {
    return new Map(this.metrics);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring function performance
 */
export function measurePerformance(name?: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = (async function (this: any, ...args: any[]) {
      return performanceMonitor.measure(metricName, () => originalMethod.apply(this, args));
    }) as T;

    return descriptor;
  };
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

/**
 * Get memory usage in human-readable format
 */
export function getMemoryUsageFormatted(): {
  rss: string;
  heapTotal: string;
  heapUsed: string;
  external: string;
} {
  const usage = process.memoryUsage();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return {
    rss: formatBytes(usage.rss),
    heapTotal: formatBytes(usage.heapTotal),
    heapUsed: formatBytes(usage.heapUsed),
    external: formatBytes(usage.external),
  };
}

/**
 * Track request performance (Express middleware)
 */
export function requestPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    res.on('finish', () => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const metric: PerformanceMetrics = {
        name: `http.${req.method}.${req.path}`,
        duration,
        startTime,
        endTime,
        memory: endMemory,
        timestamp: Date.now(),
      };

      performanceMonitor['recordMetric'](metric);

      logger.debug('[Performance] Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: {
          heapUsed: formatBytes(endMemory.heapUsed - startMemory.heapUsed),
        },
      });
    });

    next();
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

