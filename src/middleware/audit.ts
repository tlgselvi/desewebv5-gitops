import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '@/db/index.js';
import { auditLogs } from '@/db/schema/audit.js';
import { logger } from '@/utils/logger.js';
import { auditEventsTotal, auditWriteFailuresTotal, auditLatency } from '@/config/prometheus.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

export type AuditContext = {
  resource?: string;
  action?: string;
};

function hashBody(body: unknown): string | undefined {
  if (!body) return undefined;
  try {
    const json = JSON.stringify(body);
    return crypto.createHash('sha256').update(json).digest('hex');
  } catch {
    return undefined;
  }
}

function maskIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  
  // IPv4 /24 maskeleme
  const ipv4Match = ip.match(/^(\d+\.\d+\.)(\d+\.\d+)$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}x.x`;
  }
  
  // IPv6 için basit maskeleme (ilk 4 octet gösterilir)
  const ipv6Match = ip.match(/^([0-9a-fA-F:]+::?[0-9a-fA-F:]*:?)([0-9a-fA-F:]+)$/);
  if (ipv6Match) {
    return `${ipv6Match[1]}xxxx`;
  }
  
  return ip;
}

export function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  const ip =
    ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) ||
    req.socket.remoteAddress ||
    undefined;
  const maskedIp = maskIp(ip);

  res.on('finish', async () => {
    const endTimer = auditLatency.startTimer();
    
    try {
      const latencyMs = Date.now() - start;
      const status = res.statusCode;
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const ctx = (req as { auditCtx?: AuditContext }).auditCtx;
      const payloadHash = hashBody(req.body);

      await db.insert(auditLogs).values({
        userId: user?.id,
        ip: maskedIp,
        method: req.method,
        path: req.path,
        resource: ctx?.resource,
        action: ctx?.action,
        status,
        latencyMs,
        traceId: (req as { traceId?: string }).traceId,
        payloadHash,
        meta: undefined,
      });

      auditEventsTotal.inc({ status: String(status) });
      
      logger.debug('Audit log written', {
        path: req.path,
        method: req.method,
        status,
        userId: user?.id,
      });
    } catch (err) {
      auditWriteFailuresTotal.inc();
      logger.error('Audit write error', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        path: req.path,
      });
    } finally {
      endTimer();
    }
  });

  next();
}

// RBAC entegrasyonu için yardımcı; route içinde çağırın
export function setAuditContext(resource?: string, action?: string) {
  return function setCtx(req: Request, _res: Response, next: NextFunction): void {
    (req as { auditCtx?: AuditContext }).auditCtx = { resource, action } satisfies AuditContext;
    next();
  };
}

