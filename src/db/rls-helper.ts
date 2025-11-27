import { getPostgresClient } from './index.js';
import { logger } from '@/utils/logger.js';

/**
 * Row-Level Security (RLS) Helper Functions
 * 
 * These functions set PostgreSQL session variables that are used by RLS policies
 * to filter data based on organization_id and user role.
 * 
 * Note: RLS context is set per database connection/session. In a connection pool,
 * each request gets a connection from the pool, so we need to set the context
 * for each request. The context is automatically cleared when the connection
 * is returned to the pool.
 */

/**
 * Set RLS context for a database session
 * This must be called before any database queries in a request
 * 
 * IMPORTANT: This function uses SET LOCAL which only works within a transaction.
 * For non-transaction queries, the RLS context should be set at the connection level.
 * However, since we're using a connection pool, we set it per request via middleware.
 * 
 * For transactions: RLS context must be set BEFORE starting the transaction.
 * The middleware sets it before any queries, so transactions will inherit it.
 * 
 * @param organizationId - User's organization ID
 * @param userId - Current user ID
 * @param userRole - Current user role (e.g., 'admin', 'user', 'super_admin')
 */
export async function setRLSContext(
  organizationId: string | undefined,
  userId: string,
  userRole: string
): Promise<void> {
  try {
    if (!userId) {
      logger.error('RLS context set without userId', { organizationId, userRole });
      throw new Error('RLS context requires userId');
    }

    if (!organizationId) {
      logger.warn('RLS context set without organizationId', { userId, userRole });
      // Don't throw - super_admin might not have organizationId
      // But we should still set user context for audit purposes
    }

    const client = getPostgresClient();

    // Set session variables that RLS policies will use
    // Using SET LOCAL so it's scoped to the current transaction
    // Note: SET LOCAL only works within a transaction. For connection-level setting,
    // we would use SET (without LOCAL), but that persists across transactions.
    // Since middleware sets this before any queries, transactions will inherit it.
    
    if (organizationId) {
      await client`SET LOCAL app.current_organization_id = ${organizationId}`;
    }
    await client`SET LOCAL app.current_user_id = ${userId}`;
    await client`SET LOCAL app.current_user_role = ${userRole}`;

    logger.debug('RLS context set', { organizationId, userId, userRole });
  } catch (error) {
    logger.error('Failed to set RLS context', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      organizationId,
      userId,
      userRole,
    });
    // Re-throw in production to prevent queries without RLS context
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    // In development, log warning but continue
    logger.warn('RLS context not set - continuing in development mode');
  }
}

/**
 * Clear RLS context (optional, session variables are cleared at transaction end)
 */
export async function clearRLSContext(): Promise<void> {
  try {
    const client = getPostgresClient();
    await client`RESET app.current_organization_id`;
    await client`RESET app.current_user_id`;
    await client`RESET app.current_user_role`;
  } catch (error) {
    // Ignore errors when clearing
    logger.debug('RLS context cleared (or already cleared)');
  }
}

/**
 * Execute a query with RLS context
 * Wrapper function that sets RLS context before executing a query
 * 
 * @param organizationId - User's organization ID
 * @param userId - Current user ID
 * @param userRole - Current user role
 * @param queryFn - Function that returns a promise with the query result
 */
export async function withRLSContext<T>(
  organizationId: string | undefined,
  userId: string,
  userRole: string,
  queryFn: () => Promise<T>
): Promise<T> {
  await setRLSContext(organizationId, userId, userRole);
  try {
    return await queryFn();
  } finally {
    // Context is automatically cleared at transaction end, but we can explicitly clear it
    await clearRLSContext();
  }
}

