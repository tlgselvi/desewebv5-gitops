import { pgTable, text, timestamp, boolean, uuid, varchar, integer, decimal, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Subscription Plans Table
 * Defines available subscription plans with pricing and feature limits
 */
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(), // 'Free', 'Starter', 'Professional', 'Enterprise'
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  description: text('description'),
  
  // Pricing
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull(), // 'monthly', 'yearly'
  trialDays: integer('trial_days').default(14),
  
  // Feature limits (JSONB for flexibility)
  features: jsonb('features').notNull().$type<{
    maxUsers: number;
    maxStorage: number; // GB
    maxApiCalls: number; // per month
    maxDevices: number; // IoT devices
    maxSms: number; // per month
    maxEmails: number; // per month
    modules: string[]; // ['finance', 'crm', 'inventory', 'hr', 'iot', 'service']
    advancedFeatures: string[]; // ['ai_insights', 'custom_reports', 'api_access', 'webhooks']
  }>(),
  
  // Status & Visibility
  isActive: boolean('is_active').default(true),
  isPublic: boolean('is_public').default(true), // Show in pricing page
  sortOrder: integer('sort_order').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('subscription_plans_slug_idx').on(table.slug),
  activeIdx: index('subscription_plans_active_idx').on(table.isActive, table.isPublic),
}));

// Relations (will be defined in subscriptions.ts to avoid circular dependencies)

