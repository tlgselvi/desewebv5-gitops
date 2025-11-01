import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';

// Create the connection with connection pooling and retry logic
const connectionString = config.database.url;

const client = postgres(connectionString, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  max_lifetime: 60 * 30, // Maximum connection lifetime (30 minutes)
  onnotice: () => {}, // Suppress PostgreSQL notices
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL compatibility
  },
});

// Create the database instance
export const db = drizzle(client, { schema });

// Export schema for use in other modules
export * from './schema.js';

// Database health check with retry logic
export async function checkDatabaseConnection(retries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client`SELECT 1`;
      return true;
    } catch (error) {
      logger.warn(`Database connection check failed (attempt ${attempt}/${retries})`, { error });
      
      if (attempt === retries) {
        logger.error('Database connection check failed after all retries', { error });
        return false;
      }
      
      // Exponential backoff: wait 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  
  return false;
}

// Test database connection with retry
export async function testDatabaseConnection(): Promise<void> {
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client`SELECT 1`;
      logger.info('Database connection successful', { attempt });
      return;
    } catch (error) {
      logger.error(`Database connection attempt ${attempt}/${maxRetries} failed`, { error });
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
      }
      
      logger.info(`Retrying database connection in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await client.end({ timeout: 5 });
    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error closing database connection', { error });
    throw error;
  }
}

// Get connection pool statistics
export function getConnectionStats(): {
  total: number;
  idle: number;
  waiting: number;
} {
  // Note: postgres-js doesn't expose pool stats directly
  // This is a placeholder for future implementation with a connection pool library
  return {
    total: 0,
    idle: 0,
    waiting: 0,
  };
}
