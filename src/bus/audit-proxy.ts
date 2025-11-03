import { db } from '@/db/index.js';
import { auditLogs } from '@/db/schema/audit.js';
import { logger } from '@/utils/logger.js';
import { auditEventsTotal, auditWriteFailuresTotal } from '@/config/prometheus.js';

export interface AuditStreamEventParams {
  eventId: string;
  type: string;
  source: 'finbot' | 'mubot' | 'dese';
  status: number; // 200 işleme ok, 500 hata vb.
  processingTimeMs: number;
  traceId?: string;
}

/**
 * Audit stream event processing
 * Logs Redis Stream events to audit_logs table
 */
export async function auditStreamEvent(params: AuditStreamEventParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      method: 'STREAM',
      path: params.type,
      resource: params.source,
      action: 'consume',
      status: params.status,
      latencyMs: params.processingTimeMs,
      traceId: params.traceId,
      payloadHash: params.eventId,
    });

    auditEventsTotal.inc({ status: String(params.status) });

    logger.debug('Stream event audited', {
      eventId: params.eventId,
      type: params.type,
      source: params.source,
      status: params.status,
    });
  } catch (error) {
    auditWriteFailuresTotal.inc();
    logger.error('Failed to audit stream event', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      eventId: params.eventId,
    });
  }
}

