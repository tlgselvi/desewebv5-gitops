/**
 * Dynamic Blocking Middleware
 * 
 * Implements brute-force protection, suspicious IP blocking, and temporary bans
 * @module middleware/security/dynamic-blocking
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

export interface BlockingConfig {
  // Brute-force protection
  maxLoginAttempts: number;
  loginWindowSeconds: number;
  loginBlockDurationSeconds: number;
  
  // Suspicious activity
  maxSuspiciousRequests: number;
  suspiciousWindowSeconds: number;
  suspiciousBlockDurationSeconds: number;
  
  // Global rate limits
  maxRequestsPerMinute: number;
  globalBlockDurationSeconds: number;
  
  // IP Reputation
  enableIpReputation: boolean;
  blockedIpList: string[];
  allowedIpList: string[];
}

interface BlockRecord {
  ip: string;
  reason: string;
  blockedAt: number;
  expiresAt: number;
  attempts: number;
}

const DEFAULT_CONFIG: BlockingConfig = {
  maxLoginAttempts: 5,
  loginWindowSeconds: 300, // 5 minutes
  loginBlockDurationSeconds: 1800, // 30 minutes
  
  maxSuspiciousRequests: 10,
  suspiciousWindowSeconds: 60,
  suspiciousBlockDurationSeconds: 3600, // 1 hour
  
  maxRequestsPerMinute: 1000,
  globalBlockDurationSeconds: 600, // 10 minutes
  
  enableIpReputation: true,
  blockedIpList: [],
  allowedIpList: [],
};

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
  /\.\.\//g, // Directory traversal
  /<script/gi, // XSS attempts
  /union\s+select/gi, // SQL injection
  /exec\s*\(/gi, // Command injection
  /eval\s*\(/gi, // Eval injection
  /onclick|onerror|onload/gi, // Event handlers
  /javascript:/gi, // JavaScript protocol
  /data:text\/html/gi, // Data URI XSS
  /base64/gi, // Base64 encoded payloads
  /document\.cookie/gi, // Cookie theft
];

/**
 * Dynamic Blocking Service
 */
export class DynamicBlockingService {
  private redis: Redis;
  private config: BlockingConfig;
  private localBlocklist: Map<string, BlockRecord> = new Map();
  private keyPrefix = 'blocking';

  constructor(redisUrl: string, blockingConfig?: Partial<BlockingConfig>) {
    this.redis = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    this.config = { ...DEFAULT_CONFIG, ...blockingConfig };

    this.redis.on('error', (err) => {
      logger.error('Redis error in dynamic blocking', { error: err });
    });

    // Cleanup local blocklist periodically
    setInterval(() => this.cleanupLocalBlocklist(), 60000);
  }

  /**
   * Check if IP is blocked
   */
  async isBlocked(ip: string): Promise<{ blocked: boolean; reason?: string; expiresIn?: number }> {
    // Check allowlist first
    if (this.config.allowedIpList.includes(ip)) {
      return { blocked: false };
    }

    // Check static blocklist
    if (this.config.blockedIpList.includes(ip)) {
      return { blocked: true, reason: 'IP is in blocklist' };
    }

    // Check local blocklist (fallback if Redis fails)
    const localBlock = this.localBlocklist.get(ip);
    if (localBlock && localBlock.expiresAt > Date.now()) {
      return {
        blocked: true,
        reason: localBlock.reason,
        expiresIn: Math.ceil((localBlock.expiresAt - Date.now()) / 1000),
      };
    }

    // Check Redis blocklist
    try {
      const blockKey = `${this.keyPrefix}:blocked:${ip}`;
      const blockData = await this.redis.get(blockKey);
      
      if (blockData) {
        const block = JSON.parse(blockData) as BlockRecord;
        const ttl = await this.redis.ttl(blockKey);
        return {
          blocked: true,
          reason: block.reason,
          expiresIn: ttl > 0 ? ttl : undefined,
        };
      }
    } catch (error) {
      logger.error('Error checking block status', { error, ip });
    }

    return { blocked: false };
  }

  /**
   * Record login attempt
   */
  async recordLoginAttempt(ip: string, userId: string, success: boolean): Promise<void> {
    const key = `${this.keyPrefix}:login:${ip}:${userId}`;

    try {
      if (success) {
        // Clear attempts on successful login
        await this.redis.del(key);
        return;
      }

      // Increment failed attempts
      const attempts = await this.redis.incr(key);
      
      // Set expiration on first attempt
      if (attempts === 1) {
        await this.redis.expire(key, this.config.loginWindowSeconds);
      }

      // Check if threshold exceeded
      if (attempts >= this.config.maxLoginAttempts) {
        await this.blockIp(
          ip,
          'brute_force',
          this.config.loginBlockDurationSeconds,
          attempts
        );
        
        logger.warn('IP blocked for brute-force attempt', {
          ip,
          userId,
          attempts,
          blockDuration: this.config.loginBlockDurationSeconds,
        });
      }
    } catch (error) {
      logger.error('Error recording login attempt', { error, ip, userId });
    }
  }

