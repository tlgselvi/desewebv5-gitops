import { pgTable, text, timestamp, boolean, uuid, varchar, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from '../saas.js';

/**
 * Payment Methods Table
 * Stores payment methods (credit cards, bank accounts) for organizations
 */
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  // Payment method type
  type: varchar('type', { length: 20 }).notNull(), // 'card', 'bank_transfer'
  provider: varchar('provider', { length: 50 }).notNull(), // 'stripe', 'paypal', 'iyzico'
  
  // Card details (masked - never store full card numbers)
  last4: varchar('last4', { length: 4 }), // Last 4 digits of card
  brand: varchar('brand', { length: 20 }), // 'visa', 'mastercard', 'amex', 'discover'
  expiryMonth: integer('expiry_month'),
  expiryYear: integer('expiry_year'),
  
  // Status
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  
  // External IDs (Stripe, etc.)
  stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('payment_methods_org_idx').on(table.organizationId),
  defaultIdx: index('payment_methods_default_idx').on(table.organizationId, table.isDefault),
  stripeIdx: index('payment_methods_stripe_idx').on(table.stripePaymentMethodId),
}));

// Relations
export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentMethods.organizationId],
    references: [organizations.id],
  }),
}));

