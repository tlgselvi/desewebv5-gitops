import { pgTable, text, timestamp, boolean, integer, decimal, jsonb, uuid, varchar, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations, users } from './saas';

// Contacts (Kişiler)
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  jobTitle: varchar('job_title', { length: 100 }),
  companyName: varchar('company_name', { length: 255 }),
  source: varchar('source', { length: 50 }), // linkedin, website, referral
  
  assignedTo: uuid('assigned_to').references(() => users.id), // Satış temsilcisi
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('contacts_org_idx').on(table.organizationId),
  emailIdx: index('contacts_email_idx').on(table.organizationId, table.email),
  assignedIdx: index('contacts_assigned_idx').on(table.assignedTo),
}));

// Pipeline Stages (Satış Aşamaları)
export const pipelineStages = pgTable('pipeline_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // New Lead, Contacted, Proposal, Negotiation, Won
  order: integer('order').notNull(),
  color: varchar('color', { length: 20 }).default('#3b82f6'),
  probability: integer('probability').default(0), // Kazanma ihtimali %
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Deals (Satış Fırsatları)
export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id),
  stageId: uuid('stage_id').references(() => pipelineStages.id).notNull(),
  
  title: varchar('title', { length: 255 }).notNull(),
  value: decimal('value', { precision: 15, scale: 2 }).default('0.00'),
  currency: varchar('currency', { length: 3 }).default('TRY'),
  
  expectedCloseDate: timestamp('expected_close_date'),
  winProbability: integer('win_probability'), // AI tarafından da güncellenebilir
  
  status: varchar('status', { length: 20 }).default('open'), // open, won, lost, abandoned
  lostReason: text('lost_reason'),
  
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('deals_org_idx').on(table.organizationId),
  stageIdx: index('deals_stage_idx').on(table.stageId),
  statusIdx: index('deals_status_idx').on(table.status),
  closeDateIdx: index('deals_close_date_idx').on(table.expectedCloseDate),
}));

// Activities (CRM Aktiviteleri)
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  dealId: uuid('deal_id').references(() => deals.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  
  type: varchar('type', { length: 50 }).notNull(), // call, email, meeting, note, task
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description'),
  
  status: varchar('status', { length: 20 }).default('pending'), // pending, completed
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('activities_org_idx').on(table.organizationId),
  dealIdx: index('activities_deal_idx').on(table.dealId),
  typeIdx: index('activities_type_idx').on(table.type),
}));

// Relations
export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  deals: many(deals),
  activities: many(activities),
  assignee: one(users, {
    fields: [contacts.assignedTo],
    references: [users.id],
  }),
}));

export const pipelineStagesRelations = relations(pipelineStages, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [pipelineStages.organizationId],
    references: [organizations.id],
  }),
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  stage: one(pipelineStages, {
    fields: [deals.stageId],
    references: [pipelineStages.id],
  }),
  activities: many(activities),
  assignee: one(users, {
    fields: [deals.assignedTo],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  organization: one(organizations, {
    fields: [activities.organizationId],
    references: [organizations.id],
  }),
  deal: one(deals, {
    fields: [activities.dealId],
    references: [deals.id],
  }),
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
  assignee: one(users, {
    fields: [activities.assignedTo],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [activities.createdBy],
    references: [users.id],
  }),
}));

