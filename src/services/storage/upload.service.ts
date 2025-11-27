import { s3Client } from './s3-client.js';
import { db } from '@/db/index.js';
import { files } from '@/db/schema/storage.js';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const uploadSchema = z.object({
  organizationId: z.string().uuid(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().positive(),
  category: z.enum(['documents', 'images', 'exports', 'temp']).default('documents'),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export class UploadService {
  private maxFileSize: number;
  private allowedMimeTypes: string[];

  constructor() {
    this.maxFileSize = config.upload.maxFileSize || 10485760; // 10MB default
    this.allowedMimeTypes = config.upload.allowedFileTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
  }

  /**
   * Upload file to storage (S3 or local)
   */
  async uploadFile(
    organizationId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    options?: {
      category?: string;
      description?: string;
      isPublic?: boolean;
      metadata?: Record<string, string>;
    }
  ): Promise<{ id: string; url: string; key: string }> {
    // Validate input
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum: ${this.maxFileSize} bytes`);
    }

    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Mime type not allowed: ${mimeType}`);
    }

    const category = options?.category || 'documents';
    const metadata = options?.metadata || {};

    let storageKey: string;
    let storageUrl: string;
    let storageProvider: string;

    // Upload to S3 if enabled, otherwise use local storage
    if (s3Client.isStorageEnabled()) {
      try {
        storageKey = s3Client.generateKey(organizationId, category, filename);
        storageUrl = await s3Client.upload(
          storageKey,
          fileBuffer,
          mimeType,
          {
            organizationId,
            originalFilename: filename,
            ...metadata,
          }
        );
        storageProvider = config.storage.provider || 's3';
      } catch (error) {
        logger.error('S3 upload failed, falling back to local storage', { error });
        // Fallback to local storage
        storageKey = await this.saveToLocalStorage(organizationId, category, filename, fileBuffer);
        storageUrl = `/uploads/${storageKey}`;
        storageProvider = 'local';
      }
    } else {
      // Local storage
      storageKey = await this.saveToLocalStorage(organizationId, category, filename, fileBuffer);
      storageUrl = `/uploads/${storageKey}`;
      storageProvider = 'local';
    }

    // Save metadata to database
    const [fileRecord] = await db
      .insert(files)
      .values({
        organizationId,
        filename,
        originalFilename: filename,
        mimeType,
        size: fileBuffer.length,
        path: storageKey, // Keep for backward compatibility
        category,
        storageProvider,
        storageKey: storageProvider !== 'local' ? storageKey : null,
        storageUrl,
        description: options?.description,
        isPublic: options?.isPublic || false,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .returning();

    logger.info('File uploaded', {
      fileId: fileRecord.id,
      organizationId,
      storageProvider,
      key: storageKey,
    });

    return {
      id: fileRecord.id,
      url: storageUrl,
      key: storageKey,
    };
  }

  /**
   * Save file to local storage (fallback)
   */
  private async saveToLocalStorage(
    organizationId: string,
    category: string,
    filename: string,
    fileBuffer: Buffer
  ): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const uploadPath = config.upload.uploadPath || './uploads';
    const filePath = path.join(uploadPath, organizationId, category);
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFilename = `${timestamp}-${sanitizedFilename}`;
    const fullPath = path.join(filePath, finalFilename);

    // Ensure directory exists
    await fs.mkdir(filePath, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, fileBuffer);

    // Return relative path
    return path.join(organizationId, category, finalFilename);
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, organizationId: string): Promise<void> {
    // Get file record
    const [fileRecord] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.organizationId, organizationId)))
      .limit(1);

    if (!fileRecord) {
      throw new Error('File not found');
    }

    // Delete from storage
    if (fileRecord.storageProvider === 'local') {
      // Delete from local storage
      const fs = await import('fs/promises');
      const path = await import('path');
      const uploadPath = config.upload.uploadPath || './uploads';
      const fullPath = path.join(uploadPath, fileRecord.path || '');

      try {
        await fs.unlink(fullPath);
      } catch (error) {
        logger.warn('Failed to delete local file', { error, path: fullPath });
      }
    } else if (fileRecord.storageKey) {
      // Delete from S3
      try {
        await s3Client.delete(fileRecord.storageKey);
      } catch (error) {
        logger.error('Failed to delete file from S3', { error, key: fileRecord.storageKey });
      }
    }

    // Soft delete in database
    await db
      .update(files)
      .set({ deletedAt: new Date() })
      .where(eq(files.id, fileId));

    logger.info('File deleted', { fileId, organizationId });
  }

  /**
   * Get file download URL
   */
  async getDownloadUrl(
    fileId: string,
    organizationId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const [fileRecord] = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, fileId),
          eq(files.organizationId, organizationId),
          isNull(files.deletedAt)
        )
      )
      .limit(1);

    if (!fileRecord) {
      throw new Error('File not found');
    }

    // If S3 and has storage key, generate presigned URL
    if (fileRecord.storageProvider !== 'local' && fileRecord.storageKey) {
      try {
        return await s3Client.getPresignedUrl(fileRecord.storageKey, expiresIn);
      } catch (error) {
        logger.error('Failed to generate presigned URL', { error });
        // Fallback to public URL
        return fileRecord.storageUrl || '';
      }
    }

    // Return public URL or local path
    return fileRecord.storageUrl || `/uploads/${fileRecord.path}`;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string, organizationId: string) {
    const [fileRecord] = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, fileId),
          eq(files.organizationId, organizationId),
          isNull(files.deletedAt)
        )
      )
      .limit(1);

    if (!fileRecord) {
      throw new Error('File not found');
    }

    return {
      id: fileRecord.id,
      filename: fileRecord.filename,
      originalFilename: fileRecord.originalFilename,
      mimeType: fileRecord.mimeType,
      size: fileRecord.size,
      category: fileRecord.category,
      storageProvider: fileRecord.storageProvider,
      url: fileRecord.storageUrl,
      description: fileRecord.description,
      isPublic: fileRecord.isPublic,
      createdAt: fileRecord.createdAt,
      updatedAt: fileRecord.updatedAt,
    };
  }

  /**
   * List files for organization
   */
  async listFiles(
    organizationId: string,
    options?: {
      category?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let query = db
      .select()
      .from(files)
      .where(and(eq(files.organizationId, organizationId), isNull(files.deletedAt)));

    if (options?.category) {
      query = query.where(and(eq(files.category, options.category)));
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }
}

export const uploadService = new UploadService();
export default uploadService;

