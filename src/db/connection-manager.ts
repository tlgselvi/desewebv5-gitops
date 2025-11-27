import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';
import {
  updateDatabaseReplicationLag,
  updateDatabaseConnectionPool,
} from '@/middleware/prometheus.js';

type QueryType = 'read' | 'write' | 'transaction';

interface ConnectionConfig {
  url: string;
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  max_lifetime: number;
}

class ConnectionManager {
  private primaryConnection: ReturnType<typeof drizzle> | null = null;
  private replicaConnections: ReturnType<typeof drizzle>[] = [];
  private replicaIndex = 0;
  private replicationLagThreshold: number;
  private primaryClient: postgres.Sql | null = null;

  constructor() {
    this.replicationLagThreshold = config.database.replicationLagThreshold || 1000;
    this.initializeConnections();
  }

  private initializeConnections(): void {
    // Primary connection (write)
    const primaryConfig: ConnectionConfig = {
      url: config.database.url,
      max: config.database.maxPoolSize || 20,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    };
    
    this.primaryClient = postgres(primaryConfig.url, {
      max: primaryConfig.max,
      idle_timeout: primaryConfig.idle_timeout,
      connect_timeout: primaryConfig.connect_timeout,
      max_lifetime: primaryConfig.max_lifetime,
      prepare: false,
    });

    this.primaryConnection = drizzle(this.primaryClient, { schema });

    // Replica connections (read)
    const replicaUrls = config.database.readReplicaUrls || [];
    if (config.database.enableReadReplica && replicaUrls.length > 0) {
      this.replicaConnections = replicaUrls.map((url: string) => {
        const replicaClient = postgres(url, {
          max: primaryConfig.max,
          idle_timeout: primaryConfig.idle_timeout,
          connect_timeout: primaryConfig.connect_timeout,
          max_lifetime: primaryConfig.max_lifetime,
          prepare: false,
        });
        return drizzle(replicaClient, { schema });
      });
    }

    logger.info('Connection manager initialized', {
      primary: !!this.primaryConnection,
      replicas: this.replicaConnections.length,
      readReplicaEnabled: config.database.enableReadReplica,
    });
  }

  /**
   * Get connection based on query type
   */
  getConnection(queryType: QueryType = 'read'): ReturnType<typeof drizzle> {
    if (queryType === 'write' || queryType === 'transaction') {
      return this.primaryConnection!;
    }

    // Read queries: use replica with round-robin if enabled
    if (config.database.enableReadReplica && this.replicaConnections.length > 0) {
      const replica = this.replicaConnections[this.replicaIndex];
      this.replicaIndex = (this.replicaIndex + 1) % this.replicaConnections.length;
      return replica;
    }

    // Fallback to primary if no replicas available
    return this.primaryConnection!;
  }

  /**
   * Get primary connection for write operations
   */
  getPrimaryConnection(): ReturnType<typeof drizzle> {
    return this.primaryConnection!;
  }

  /**
   * Get replica connection (round-robin)
   */
  getReplicaConnection(): ReturnType<typeof drizzle> {
    return this.getConnection('read');
  }

  /**
   * Check replication lag
   */
  async checkReplicationLag(): Promise<number> {
    try {
      if (!this.primaryClient) {
        return Infinity;
      }

      // Query replication lag from primary
      // This query checks the lag between primary and replicas
      const result = await this.primaryClient`
        SELECT 
          EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms
        FROM pg_stat_replication
        WHERE sync_state = 'async'
        ORDER BY lag_ms DESC
        LIMIT 1
      `;

      const lag = result[0]?.lag_ms ? Number(result[0].lag_ms) : 0;
      
      // Update Prometheus metrics
      updateDatabaseReplicationLag(lag);
      
      return lag;
    } catch (error) {
      logger.error('Failed to check replication lag', { error });
      return Infinity;
    }
  }

  /**
   * Update connection pool metrics
   */
  async updateMetrics(): Promise<void> {
    try {
      if (this.primaryClient) {
        // Get primary pool stats
        const primaryStats = await this.primaryClient`
          SELECT 
            count(*) as active,
            (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_conn
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `;
        
        const active = Number(primaryStats[0]?.active || 0);
        const maxConn = Number(primaryStats[0]?.max_conn || 20);
        
        updateDatabaseConnectionPool('primary', maxConn, active);
      }

      // Check replication lag periodically
      await this.checkReplicationLag();
    } catch (error) {
      logger.error('Failed to update connection pool metrics', { error });
    }
  }

  /**
   * Ensure read-after-write consistency
   * Waits for replication to catch up before returning
   */
  async ensureConsistency<T>(
    writeFn: () => Promise<T>,
    readFn: () => Promise<unknown>,
    maxWaitMs: number = 1000
  ): Promise<T> {
    const result = await writeFn();
    
    // Wait for replication with timeout
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      try {
        await readFn();
        return result;
      } catch (error) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.warn('Read-after-write consistency timeout', { maxWaitMs });
    return result;
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    try {
      if (this.primaryClient) {
        await this.primaryClient.end();
      }
      logger.info('All database connections closed');
    } catch (error) {
      logger.error('Error closing database connections', { error });
    }
  }
}

export const connectionManager = new ConnectionManager();
export default connectionManager;