  /**
   * Analyze request for suspicious patterns
   */
  async analyzeRequest(req: Request): Promise<{ suspicious: boolean; patterns: string[] }> {
    const suspiciousPatterns: string[] = [];
    
    // Analyze URL
    const url = req.originalUrl || req.url;
    
    // Analyze request body
    const body = JSON.stringify(req.body || {});
    
    // Analyze query parameters
    const query = JSON.stringify(req.query || {});
    
    // Check all patterns
    const fullPayload = `${url} ${body} ${query}`;
    
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(fullPayload)) {
        suspiciousPatterns.push(pattern.source);
      }
    }

    return {
      suspicious: suspiciousPatterns.length > 0,
      patterns: suspiciousPatterns,
    };
  }

  /**
   * Record suspicious activity
   */
  async recordSuspiciousActivity(
    ip: string,
    patterns: string[],
    details?: Record<string, unknown>
  ): Promise<void> {
    const key = `${this.keyPrefix}:suspicious:${ip}`;

    try {
      const count = await this.redis.incr(key);
      
      if (count === 1) {
        await this.redis.expire(key, this.config.suspiciousWindowSeconds);
      }

      // Log the suspicious activity
      logger.warn('Suspicious activity detected', {
        ip,
        patterns,
        count,
        details,
      });

      // Check threshold
      if (count >= this.config.maxSuspiciousRequests) {
        await this.blockIp(
          ip,
          'suspicious_activity',
          this.config.suspiciousBlockDurationSeconds,
          count
        );
      }
    } catch (error) {
      logger.error('Error recording suspicious activity', { error, ip });
    }
  }

  /**
   * Block an IP address
   */
  async blockIp(
    ip: string,
    reason: string,
    durationSeconds: number,
    attempts?: number
  ): Promise<void> {
    const blockRecord: BlockRecord = {
      ip,
      reason,
      blockedAt: Date.now(),
      expiresAt: Date.now() + durationSeconds * 1000,
      attempts: attempts || 0,
    };

    try {
      const key = `${this.keyPrefix}:blocked:${ip}`;
      await this.redis.setex(key, durationSeconds, JSON.stringify(blockRecord));
    } catch (error) {
      logger.error('Error blocking IP in Redis, using local blocklist', { error, ip });
    }

    // Always add to local blocklist as fallback
    this.localBlocklist.set(ip, blockRecord);

    logger.warn('IP blocked', {
      ip,
      reason,
      durationSeconds,
      expiresAt: new Date(blockRecord.expiresAt).toISOString(),
    });
  }

  /**
   * Unblock an IP address
   */
  async unblockIp(ip: string): Promise<void> {
    try {
      const key = `${this.keyPrefix}:blocked:${ip}`;
      await this.redis.del(key);
    } catch (error) {
      logger.error('Error unblocking IP in Redis', { error, ip });
    }

    this.localBlocklist.delete(ip);
    logger.info('IP unblocked', { ip });
  }

  /**
   * Get all blocked IPs
   */
  async getBlockedIps(): Promise<BlockRecord[]> {
    const blockedIps: BlockRecord[] = [];

    try {
      const keys = await this.redis.keys(`${this.keyPrefix}:blocked:*`);
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          blockedIps.push(JSON.parse(data));
        }
      }
    } catch (error) {
      logger.error('Error getting blocked IPs', { error });
    }

    // Include local blocklist
    for (const [, record] of this.localBlocklist) {
      if (record.expiresAt > Date.now()) {
        blockedIps.push(record);
      }
    }

    return blockedIps;
  }

  /**
   * Cleanup expired entries from local blocklist
   */
  private cleanupLocalBlocklist(): void {
    const now = Date.now();
    for (const [ip, record] of this.localBlocklist) {
      if (record.expiresAt <= now) {
        this.localBlocklist.delete(ip);
      }
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
let blockingService: DynamicBlockingService | null = null;

/**
 * Get or create blocking service instance
 */
export function getBlockingService(): DynamicBlockingService {
  if (!blockingService) {
    blockingService = new DynamicBlockingService(config.redis.url);
  }
  return blockingService;
}

/**
 * Dynamic blocking middleware
 */
export function dynamicBlockingMiddleware() {
  const service = getBlockingService();

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      // Check if IP is blocked
      const blockStatus = await service.isBlocked(ip);
      
      if (blockStatus.blocked) {
        logger.warn('Blocked request from banned IP', {
          ip,
          reason: blockStatus.reason,
          expiresIn: blockStatus.expiresIn,
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: 'Your IP has been temporarily blocked due to suspicious activity',
          reason: blockStatus.reason,
          retryAfter: blockStatus.expiresIn,
        });
      }

      // Analyze request for suspicious patterns
      const analysis = await service.analyzeRequest(req);
      
      if (analysis.suspicious) {
        await service.recordSuspiciousActivity(ip, analysis.patterns, {
          url: req.originalUrl,
          method: req.method,
          userAgent: req.get('user-agent'),
        });
      }

      next();
    } catch (error) {
      logger.error('Dynamic blocking middleware error', { error, ip });
      // Fail open to avoid blocking legitimate requests
      next();
    }
  };
}

/**
 * Login protection middleware
 * Use on authentication endpoints
 */
export function loginProtectionMiddleware() {
  const service = getBlockingService();

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = req.body?.email || req.body?.username || 'unknown';

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to detect login success/failure
    res.json = function (body: unknown) {
      const responseBody = body as { success?: boolean; error?: string; user?: unknown };
      const success = responseBody?.user !== undefined || responseBody?.success === true;
      
      // Record the attempt
      service.recordLoginAttempt(ip, userId, success).catch((err) => {
        logger.error('Failed to record login attempt', { error: err });
      });

      return originalJson(body);
    };

    next();
  };
}

