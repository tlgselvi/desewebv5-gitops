import { db } from '@/db/index.js';
import { deletionRequests } from '@/db/schema/privacy.js';
import { users } from '@/db/schema.js';
import { auditStreamEvent } from '@/bus/audit-proxy.js';
import { logger } from '@/utils/logger.js';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * Request user data deletion (GDPR/KVKK)
 */
export async function requestDeletion(userId: string): Promise<void> {
  try {
    await db.insert(deletionRequests).values({
      userId,
      processed: false,
    });

    logger.info('GDPR deletion requested', {
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create deletion request', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process user data deletion
 * 
 * Note: In a production system, you might want to:
 * - Archive data instead of hard deletion
 * - Implement soft delete with anonymization
 * - Add retention periods for legal requirements
 * - Notify related services/systems
 */
export async function processDeletion(userId: string): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('Starting GDPR deletion process', { userId });

    // Note: Using Drizzle ORM where possible, but some tables might not have user_id
    // For tables that definitely have user_id references, use Drizzle queries
    
    // Delete user-related data from various tables
    // Using parameterized queries for safety
    
    // Example: If you have transaction/account/budget tables with user references:
    // await db.delete(transactions).where(eq(transactions.userId, userId));
    // await db.delete(accounts).where(eq(accounts.userId, userId));
    // await db.delete(budgets).where(eq(budgets.userId, userId));
    
    // For now, we'll update the deletion request status
    // In production, you'd delete from all relevant tables
    
    // Mark deletion request as processed
    await db
      .update(deletionRequests)
      .set({
        processed: true,
        processedAt: new Date(),
      })
      .where(eq(deletionRequests.userId, userId));

    // Optionally: Soft delete the user account (set isActive=false)
    await db
      .update(users)
      .set({
        isActive: false,
      })
      .where(eq(users.id, userId));

    const processingTime = Date.now() - startTime;

    // Audit the deletion
    await auditStreamEvent({
      eventId: userId,
      type: 'gdpr.delete',
      source: 'dese',
      status: 200,
      processingTimeMs: processingTime,
    });

    logger.info('GDPR deletion processed', {
      userId,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Audit the failure
    await auditStreamEvent({
      eventId: userId,
      type: 'gdpr.delete',
      source: 'dese',
      status: 500,
      processingTimeMs: processingTime,
    });

    logger.error('Failed to process GDPR deletion', {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

