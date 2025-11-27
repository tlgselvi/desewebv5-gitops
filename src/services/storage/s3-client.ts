import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';
import { recordS3Upload, recordS3Download } from '@/middleware/prometheus.js';

interface S3Config {
  provider: 'aws' | 'minio' | 'digitalocean';
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

class S3StorageClient {
  private client: S3Client;
  private bucket: string;
  private provider: string;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = config.storage.enabled || false;
    this.provider = config.storage.provider || 'aws';
    this.bucket = config.storage.bucket || 'dese-storage';

    if (!this.isEnabled) {
      logger.info('S3 storage is disabled');
      // Create a dummy client that will throw errors if used
      this.client = {} as S3Client;
      return;
    }

    const s3Config: S3Config = {
      provider: this.provider,
      region: config.storage.region || 'us-east-1',
      bucket: this.bucket,
      accessKeyId: config.storage.accessKeyId || '',
      secretAccessKey: config.storage.secretAccessKey || '',
      endpoint: config.storage.endpoint,
      forcePathStyle: config.storage.forcePathStyle || false,
    };

    if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
      logger.warn('S3 credentials not configured, storage operations will fail');
    }

    this.client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      endpoint: s3Config.endpoint,
      forcePathStyle: s3Config.forcePathStyle,
      // For MinIO compatibility
      ...(s3Config.endpoint && {
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      }),
    });

    logger.info('S3 client initialized', {
      provider: this.provider,
      bucket: this.bucket,
      region: s3Config.region,
      enabled: this.isEnabled,
    });
  }

  /**
   * Check if S3 storage is enabled
   */
  isStorageEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Upload file to S3
   */
  async upload(
    key: string,
    body: Buffer | string,
    contentType?: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('S3 storage is not enabled');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
        Metadata: metadata,
      });

      await this.client.send(command);

      logger.info('File uploaded to S3', { key, bucket: this.bucket });
      
      // Record metrics
      recordS3Upload(this.bucket, 'success');

      return this.getUrl(key);
    } catch (error) {
      logger.error('S3 upload failed', { error, key });
      // Record error metrics
      recordS3Upload(this.bucket, 'error');
      throw error;
    }
  }

  /**
   * Download file from S3
   */
  async download(key: string): Promise<Buffer> {
    if (!this.isEnabled) {
      throw new Error('S3 storage is not enabled');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        // Handle different response body types
        if (response.Body instanceof Uint8Array) {
          return Buffer.from(response.Body);
        }

        // Handle stream
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      const buffer = Buffer.concat(chunks);
      
      // Record metrics
      recordS3Download(this.bucket, 'success');
      
      return buffer;
    } catch (error) {
      logger.error('S3 download failed', { error, key });
      // Record error metrics
      recordS3Download(this.bucket, 'error');
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async delete(key: string): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('S3 storage is not enabled');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      logger.info('File deleted from S3', { key });
    } catch (error) {
      logger.error('S3 delete failed', { error, key });
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error('S3 exists check failed', { error, key });
      throw error;
    }
  }

  /**
   * List objects in S3
   */
  async list(prefix?: string, maxKeys?: number): Promise<string[]> {
    if (!this.isEnabled) {
      throw new Error('S3 storage is not enabled');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys || 1000,
      });

      const response = await this.client.send(command);
      return (response.Contents || []).map((item) => item.Key || '').filter(Boolean);
    } catch (error) {
      logger.error('S3 list failed', { error, prefix });
      throw error;
    }
  }

  /**
   * Generate presigned URL for file access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('S3 storage is not enabled');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error('Failed to generate presigned URL', { error, key });
      throw error;
    }
  }

  /**
   * Get public URL for file
   */
  getUrl(key: string): string {
    if (config.storage.cdnEnabled && config.storage.cdnUrl) {
      return `${config.storage.cdnUrl}/${key}`;
    }

    if (this.provider === 'aws') {
      const region = config.storage.region || 'us-east-1';
      return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
    }

    if (config.storage.endpoint) {
      // For MinIO or DigitalOcean Spaces
      const endpoint = config.storage.endpoint.replace(/\/$/, '');
      if (config.storage.forcePathStyle) {
        return `${endpoint}/${this.bucket}/${key}`;
      }
      return `${endpoint}/${key}`;
    }

    return `https://${this.bucket}/${key}`;
  }

  /**
   * Generate key for organization file
   */
  generateKey(organizationId: string, category: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `organizations/${organizationId}/${category}/${timestamp}-${sanitizedFilename}`;
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<Record<string, string> | null> {
    if (!this.isEnabled) {
      throw new Error('S3 storage is not enabled');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      return {
        contentType: response.ContentType || '',
        contentLength: response.ContentLength?.toString() || '0',
        lastModified: response.LastModified?.toISOString() || '',
        etag: response.ETag || '',
        ...(response.Metadata || {}),
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      logger.error('Failed to get file metadata', { error, key });
      throw error;
    }
  }
}

export const s3Client = new S3StorageClient();
export default s3Client;

