import fs from 'fs/promises';
import path from 'path';
import { db, users } from '@/db/index.js';
import { exportRequests } from '@/db/schema/privacy.js';
import { eq } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';
import { auditStreamEvent } from '@/bus/audit-proxy.js';

/**
 * Request user data export (GDPR/KVKK)
 */
export async function requestExport(userId: string): Promise<void> {
  try {
    await db.insert(exportRequests).values({
      userId,
      processed: false,
    });

    logger.info('GDPR export requested', {
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create export request', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Process user data export
 * 
 * Collects all user-related data and exports as JSON file
 */
export async function processExport(userId: string): Promise<string> {
  const startTime = Date.now();

  try {
    logger.info('Starting GDPR export process', { userId });

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Collect user-related data
    // Note: Adjust table names based on your actual schema
    // Using Drizzle ORM queries where possible
    
    // Import schema tables if needed for queries
    const { seoProjects } = await import('@/db/schema.js');
    
    const userProjects = await db.query.seoProjects.findMany({
      where: (seoProjects, { eq }) => eq(seoProjects.ownerId, userId),
    });
    
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Exclude sensitive fields like password
      },
      // User-related data
      projects: userProjects.map((p) => ({
        id: p.id,
        name: p.name,
        domain: p.domain,
        status: p.status,
        createdAt: p.createdAt,
      })),
      exportDate: new Date().toISOString(),
      format: 'gdpr-json-v1',
    };

    // Create export directory if it doesn't exist
    const exportDir = process.env.EXPORT_DIR || '/tmp';
    await fs.mkdir(exportDir, { recursive: true });

    // Generate filename
    const filename = `gdpr-export-${userId}-${Date.now()}.json`;
    const filePath = path.join(exportDir, filename);

    // Write export data to file
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    // Generate file URL (adjust based on your file serving mechanism)
    const fileUrl = process.env.EXPORT_BASE_URL
      ? `${process.env.EXPORT_BASE_URL}/${filename}`
      : `file://${filePath}`;

    // Update export request
    await db
      .update(exportRequests)
      .set({
        fileUrl,
        processed: true,
        processedAt: new Date(),
      })
      .where(eq(exportRequests.userId, userId));

    const processingTime = Date.now() - startTime;

    // Audit the export
    await auditStreamEvent({
      eventId: userId,
      type: 'gdpr.export',
      source: 'dese',
      status: 200,
      processingTimeMs: processingTime,
    });

    logger.info('GDPR export ready', {
      userId,
      fileUrl,
      processingTimeMs: processingTime,
    });

    return fileUrl;
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Audit the failure
    await auditStreamEvent({
      eventId: userId,
      type: 'gdpr.export',
      source: 'dese',
      status: 500,
      processingTimeMs: processingTime,
    });

    logger.error('Failed to process GDPR export', {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

