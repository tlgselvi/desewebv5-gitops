/**
 * APM Service
 * 
 * Full Application Performance Monitoring with OpenTelemetry integration
 * @module services/monitoring/apm-service
 */

import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';
import { openTelemetryService, type Span, type SpanContext } from './opentelemetry.js';

/**
 * APM Configuration
 */
interface ApmConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  enabled: boolean;
  sampleRate: number;
  enableDatabaseTracing: boolean;
  enableHttpTracing: boolean;
  enableRedisTracing: boolean;
}

const defaultConfig: ApmConfig = {
  serviceName: process.env.OTEL_SERVICE_NAME || 'dese-ea-plan',
  serviceVersion: process.env.npm_package_version || '7.1.0',
  environment: config.nodeEnv,
  enabled: process.env.ENABLE_APM === 'true' || config.nodeEnv === 'production',
  sampleRate: parseFloat(process.env.APM_SAMPLE_RATE || '1.0'),
  enableDatabaseTracing: true,
  enableHttpTracing: true,
  enableRedisTracing: true,
};

/**
 * APM Service Class
 * Provides tracing, metrics, and performance monitoring
 */
class ApmService {
  private config: ApmConfig;
  private initialized = false;

  constructor(apmConfig?: Partial<ApmConfig>) {
    this.config = { ...defaultConfig, ...apmConfig };
  }

  /**
   * Initialize APM Service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.config.enabled) {
        await openTelemetryService.initialize();
        
        logger.info('APM Service initialized', {
          serviceName: this.config.serviceName,
          serviceVersion: this.config.serviceVersion,
          environment: this.config.environment,
          sampleRate: this.config.sampleRate,
        });
      } else {
        logger.info('APM Service disabled');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize APM Service', { error });
      // Don't throw - APM failure shouldn't break the app
    }
  }

  /**
   * Shutdown APM Service
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      await openTelemetryService.shutdown();
      this.initialized = false;
      logger.info('APM Service shut down');
    } catch (error) {
      logger.error('Error shutting down APM Service', { error });
    }
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    attributes?: Record<string, string | number | boolean>,
    parentContext?: SpanContext
  ): Span {
    if (!this.config.enabled || !this.shouldSample()) {
      // Return a no-op span
      return {
        name,
        startTime: Date.now(),
        attributes: {},
        events: [],
        status: { code: 'UNSET' },
        context: {
          traceId: '',
          spanId: '',
          traceFlags: 0,
        },
      };
    }

    return openTelemetryService.startSpan(name, attributes, parentContext);
  }

  /**
   * End a span
   */
  endSpan(span: Span, error?: Error): void {
    if (!this.config.enabled || !span.context.traceId) return;
    openTelemetryService.endSpan(span, error);
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    if (!this.config.enabled) return;
    openTelemetryService.addEvent(name, attributes);
  }

  /**
   * Add attributes/tags to current span
   */
  addTags(attributes: Record<string, string | number | boolean>): void {
    if (!this.config.enabled) return;
    openTelemetryService.addTags(attributes);
  }

  /**
   * Record an error
   */
  recordError(error: Error, attributes?: Record<string, string>): void {
    if (!this.config.enabled) return;
    openTelemetryService.recordError(error, attributes);
    
    // Also log the error
    logger.error('APM recorded error', {
      error: error.message,
      stack: error.stack,
      ...attributes,
    });
  }

  /**
   * Get current span context
   */
  getCurrentSpanContext(): SpanContext | undefined {
    if (!this.config.enabled) return undefined;
    return openTelemetryService.getCurrentSpanContext();
  }

  /**
   * Create a traced async function
   */
  trace<T extends (...args: unknown[]) => Promise<unknown>>(
    name: string,
    fn: T,
    attributes?: Record<string, string | number | boolean>
  ): T {
    if (!this.config.enabled) return fn;
    return openTelemetryService.trace(name, fn, attributes);
  }

  /**
   * Trace a database query
   */
  traceDatabase<T>(
    operation: string,
    query: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enabled || !this.config.enableDatabaseTracing) {
      return fn();
    }

    const span = this.startSpan(`db.${operation}`, {
      'db.system': 'postgresql',
      'db.operation': operation,
      'db.statement': query.substring(0, 500), // Truncate for safety
    });

    return fn()
      .then((result) => {
        this.endSpan(span);
        return result;
      })
      .catch((error) => {
        this.endSpan(span, error as Error);
        throw error;
      });
  }

  /**
   * Trace a Redis operation
   */
  traceRedis<T>(
    operation: string,
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enabled || !this.config.enableRedisTracing) {
      return fn();
    }

    const span = this.startSpan(`redis.${operation}`, {
      'db.system': 'redis',
      'db.operation': operation,
      'db.redis.key': key,
    });

    return fn()
      .then((result) => {
        this.endSpan(span);
        return result;
      })
      .catch((error) => {
        this.endSpan(span, error as Error);
        throw error;
      });
  }

  /**
   * Trace an HTTP request
   */
  traceHttp<T>(
    method: string,
    url: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enabled || !this.config.enableHttpTracing) {
      return fn();
    }

    const span = this.startSpan(`http.${method.toLowerCase()}`, {
      'http.method': method,
      'http.url': url,
    });

    return fn()
      .then((result) => {
        this.endSpan(span);
        return result;
      })
      .catch((error) => {
        this.endSpan(span, error as Error);
        throw error;
      });
  }

  /**
   * Check if we should sample this trace
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Get APM configuration
   */
  getConfig(): ApmConfig {
    return { ...this.config };
  }

  /**
   * Check if APM is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.initialized;
  }
}

// Export singleton instance
export const apmService = new ApmService();
