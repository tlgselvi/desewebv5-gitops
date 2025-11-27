import { pgTable, text, timestamp, boolean, uuid, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from '../saas.js';
import { subscriptionPlans } from './plans.js';
import { paymentMethods } from './payments.js';

/**
 * Subscriptions Table
 * Tracks organization subscriptions to plans
 */
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'), 
  // 'trial', 'active', 'past_due', 'canceled', 'unpaid'
  
  // Period tracking
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  canceledAt: timestamp('canceled_at'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  
  // Payment info
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id),
  
  // External IDs (Stripe, etc.)
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  
  // Metadata
  metadata: jsonb('metadata'), // Custom data, upgrade/downgrade notes, etc.
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('subscriptions_org_idx').on(table.organizationId),
  planIdx: index('subscriptions_plan_idx').on(table.planId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
  periodIdx: index('subscriptions_period_idx').on(table.currentPeriodStart, table.currentPeriodEnd),
  stripeIdx: index('subscriptions_stripe_idx').on(table.stripeSubscriptionId),
}));

// Relations (lazy loaded to avoid circular dependencies)
export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [subscriptions.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

