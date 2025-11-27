import { pgTable, text, timestamp, uuid, varchar, decimal, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from '../saas.js';
import { subscriptions } from './subscriptions.js';

/**
 * Usage Metrics Table
 * Tracks usage metrics for organizations (API calls, storage, users, etc.)
 */
export const usageMetrics = pgTable('usage_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  
  // Metric details
  metricType: varchar('metric_type', { length: 50 }).notNull(),
  // 'api_calls', 'storage', 'users', 'devices', 'sms', 'emails', 'feature_usage'
  
  value: decimal('value', { precision: 15, scale: 2 }).notNull(),
  period: varchar('period', { length: 20 }).notNull(), // 'daily', 'monthly'
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Additional context
  metadata: jsonb('metadata'), // Additional context (endpoint, feature name, etc.)
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgMetricIdx: index('usage_org_metric_idx').on(table.organizationId, table.metricType),
  periodIdx: index('usage_period_idx').on(table.periodStart, table.periodEnd),
  subscriptionIdx: index('usage_subscription_idx').on(table.subscriptionId),
  typePeriodIdx: index('usage_type_period_idx').on(table.metricType, table.periodStart, table.periodEnd),
}));

// Relations
export const usageMetricsRelations = relations(usageMetrics, ({ one }) => ({
  organization: one(organizations, {
    fields: [usageMetrics.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [usageMetrics.subscriptionId],
    references: [subscriptions.id],
  }),
}));

