import Redis, { Cluster } from 'ioredis';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

class RedisClusterClient {
  private cluster: Cluster | null = null;
  private singleInstance: Redis | null = null;
  private isClusterMode: boolean;
  private isInitialized: boolean = false;

  constructor() {
    this.isClusterMode = config.redis.clusterEnabled || false;
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    if (this.isClusterMode) {
      this.initializeCluster();
    } else {
      this.initializeSingleInstance();
    }

    this.isInitialized = true;
  }

  private initializeCluster(): void {
    const nodes = config.redis.clusterNodes || [];
    if (nodes.length === 0) {
      logger.warn('Redis cluster enabled but no nodes configured, falling back to single instance');
      this.initializeSingleInstance();
      return;
    }

    try {
      this.cluster = new Redis.Cluster(nodes, {
        redisOptions: {
          password: config.redis.password,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, config.redis.maxRetryDelay || 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        },
        clusterRetryStrategy: (times: number) => {
          const delay = Math.min(times * 50, config.redis.maxRetryDelay || 2000);
          return delay;
        },
        enableOfflineQueue: false,
        enableReadyCheck: true,
        maxRedirections: 3,
      });

      this.setupClusterEventHandlers();
      logger.info('Redis cluster client initialized', { nodes: nodes.length });
    } catch (error) {
      logger.error('Failed to initialize Redis cluster', { error });
      logger.warn('Falling back to single instance');
      this.initializeSingleInstance();
    }
  }

  private initializeSingleInstance(): void {
    try {
      this.singleInstance = new Redis(config.redis.url, {
        password: config.redis.password,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, config.redis.maxRetryDelay || 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      this.setupSingleInstanceEventHandlers();
      logger.info('Redis single instance client initialized');
    } catch (error) {
      logger.error('Failed to initialize Redis single instance', { error });
      throw error;
    }
  }

  private setupClusterEventHandlers(): void {
    if (!this.cluster) return;

    this.cluster.on('error', (err) => {
      logger.error('Redis cluster error', { error: err });
    });

    this.cluster.on('connect', () => {
      logger.info('Redis cluster connected');
    });

    this.cluster.on('ready', () => {
      logger.info('Redis cluster ready');
    });

    this.cluster.on('+node', (node) => {
      logger.info('Redis cluster node added', { 
        host: node.options.host,
        port: node.options.port,
      });
    });

    this.cluster.on('-node', (node) => {
      logger.warn('Redis cluster node removed', { 
        host: node.options.host,
        port: node.options.port,
      });
    });

    this.cluster.on('node error', (err, node) => {
      logger.error('Redis cluster node error', { 
        error: err,
        host: node.options.host,
        port: node.options.port,
      });
    });
  }

  private setupSingleInstanceEventHandlers(): void {
    if (!this.singleInstance) return;

    this.singleInstance.on('error', (err) => {
      logger.error('Redis connection error', { error: err });
    });

    this.singleInstance.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.singleInstance.on('ready', () => {
      logger.info('Redis ready');
    });
  }

  /**
   * Get Redis client (cluster or single instance)
   */
  getClient(): Redis | Cluster {
    if (this.cluster) {
      return this.cluster;
    }
    if (this.singleInstance) {
      return this.singleInstance;
    }
    throw new Error('Redis client not initialized');
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  /**
   * Set value with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.getClient();
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  }

  /**
   * Delete key(s)
   */
  async del(key: string | string[]): Promise<number> {
    const client = this.getClient();
    if (Array.isArray(key)) {
      return await client.del(...key);
    }
    return await client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    const client = this.getClient();
    return await client.exists(key);
  }

  /**
   * Get all keys matching pattern
   * Note: In cluster mode, this scans all nodes
   */
  async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    
    if (this.isClusterMode && this.cluster) {
      // In cluster mode, need to scan all nodes
      const keys: string[] = [];
      const nodes = this.cluster.nodes('master');
      
      for (const node of nodes) {
        try {
          const nodeKeys = await this.scanKeys(node, pattern);
          keys.push(...nodeKeys);
        } catch (error) {
          logger.warn('Failed to scan keys from cluster node', { 
            error,
            host: node.options.host,
          });
        }
      }
      
      // Remove duplicates
      return [...new Set(keys)];
    }
    
    return await client.keys(pattern);
  }

  /**
   * Scan keys from a specific node (for cluster mode)
   */
  private async scanKeys(node: Redis, pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      try {
        const result = await node.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } catch (error) {
        logger.error('Error scanning keys', { error, pattern });
        break;
      }
    } while (cursor !== '0');
    
    return keys;
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<number> {
    const client = this.getClient();
    return await client.expire(key, seconds);
  }

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    const client = this.getClient();
    return await client.incr(key);
  }

  /**
   * Increment by value
   */
  async incrby(key: string, increment: number): Promise<number> {
    const client = this.getClient();
    return await client.incrby(key, increment);
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    const client = this.getClient();
    return await client.decr(key);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  /**
   * Get cluster info (only for cluster mode)
   */
  async getClusterInfo(): Promise<Record<string, unknown> | null> {
    if (!this.isClusterMode || !this.cluster) {
      return null;
    }

    try {
      const nodes = this.cluster.nodes('master');
      const info: Record<string, unknown> = {
        mode: 'cluster',
        nodeCount: nodes.length,
        nodes: nodes.map(node => ({
          host: node.options.host,
          port: node.options.port,
          status: node.status,
        })),
      };

      return info;
    } catch (error) {
      logger.error('Failed to get cluster info', { error });
      return null;
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      if (this.cluster) {
        await this.cluster.quit();
        this.cluster = null;
      }
      if (this.singleInstance) {
        await this.singleInstance.quit();
        this.singleInstance = null;
      }
      this.isInitialized = false;
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error closing Redis connections', { error });
    }
  }
}

export const redisCluster = new RedisClusterClient();
export default redisCluster;

