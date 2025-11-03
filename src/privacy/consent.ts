import { db } from '@/db/index.js';
import { consents } from '@/db/schema/privacy.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

export type ConsentPurpose = 'marketing' | 'analytics' | 'essential';

/**
 * Set user consent for a specific purpose
 */
export async function setConsent(
  userId: string,
  purpose: ConsentPurpose,
  status: boolean
): Promise<void> {
  try {
    // Check if consent already exists
    const existing = await db.query.consents.findFirst({
      where: and(eq(consents.userId, userId), eq(consents.purpose, purpose)),
    });

    if (existing) {
      // Update existing consent
      await db
        .update(consents)
        .set({
          status,
          ts: new Date(),
        })
        .where(and(eq(consents.userId, userId), eq(consents.purpose, purpose)));
    } else {
      // Insert new consent
      await db.insert(consents).values({
        userId,
        purpose,
        status,
      });
    }

    logger.info('Consent updated', {
      userId,
      purpose,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to update consent', {
      userId,
      purpose,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get all consents for a user
 */
export async function getConsents(userId: string) {
  try {
    const userConsents = await db.query.consents.findMany({
      where: eq(consents.userId, userId),
      orderBy: (consents, { desc }) => [desc(consents.ts)],
    });

    return userConsents;
  } catch (error) {
    logger.error('Failed to get consents', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check if user has given consent for a specific purpose
 */
export async function hasConsent(
  userId: string,
  purpose: ConsentPurpose
): Promise<boolean> {
  try {
    const consent = await db.query.consents.findFirst({
      where: and(eq(consents.userId, userId), eq(consents.purpose, purpose)),
    });

    return consent?.status ?? false;
  } catch (error) {
    logger.error('Failed to check consent', {
      userId,
      purpose,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

