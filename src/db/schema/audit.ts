import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
    userId: uuid('user_id'),
    ip: varchar('ip', { length: 64 }),
    method: varchar('method', { length: 8 }).notNull(),
    path: varchar('path', { length: 512 }).notNull(),
    resource: varchar('resource', { length: 128 }),
    action: varchar('action', { length: 64 }),
    status: integer('status').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    traceId: varchar('trace_id', { length: 64 }),
    payloadHash: varchar('payload_hash', { length: 128 }),
    meta: text('meta'), // opsiyonel ek alan (JSON string)
  },
  (table) => ({
    tsIdx: index('idx_audit_ts').on(table.ts),
    userIdIdx: index('idx_audit_user').on(table.userId),
    resourceIdx: index('idx_audit_resource').on(table.resource),
  })
);

