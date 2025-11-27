import fs from 'fs/promises';
import path from 'path';
import { s3Client } from '../src/services/storage/s3-client.js';
import { db } from '../src/db/index.js';
import { files } from '../src/db/schema/storage.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/config/index.js';
import { eq, isNull } from 'drizzle-orm';

/**
 * Migrate files from local storage to S3
 */
async function migrateFilesToS3(batchSize: number = 100) {
  try {
    if (!s3Client.isStorageEnabled()) {
      logger.error('S3 storage is not enabled. Please enable it in config.');
      process.exit(1);
    }

    // Get all files from database that are stored locally
    const allFiles = await db
      .select()
      .from(files)
      .where(and(eq(files.storageProvider, 'local'), isNull(files.deletedAt)));

    const totalFiles = allFiles.length;

    if (totalFiles === 0) {
      logger.info('No files to migrate');
      return;
    }

    logger.info('Starting storage migration', { totalFiles });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (file) => {
          try {
            // Read local file
            const uploadPath = config.upload.uploadPath || './uploads';
            const localPath = path.join(uploadPath, file.path || '');

            // Check if file exists
            try {
              await fs.access(localPath);
            } catch {
              logger.warn('Local file not found, skipping', {
                fileId: file.id,
                path: localPath,
              });
              errorCount++;
              return;
            }

            const fileBuffer = await fs.readFile(localPath);

            // Generate S3 key
            const s3Key = file.storageKey || s3Client.generateKey(
              file.organizationId,
              file.category || 'documents',
              file.filename
            );

            // Upload to S3
            await s3Client.upload(
              s3Key,
              fileBuffer,
              file.mimeType || 'application/octet-stream',
              {
                originalFilename: file.filename,
                organizationId: file.organizationId,
              }
            );

            // Update database with S3 key
            await db
              .update(files)
              .set({
                storageProvider: config.storage.provider || 's3',
                storageKey: s3Key,
                storageUrl: s3Client.getUrl(s3Key),
                updatedAt: new Date(),
              })
              .where(eq(files.id, file.id));

            successCount++;

            logger.info('File migrated', {
              fileId: file.id,
              s3Key,
            });
          } catch (error) {
            errorCount++;
            logger.error('Failed to migrate file', {
              fileId: file.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      logger.info('Batch migrated', {
        batch: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(totalFiles / batchSize),
        success: successCount,
        errors: errorCount,
      });
    }

    logger.info('Storage migration completed', {
      totalFiles,
      success: successCount,
      errors: errorCount,
    });
  } catch (error) {
    logger.error('Storage migration failed', { error });
    throw error;
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  const batchSize = parseInt(process.argv[2] || '100', 10);
  migrateFilesToS3(batchSize)
    .then(() => {
      logger.info('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed', { error });
      process.exit(1);
    });
}

export { migrateFilesToS3 };

