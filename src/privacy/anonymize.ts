import { db } from '@/db/index.js';
import { auditLogs } from '@/db/schema/audit.js';
import { eq, lt } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';
import { sql, and } from 'drizzle-orm';

/**
 * GDPR/KVKK Anonymization Utilities
 * Provides functions to anonymize user data in compliance with GDPR requirements
 */

/**
 * Anonymize IP addresses in audit logs
 * Replaces IP addresses with anonymized versions
 */
export async function anonymizeAuditLogsIPs(
  userId: string,
  retentionDays: number = 90
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Anonymize IPv4: Keep first two octets, mask last two
    // Anonymize IPv6: Keep first 4 groups, mask rest
    const result = await db
      .update(auditLogs)
      .set({
        ip: sql<string>`CASE 
          WHEN ip ~ '^[0-9]+\\.[0-9]+\\.' THEN 
            regexp_replace(ip, '^([0-9]+\\.[0-9]+\\.)([0-9]+\\.[0-9]+)$', '\\1x.x')
          WHEN ip ~ ':' THEN 
            regexp_replace(ip, '^([0-9a-fA-F:]+::?[0-9a-fA-F:]*:?)([0-9a-fA-F:]+)$', '\\1xxxx')
          ELSE ip
        END`,
      })
      .where(and(eq(auditLogs.userId, userId), lt(auditLogs.ts, cutoffDate)));

    logger.info('Audit logs IPs anonymized', {
      userId,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
    });

    // Drizzle ORM update returns array of updated rows, length gives count
    return Array.isArray(result) ? result.length : 0;
  } catch (error) {
    logger.error('Failed to anonymize audit logs IPs', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Anonymize user data in audit logs
 * Removes or hashes sensitive information
 */
export async function anonymizeUserAuditLogs(
  userId: string,
  anonymizeMeta: boolean = true
): Promise<number> {
  try {
    const result = await db
      .update(auditLogs)
      .set({
        userId: null, // Remove user ID
        meta: anonymizeMeta ? sql<string>`NULL` : sql`meta`, // Optionally remove metadata
      })
      .where(eq(auditLogs.userId, userId));

    logger.info('User audit logs anonymized', {
      userId,
      anonymizeMeta,
    });

    // Drizzle ORM update returns array of updated rows, length gives count
    return Array.isArray(result) ? result.length : 0;
  } catch (error) {
    logger.error('Failed to anonymize user audit logs', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Anonymize audit logs older than retention period
 */
export async function anonymizeOldAuditLogs(retentionDays: number = 400): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Anonymize IPs and remove user IDs for old logs
    const result = await db
      .update(auditLogs)
      .set({
        userId: sql<string>`NULL`,
        ip: sql<string>`CASE 
          WHEN ip ~ '^[0-9]+\\.[0-9]+\\.' THEN 
            regexp_replace(ip, '^([0-9]+\\.[0-9]+\\.)([0-9]+\\.[0-9]+)$', '\\1x.x')
          WHEN ip ~ ':' THEN 
            regexp_replace(ip, '^([0-9a-fA-F:]+::?[0-9a-fA-F:]*:?)([0-9a-fA-F:]+)$', '\\1xxxx')
          ELSE ip
        END`,
        meta: sql<string>`NULL`,
      })
      .where(lt(auditLogs.ts, cutoffDate));

    logger.info('Old audit logs anonymized', {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      rowsAffected: Array.isArray(result) ? result.length : 0,
    });

    // Drizzle ORM update returns array of updated rows, length gives count
    return Array.isArray(result) ? result.length : 0;
  } catch (error) {
    logger.error('Failed to anonymize old audit logs', {
      retentionDays,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Complete user data anonymization
 * Removes all identifiable information for a user
 */
export async function anonymizeUserData(userId: string): Promise<void> {
  try {
    logger.info('Starting complete user data anonymization', { userId });

    // Anonymize audit logs
    await anonymizeUserAuditLogs(userId, true);

    // Anonymize IP addresses in audit logs
    await anonymizeAuditLogsIPs(userId, 0);

    logger.info('User data anonymization completed', { userId });
  } catch (error) {
    logger.error('Failed to anonymize user data', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get anonymization statistics
 */
export async function getAnonymizationStats(): Promise<{
  totalAuditLogs: number;
  anonymizedLogs: number;
  logsWithUserIds: number;
  logsWithIPs: number;
}> {
  try {
    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    const anonymizedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(sql`user_id IS NULL`);
    const withUserIdsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(sql`user_id IS NOT NULL`);
    const withIPsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(sql`ip IS NOT NULL`);

    return {
      totalAuditLogs: Number(totalCount[0]?.count || 0),
      anonymizedLogs: Number(anonymizedCount[0]?.count || 0),
      logsWithUserIds: Number(withUserIdsCount[0]?.count || 0),
      logsWithIPs: Number(withIPsCount[0]?.count || 0),
    };
  } catch (error) {
    logger.error('Failed to get anonymization stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

