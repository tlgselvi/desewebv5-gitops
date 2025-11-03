import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as rbacSchema from './schema/rbac.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';

// Create the connection
const connectionString = config.database.url;
const client = postgres(connectionString);

// Create the database instance
export const db = drizzle(client, { schema: { ...schema, ...rbacSchema } });

// Export schema for use in other modules
export * from './schema.js';
export * from './schema/rbac.js';

// Database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await client.end();
}
