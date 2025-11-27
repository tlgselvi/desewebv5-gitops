import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';
import { updateDatabaseConnections } from '@/middleware/prometheus.js';
import { connectionManager } from './connection-manager.js';

// Use connection manager for primary connection
// This provides read replica support when enabled
const db = connectionManager.getPrimaryConnection();

// Legacy client for backward compatibility
// This is used for RLS context setting and monitoring
// In the future, we should migrate to connection manager for all operations
let legacyClient: postgres.Sql | null = null;

// Initialize legacy client for monitoring and RLS
function initializeLegacyClient(): postgres.Sql {
  if (!legacyClient) {
    const connectionString = config.database.url;
    legacyClient = postgres(connectionString, {
      max: config.database.maxPoolSize || 20,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
      prepare: false,
    });
  }
  return legacyClient;
}

// Monitor connection pool
let connectionCheckInterval: NodeJS.Timeout | null = null;

function startConnectionMonitoring(): void {
  if (connectionCheckInterval) {
    return;
  }

  connectionCheckInterval = setInterval(async () => {
    try {
      const client = initializeLegacyClient();
      // Get connection pool stats from postgres client
      // Note: postgres-js doesn't expose pool stats directly, so we track active connections
      const result = await client`SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()`;
      const activeConnections = Number(result[0]?.active_connections || 0);
      updateDatabaseConnections(activeConnections);
      
      // Update connection manager metrics
      await connectionManager.updateMetrics();
    } catch (error) {
      logger.error('Failed to monitor database connections', { error });
    }
  }, 10000); // Check every 10 seconds
}

// Start monitoring
startConnectionMonitoring();

// Export the database instance (uses primary connection)
export { db };

// Export postgres client for RLS context setting
// Note: This uses legacy client for backward compatibility
export function getPostgresClient() {
  return initializeLegacyClient();
}

// Export schema for use in other modules
export * from './schema/index.js';

// Database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = initializeLegacyClient();
    await client`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
  
  if (legacyClient) {
    await legacyClient.end();
    legacyClient = null;
  }
  
  await connectionManager.closeAllConnections();
}

// Export connection manager for advanced usage
export { connectionManager };
