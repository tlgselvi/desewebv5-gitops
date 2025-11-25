import crypto from 'crypto';
import { logger } from '@/utils/logger.js';

/**
 * Service for encrypting/decrypting integration credentials
 * Uses AES-256-GCM for authenticated encryption
 */
export class CredentialEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64;
  private readonly tagLength = 16;

  /**
   * Get encryption key from environment or generate a default one
   * In production, this should be stored in a secure key management service (AWS KMS, HashiCorp Vault, etc.)
   */
  private getEncryptionKey(): Buffer {
    const key = process.env.INTEGRATION_ENCRYPTION_KEY;
    
    if (!key) {
      logger.warn('[CredentialEncryption] INTEGRATION_ENCRYPTION_KEY not set, using default (NOT SECURE FOR PRODUCTION)');
      // Default key for development only - MUST be changed in production
      return crypto.scryptSync('default-dev-key-change-in-production', 'salt', this.keyLength);
    }

    // If key is provided as hex string, convert it
    if (key.length === 64) {
      return Buffer.from(key, 'hex');
    }

    // Otherwise, derive key from the provided string
    return crypto.scryptSync(key, 'integration-salt', this.keyLength);
  }

  /**
   * Encrypt sensitive data (API keys, secrets, etc.)
   */
  encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine IV + AuthTag + Encrypted data
      // Format: iv:authTag:encrypted (all hex encoded)
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('[CredentialEncryption] Encryption failed', error);
      throw new Error('Failed to encrypt credential');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encrypted] = parts;
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted data format: missing parts');
      }
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8') || '';
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('[CredentialEncryption] Decryption failed', error);
      throw new Error('Failed to decrypt credential');
    }
  }

  /**
   * Hash a value (one-way, for comparison purposes)
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

export const credentialEncryption = new CredentialEncryptionService();

