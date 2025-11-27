/**
 * Vector DB Schema
 * 
 * Schema for vector index metadata and chat history
 */

import { pgTable, uuid, varchar, timestamp, integer, jsonb, text, index } from 'drizzle-orm/pg-core';
import { organizations } from './saas/core.js';
import { users } from './saas/core.js';

/**
 * Vector Index Metadata Table
 * 
 * Tracks indexing status and metadata for vectorized content
 */
export const vectorIndexMetadata = pgTable('vector_index_metadata', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  indexName: varchar('index_name', { length: 255 }).notNull(),
  sourceType: varchar('source_type', { length: 100 }).notNull(), // 'database', 'file', 'api'
  sourceId: varchar('source_id', { length: 255 }),
  lastIndexedAt: timestamp('last_indexed_at'),
  indexedCount: integer('indexed_count').default(0),
  status: varchar('status', { length: 50 }).default('active'), // 'active', 'paused', 'error'
  config: jsonb('config'), // Index-specific configuration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('vector_index_metadata_org_idx').on(table.organizationId),
  sourceIdx: index('vector_index_metadata_source_idx').on(table.organizationId, table.sourceType, table.sourceId),
  statusIdx: index('vector_index_metadata_status_idx').on(table.organizationId, table.status),
}));

/**
 * Chat History Table
 * 
 * Stores conversation history for AI chat assistant
 */
export const chatHistory = pgTable('chat_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user', 'assistant', 'system'
  message: text('message').notNull(),
  metadata: jsonb('metadata'), // Citations, sources, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgUserIdx: index('chat_history_org_user_idx').on(table.organizationId, table.userId),
  sessionIdx: index('chat_history_session_idx').on(table.organizationId, table.sessionId),
  createdAtIdx: index('chat_history_created_at_idx').on(table.createdAt),
}));

