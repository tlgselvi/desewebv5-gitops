import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from '@/db/schema.js';

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(), // marketing | analytics | essential
    status: boolean('status').notNull(), // true=accepted false=declined
    ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('consents_user_id_idx').on(table.userId),
    purposeIdx: index('consents_purpose_idx').on(table.purpose),
    uniqueUserPurpose: index('consents_user_purpose_idx').on(table.userId, table.purpose),
  })
);

export const deletionRequests = pgTable(
  'deletion_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    processed: boolean('processed').default(false).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('deletion_requests_user_id_idx').on(table.userId),
    processedIdx: index('deletion_requests_processed_idx').on(table.processed),
  })
);

export const exportRequests = pgTable(
  'export_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    fileUrl: text('file_url'), // export ZIP link
    processed: boolean('processed').default(false).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('export_requests_user_id_idx').on(table.userId),
    processedIdx: index('export_requests_processed_idx').on(table.processed),
  })
);

