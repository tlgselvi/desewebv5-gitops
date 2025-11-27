/**
 * Security Monitoring Service
 * 
 * Tracks and logs security events for SIEM integration
 */

import { db } from '@/db/index.js';
import { logger } from '@/utils/logger.js';
import { Request } from 'express';
import type { RequestWithUser } from '@/middleware/auth.js';

export type SecurityEventType =
  | 'authentication.failed'
  | 'authentication.success'
  | 'authorization.failed'
  | 'rate_limit.exceeded'
  | 'suspicious_activity'
  | 'data_access.violation'
  | 'sql_injection.attempt'
  | 'xss.attempt'
  | 'path_traversal.attempt'
  | 'csrf.attempt'
  | 'brute_force.attempt'
  | 'privilege_escalation.attempt'
  | 'session.hijack.attempt'
  | 'malicious_payload.detected';

export interface SecurityEvent {
  id?: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  organizationId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export class SecurityMonitoringService {
  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to application logger
      const logLevel = this.getLogLevel(event.severity);
      logger[logLevel]('Security event', {
        type: event.type,
        severity: event.severity,
        message: event.message,
        userId: event.userId,
        organizationId: event.organizationId,
        ip: event.ip,
        endpoint: event.endpoint,
        details: event.details,
      });

      // In practice, this would also:
      // 1. Store in database (security_events table)
      // 2. Send to SIEM system (Splunk, ELK, etc.)
      // 3. Trigger alerts if severity is high/critical
      // 4. Update security metrics

      // Store in database (if table exists)
      await this.storeSecurityEvent(event);

      // Send to SIEM (if configured)
      await this.sendToSIEM(event);

      // Trigger alerts if needed
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.triggerAlert(event);
      }
    } catch (error) {
      logger.error('Failed to log security event', { error, event });
    }
  }

  /**
   * Log authentication failure
   */
  async logAuthenticationFailure(
    req: Request,
    reason: string,
    userId?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'authentication.failed',
      severity: 'medium',
      message: `Authentication failed: ${reason}`,
      userId,
      ip: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
      endpoint: req.path,
      method: req.method,
      details: { reason },
      timestamp: new Date(),
    });
  }

  /**
   * Log authorization failure
   */
  async logAuthorizationFailure(
    req: Request,
    requiredRole: string,
    userRole?: string
  ): Promise<void> {
    const reqWithUser = req as RequestWithUser;
    
    await this.logSecurityEvent({
      type: 'authorization.failed',
      severity: 'high',
      message: `Authorization failed: User does not have required role`,
      userId: reqWithUser.user?.id,
      organizationId: reqWithUser.user?.organizationId,
      ip: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
      endpoint: req.path,
      method: req.method,
      details: {
        requiredRole,
        userRole,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Log rate limit violation
   */
  async logRateLimitViolation(
    req: Request,
    key: string,
    limit: number,
    count: number
  ): Promise<void> {
    const reqWithUser = req as RequestWithUser;
    
    await this.logSecurityEvent({
      type: 'rate_limit.exceeded',
      severity: count > limit * 2 ? 'high' : 'medium',
      message: `Rate limit exceeded: ${count} requests (limit: ${limit})`,
      userId: reqWithUser.user?.id,
      organizationId: reqWithUser.user?.organizationId,
      ip: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
      endpoint: req.path,
      method: req.method,
      details: {
        key,
        limit,
        count,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    req: Request,
    activity: string,
    details?: Record<string, any>
  ): Promise<void> {
    const reqWithUser = req as RequestWithUser;
    
    await this.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'high',
      message: `Suspicious activity detected: ${activity}`,
      userId: reqWithUser.user?.id,
      organizationId: reqWithUser.user?.organizationId,
      ip: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
      endpoint: req.path,
      method: req.method,
      details,
      timestamp: new Date(),
    });
  }

  /**
   * Log SQL injection attempt
   */
  async logSQLInjectionAttempt(
    req: Request,
    payload: string,
    parameter?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'sql_injection.attempt',
      severity: 'critical',
      message: 'SQL injection attempt detected',
      ip: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
      endpoint: req.path,
      method: req.method,
      details: {
        payload: payload.substring(0, 100), // Truncate for security
        parameter,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Log XSS attempt
   */
  async logXSSAttempt(
    req: Request,
    payload: string,
    parameter?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      type: 'xss.attempt',
      severity: 'high',
      message: 'XSS attempt detected',
      ip: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.get('user-agent') || undefined,
      endpoint: req.path,
      method: req.method,
      details: {
        payload: payload.substring(0, 100), // Truncate for security
        parameter,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Store security event in database
   */
  private async storeSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // In practice, this would insert into security_events table
      // For now, just log
      logger.debug('Security event stored', { event });
    } catch (error) {
      logger.error('Failed to store security event', { error });
    }
  }

  /**
   * Send security event to SIEM
   */
  private async sendToSIEM(event: SecurityEvent): Promise<void> {
    try {
      const siemEnabled = process.env.SIEM_ENABLED === 'true';
      if (!siemEnabled) {
        return;
      }

      const siemProvider = process.env.SIEM_PROVIDER || 'splunk';
      
      // In practice, this would send to SIEM system
      // For now, just log
      logger.debug('Security event sent to SIEM', {
        provider: siemProvider,
        event: event.type,
      });
    } catch (error) {
      logger.error('Failed to send security event to SIEM', { error });
    }
  }

  /**
   * Trigger alert for high-severity events
   */
  private async triggerAlert(event: SecurityEvent): Promise<void> {
    try {
      // In practice, this would send alerts via email, Slack, PagerDuty, etc.
      logger.warn('Security alert triggered', {
        type: event.type,
        severity: event.severity,
        message: event.message,
      });
    } catch (error) {
      logger.error('Failed to trigger security alert', { error });
    }
  }

  /**
   * Get log level based on severity
   */
  private getLogLevel(severity: SecurityEvent['severity']): 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
      default:
        return 'info';
    }
  }
}

export const securityMonitoringService = new SecurityMonitoringService();

