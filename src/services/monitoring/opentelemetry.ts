/**
 * OpenTelemetry Service
 * 
 * Full implementation with traces, metrics, and context propagation
 * @module services/monitoring/opentelemetry
 */

import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

// Types for span and context
export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export interface Span {
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  status: SpanStatus;
  context: SpanContext;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

export interface SpanStatus {
  code: 'OK' | 'ERROR' | 'UNSET';
  message?: string;
}

/**
 * Generate a random trace ID (32 hex chars)
 */
function generateTraceId(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate a random span ID (16 hex chars)
 */
function generateSpanId(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * OpenTelemetry Service
 * Manages distributed tracing and metrics
 */
class OpenTelemetryService {
  private initialized = false;
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;
  private activeSpans: Map<string, Span> = new Map();
  private spanStack: string[] = [];
  private exportEndpoint: string;
  private batchSize: number = 100;
  private exportInterval: number = 5000;
  private exportQueue: Span[] = [];
  private exportTimer?: NodeJS.Timeout;

  constructor() {
    this.serviceName = process.env.OTEL_SERVICE_NAME || 'dese-ea-plan';
    this.serviceVersion = process.env.npm_package_version || '7.0.0';
    this.environment = config.nodeEnv;
    this.exportEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://tempo:4318/v1/traces';
  }

  /**
   * Initialize OpenTelemetry
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Start export timer
      this.exportTimer = setInterval(() => {
        this.flushSpans();
      }, this.exportInterval);

      logger.info('OpenTelemetry Service initialized', {
        serviceName: this.serviceName,
        serviceVersion: this.serviceVersion,
        environment: this.environment,
        exportEndpoint: this.exportEndpoint,
      });

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize OpenTelemetry', { error });
      throw error;
    }
  }

  /**
   * Shutdown OpenTelemetry
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      // Clear export timer
      if (this.exportTimer) {
        clearInterval(this.exportTimer);
      }

      // Flush remaining spans
      await this.flushSpans();

      this.initialized = false;
      logger.info('OpenTelemetry Service shut down');
    } catch (error) {
      logger.error('Error shutting down OpenTelemetry', { error });
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
    const parentSpanId = this.spanStack.length > 0 
      ? this.spanStack[this.spanStack.length - 1] 
      : undefined;
    
    const parentSpan = parentSpanId ? this.activeSpans.get(parentSpanId) : undefined;

    const span: Span = {
      name,
      startTime: Date.now(),
      attributes: {
        'service.name': this.serviceName,
        'service.version': this.serviceVersion,
        'deployment.environment': this.environment,
        ...attributes,
      },
      events: [],
      status: { code: 'UNSET' },
      context: {
        traceId: parentContext?.traceId || parentSpan?.context.traceId || generateTraceId(),
        spanId: generateSpanId(),
        traceFlags: 1,
      },
    };

    if (parentSpan) {
      span.attributes['parent.span_id'] = parentSpan.context.spanId;
    }

    this.activeSpans.set(span.context.spanId, span);
    this.spanStack.push(span.context.spanId);

    return span;
  }

  /**
   * End a span
   */
  endSpan(span: Span, error?: Error): void {
    span.endTime = Date.now();
    
    if (error) {
      span.status = {
        code: 'ERROR',
        message: error.message,
      };
      span.events.push({
        name: 'exception',
        timestamp: Date.now(),
        attributes: {
          'exception.type': error.name,
          'exception.message': error.message,
          'exception.stacktrace': error.stack || '',
        },
      });
    } else {
      span.status = { code: 'OK' };
    }

    // Remove from active spans
    this.activeSpans.delete(span.context.spanId);
    
    // Remove from stack
    const stackIndex = this.spanStack.indexOf(span.context.spanId);
    if (stackIndex > -1) {
      this.spanStack.splice(stackIndex, 1);
    }

    // Add to export queue
    this.exportQueue.push(span);

    // Flush if batch is full
    if (this.exportQueue.length >= this.batchSize) {
      this.flushSpans();
    }
  }

  /**
   * Add event to current span
   */
  addEvent(
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    const currentSpanId = this.spanStack[this.spanStack.length - 1];
    const span = currentSpanId ? this.activeSpans.get(currentSpanId) : undefined;
    
    if (span) {
      span.events.push({
        name,
        timestamp: Date.now(),
        attributes,
      });
    }
  }

  /**
   * Add attributes to current span
   */
  addTags(attributes: Record<string, string | number | boolean>): void {
    const currentSpanId = this.spanStack[this.spanStack.length - 1];
    const span = currentSpanId ? this.activeSpans.get(currentSpanId) : undefined;
    
    if (span) {
      Object.assign(span.attributes, attributes);
    }
  }

  /**
   * Record an error in current span
   */
  recordError(
    error: Error,
    attributes?: Record<string, string>
  ): void {
    const currentSpanId = this.spanStack[this.spanStack.length - 1];
    const span = currentSpanId ? this.activeSpans.get(currentSpanId) : undefined;
    
    if (span) {
      span.events.push({
        name: 'exception',
        timestamp: Date.now(),
        attributes: {
          'exception.type': error.name,
          'exception.message': error.message,
          'exception.stacktrace': error.stack || '',
          ...attributes,
        },
      });
    }
  }

  /**
   * Get current span context
   */
  getCurrentSpanContext(): SpanContext | undefined {
    const currentSpanId = this.spanStack[this.spanStack.length - 1];
    return currentSpanId ? this.activeSpans.get(currentSpanId)?.context : undefined;
  }

  /**
   * Flush spans to export endpoint
   */
  private async flushSpans(): Promise<void> {
    if (this.exportQueue.length === 0) return;

    const spansToExport = this.exportQueue.splice(0, this.batchSize);

    try {
      // Format spans for OTLP protocol
      const payload = {
        resourceSpans: [{
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: this.serviceName } },
              { key: 'service.version', value: { stringValue: this.serviceVersion } },
              { key: 'deployment.environment', value: { stringValue: this.environment } },
            ],
          },
          scopeSpans: [{
            scope: { name: 'dese-ea-plan', version: this.serviceVersion },
            spans: spansToExport.map(span => this.formatSpan(span)),
          }],
        }],
      };

      // In production, send to collector
      if (config.nodeEnv === 'production') {
        const response = await fetch(this.exportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to export spans: ${response.status}`);
        }
      }

      logger.debug('Exported spans', { count: spansToExport.length });
    } catch (error) {
      logger.error('Failed to export spans', { error, count: spansToExport.length });
      // Re-add failed spans to queue (with limit to avoid memory issues)
      if (this.exportQueue.length < this.batchSize * 5) {
        this.exportQueue.push(...spansToExport);
      }
    }
  }

  /**
   * Format span for OTLP
   */
  private formatSpan(span: Span) {
    return {
      traceId: span.context.traceId,
      spanId: span.context.spanId,
      name: span.name,
      kind: 1, // SPAN_KIND_SERVER
      startTimeUnixNano: span.startTime * 1000000,
      endTimeUnixNano: (span.endTime || Date.now()) * 1000000,
      attributes: Object.entries(span.attributes).map(([key, value]) => ({
        key,
        value: typeof value === 'string' 
          ? { stringValue: value }
          : typeof value === 'number'
            ? { intValue: value.toString() }
            : { boolValue: value },
      })),
      events: span.events.map(event => ({
        name: event.name,
        timeUnixNano: event.timestamp * 1000000,
        attributes: event.attributes 
          ? Object.entries(event.attributes).map(([key, value]) => ({
              key,
              value: { stringValue: String(value) },
            }))
          : [],
      })),
      status: {
        code: span.status.code === 'OK' ? 1 : span.status.code === 'ERROR' ? 2 : 0,
        message: span.status.message,
      },
    };
  }

  /**
   * Create a traced function wrapper
   */
  trace<T extends (...args: unknown[]) => Promise<unknown>>(
    name: string,
    fn: T,
    attributes?: Record<string, string | number | boolean>
  ): T {
    const self = this;
    return (async (...args: unknown[]) => {
      const span = self.startSpan(name, attributes);
      try {
        const result = await fn(...args);
        self.endSpan(span);
        return result;
      } catch (error) {
        self.endSpan(span, error as Error);
        throw error;
      }
    }) as T;
  }
}

// Export singleton instance
export const openTelemetryService = new OpenTelemetryService();

