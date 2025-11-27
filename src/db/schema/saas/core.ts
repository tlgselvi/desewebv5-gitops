import { pgTable, text, timestamp, boolean, uuid, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { seoProjects, seoAlerts, seoReports } from '../legacy-seo.js';
import { subscriptionPlans, subscriptions, paymentMethods, subscriptionInvoices } from './index.js';

// Multi-tenancy Core: Organizations
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(), // URL friendly name
  taxId: varchar('tax_id', { length: 50 }), // Vergi No
  taxOffice: varchar('tax_office', { length: 100 }), // Vergi Dairesi
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('starter'), // starter, pro, enterprise
  status: varchar('status', { length: 50 }).default('active'), // active, suspended, cancelled
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
  taxIdIdx: index('organizations_tax_id_idx').on(table.taxId),
}));

// Integrations (Tenant Settings)
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  provider: varchar('provider', { length: 50 }).notNull(), // 'stripe', 'isbank', 'foriba', 'sendgrid', 'aws_ses', 'twilio'
  category: varchar('category', { length: 50 }).notNull(), // 'payment', 'banking', 'einvoice', 'email', 'sms'
  
  // Encrypted Credentials
  apiKey: text('api_key'),
  apiSecret: text('api_secret'),
  endpointUrl: text('endpoint_url'),
  
  // Config JSON (Additional settings like webhook_secret, region, etc.)
  config: text('config'), // JSON stringified
  
  isActive: boolean('is_active').default(true),
  isVerified: boolean('is_verified').default(false), // Test connection successful?
  
  lastSync: timestamp('last_sync'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgProviderIdx: uniqueIndex('integrations_org_provider_idx').on(table.organizationId, table.provider),
}));

// Users (Updated for Multi-tenancy)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('user').notNull(), // admin, user, accountant, sales, super_admin
  isActive: boolean('is_active').default(true).notNull(),
  
  // Multi-tenancy Link
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  orgIdx: index('users_organization_idx').on(table.organizationId),
}));

// Permissions & Roles (RBAC)
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  resource: varchar('resource', { length: 50 }).notNull(), // finance, crm, settings
  action: varchar('action', { length: 50 }).notNull(), // read, write, delete, all
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  permissions: many(permissions),
  integrations: many(integrations),
  // Subscription relations
  subscriptions: many(subscriptions),
  paymentMethods: many(paymentMethods),
  invoices: many(subscriptionInvoices),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  // Legacy Relations (Keep them working)
  seoProjects: many(seoProjects),
  resolvedAlerts: many(seoAlerts),
  generatedReports: many(seoReports),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  organization: one(organizations, {
    fields: [permissions.organizationId],
    references: [organizations.id],
  }),
}));

