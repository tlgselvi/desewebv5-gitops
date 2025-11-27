import { pgTable, text, timestamp, uuid, varchar, decimal, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from '../saas.js';
import { subscriptions } from './subscriptions.js';
import { paymentMethods } from './payments.js';

/**
 * Invoice Line Item Type
 */
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'subscription' | 'usage' | 'addon' | 'discount';
}

/**
 * Subscription Invoices Table
 * Tracks invoices for subscriptions, usage-based charges, and add-ons
 */
export const subscriptionInvoices = pgTable('subscription_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
  
  // Invoice details
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(), // INV-2025-00001
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(), // Subtotal before tax
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0'), // Tax amount (VAT/KDV)
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'), // Discount amount
  total: decimal('total', { precision: 10, scale: 2 }).notNull(), // Final amount (amount + tax - discount)
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  // 'draft', 'pending', 'paid', 'failed', 'cancelled', 'refunded'
  
  // Dates
  dueDate: timestamp('due_date').notNull(),
  paidDate: timestamp('paid_date'),
  
  // Line items (JSONB)
  lineItems: jsonb('line_items').notNull().$type<InvoiceLineItem[]>(),
  
  // PDF
  pdfUrl: text('pdf_url'),
  pdfGeneratedAt: timestamp('pdf_generated_at'),
  
  // External IDs
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('invoices_org_idx').on(table.organizationId),
  invoiceNumberIdx: uniqueIndex('invoices_number_idx').on(table.invoiceNumber),
  statusIdx: index('invoices_status_idx').on(table.status),
  dueDateIdx: index('invoices_due_date_idx').on(table.dueDate),
  subscriptionIdx: index('invoices_subscription_idx').on(table.subscriptionId),
  stripeIdx: index('invoices_stripe_idx').on(table.stripeInvoiceId),
}));

// Relations
export const subscriptionInvoicesRelations = relations(subscriptionInvoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptionInvoices.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [subscriptionInvoices.subscriptionId],
    references: [subscriptions.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [subscriptionInvoices.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

