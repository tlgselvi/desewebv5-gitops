import { db, auditLogs } from '@/db/index.js';
import { logger } from './logger.js';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  success?: boolean;
  metadata?: Record<string, any>;
  errorMessage?: string;
  duration?: number;
}

/**
 * Log audit event to database and logger
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Insert into database (using new schema structure)
    await db.insert(auditLogs).values({
      userId: entry.userId || undefined,
      ip: entry.ipAddress || undefined,
      method: entry.method || 'UNKNOWN',
      path: entry.endpoint || entry.resourceType || '/',
      resource: entry.resourceType || undefined,
      action: entry.action || undefined,
      status: entry.statusCode || 200,
      latencyMs: entry.duration || 0,
      traceId: undefined,
      payloadHash: undefined,
      meta: entry.errorMessage ? JSON.stringify({ error: entry.errorMessage, metadata: entry.metadata }) : undefined,
    });

    // Also log to winston for immediate visibility
    const level = entry.success === false ? 'warn' : 'info';
    logger[level]('Audit Event', {
      action: entry.action,
      userId: entry.userId,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      endpoint: entry.endpoint,
      success: entry.success,
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    logger.error('Failed to log audit event', {
      error,
      entry,
    });
  }
}

/**
 * Create audit log entry from Express request
 */
export function createAuditEntryFromRequest(
  req: Request | AuthenticatedRequest,
  action: string,
  options: {
    resourceType?: string;
    resourceId?: string;
    success?: boolean;
    errorMessage?: string;
    duration?: number;
    metadata?: Record<string, any>;
  } = {}
): AuditLogEntry {
  const authenticatedReq = req as AuthenticatedRequest;

  return {
    userId: authenticatedReq.user?.id,
    action,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    method: req.method,
    endpoint: req.originalUrl || req.url,
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.get('User-Agent') || undefined,
    statusCode: (req as any).statusCode,
    success: options.success ?? true,
    metadata: options.metadata,
    errorMessage: options.errorMessage,
    duration: options.duration,
  };
}

/**
 * Audit middleware helper - logs after request completion
 */
export function auditLog(action: string, options?: {
  resourceType?: string;
  getResourceId?: (req: Request) => string | undefined;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();

    // Override res.end to capture response
    const originalEnd = res.end.bind(res);
    res.end = function(chunk?: any, encoding?: any, cb?: () => void): Response {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Get resource ID if needed
      const resourceId = options?.getResourceId
        ? options.getResourceId(req)
        : (req.params?.id || req.body?.id);

      // Log audit event (async, don't wait)
      logAuditEvent(
        createAuditEntryFromRequest(req, action, {
          resourceType: options?.resourceType,
          resourceId,
          success: statusCode < 400,
          duration,
          metadata: {
            statusCode,
            params: req.params,
            query: req.query,
          },
        })
      ).catch((error) => {
        // Silently fail - don't break request
        logger.error('Audit logging failed', { error });
      });

      // Call original end
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

// Common audit actions
export const AuditActions = {
  // Authentication
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  LOGIN_FAILED: 'user.login_failed',
  TOKEN_REFRESH: 'user.token_refresh',
  PASSWORD_CHANGE: 'user.password_change',
  PASSWORD_RESET: 'user.password_reset',

  // Projects
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_VIEW: 'project.view',

  // SEO
  SEO_ANALYZE: 'seo.analyze',
  SEO_METRICS_VIEW: 'seo.metrics.view',
  SEO_TRENDS_VIEW: 'seo.trends.view',

  // Content
  CONTENT_GENERATE: 'content.generate',
  CONTENT_UPDATE: 'content.update',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',
  TEMPLATE_CREATE: 'template.create',
  TEMPLATE_UPDATE: 'template.update',
  TEMPLATE_DELETE: 'template.delete',

  // Analytics
  ANALYTICS_DASHBOARD_VIEW: 'analytics.dashboard.view',
  ANALYTICS_METRICS_VIEW: 'analytics.metrics.view',
  REPORT_GENERATE: 'report.generate',

  // System
  SETTINGS_UPDATE: 'settings.update',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  PERMISSION_CHANGE: 'permission.change',

  // AIOps
  REMEDIATION_EXECUTE: 'remediation.execute',
  FEEDBACK_SUBMIT: 'feedback.submit',
} as const;

// Type for audit actions
export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

