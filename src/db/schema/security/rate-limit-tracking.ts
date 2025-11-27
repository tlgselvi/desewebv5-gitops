/**
 * Rate Limit Tracking Schema
 * 
 * Tracks rate limit violations and usage for monitoring and analytics
 */

import { pgTable, uuid, varchar, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const rateLimitTracking = pgTable(
  'rate_limit_tracking',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Key information
    key: varchar('key', { length: 255 }).notNull(), // IP, user ID, org ID, etc.
    keyType: varchar('key_type', { length: 20 }).notNull(), // 'ip', 'user', 'org', 'endpoint'
    
    // Request information
    endpoint: text('endpoint'),
    method: varchar('method', { length: 10 }),
    
    // Rate limit information
    count: integer('count').notNull().default(1),
    limit: integer('limit').notNull(),
    windowMs: integer('window_ms').notNull(),
    windowStart: timestamp('window_start').notNull(),
    windowEnd: timestamp('window_end').notNull(),
    
    // Violation tracking
    blocked: boolean('blocked').default(false),
    blockedAt: timestamp('blocked_at'),
    
    // User/Organization context (optional)
    userId: uuid('user_id'),
    organizationId: uuid('organization_id'),
    
    // IP information
    ip: varchar('ip', { length: 45 }), // IPv6 support
    userAgent: text('user_agent'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    keyWindowIdx: index('rate_limit_key_window_idx').on(table.key, table.windowStart),
    blockedIdx: index('rate_limit_blocked_idx').on(table.blocked),
    userIdIdx: index('rate_limit_user_idx').on(table.userId),
    orgIdIdx: index('rate_limit_org_idx').on(table.organizationId),
    endpointIdx: index('rate_limit_endpoint_idx').on(table.endpoint),
    createdAtIdx: index('rate_limit_created_at_idx').on(table.createdAt),
  })
);

