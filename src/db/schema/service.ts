import { pgTable, text, timestamp, boolean, integer, decimal, jsonb, uuid, varchar, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './saas.js';
import { contacts } from './crm.js';

// Service Requests (Servis Talepleri)
export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  contactId: uuid('contact_id').references(() => contacts.id),
  requestNumber: varchar('request_number', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 20 }).default('medium').notNull(), // low, medium, high, urgent
  status: varchar('status', { length: 50 }).default('open').notNull(), // open, assigned, in_progress, completed, cancelled
  category: varchar('category', { length: 100 }), // installation, repair, maintenance, inspection
  requestedBy: uuid('requested_by').references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id), // Technician
  scheduledDate: timestamp('scheduled_date'),
  completedDate: timestamp('completed_date'),
  estimatedDuration: integer('estimated_duration'), // minutes
  actualDuration: integer('actual_duration'), // minutes
  cost: decimal('cost', { precision: 10, scale: 2 }),
  location: jsonb('location').$type<{
    address?: string;
    latitude?: number;
    longitude?: number;
  }>(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('service_requests_org_idx').on(table.organizationId),
  contactIdx: index('service_requests_contact_idx').on(table.contactId),
  statusIdx: index('service_requests_status_idx').on(table.status),
  assignedIdx: index('service_requests_assigned_idx').on(table.assignedTo),
  requestNumberIdx: index('service_requests_number_idx').on(table.requestNumber),
}));

// Technicians (Teknisyenler)
export const technicians = pgTable('technicians', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  employeeNumber: varchar('employee_number', { length: 50 }),
  specialization: jsonb('specialization').$type<string[]>(), // ['installation', 'repair', 'maintenance']
  skillLevel: varchar('skill_level', { length: 20 }).default('intermediate'), // junior, intermediate, senior, expert
  availability: varchar('availability', { length: 20 }).default('available'), // available, busy, on_leave, unavailable
  currentLocation: jsonb('current_location').$type<{
    latitude?: number;
    longitude?: number;
    address?: string;
  }>(),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('technicians_org_idx').on(table.organizationId),
  userIdx: index('technicians_user_idx').on(table.userId),
  availabilityIdx: index('technicians_availability_idx').on(table.availability),
}));

// Service Visits (Servis Ziyaretleri)
export const serviceVisits = pgTable('service_visits', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  requestId: uuid('request_id').references(() => serviceRequests.id).notNull(),
  technicianId: uuid('technician_id').references(() => technicians.id).notNull(),
  visitNumber: varchar('visit_number', { length: 50 }).notNull(),
  scheduledStart: timestamp('scheduled_start').notNull(),
  scheduledEnd: timestamp('scheduled_end'),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  status: varchar('status', { length: 50 }).default('scheduled').notNull(), // scheduled, in_progress, completed, cancelled, no_show
  notes: text('notes'),
  workPerformed: text('work_performed'),
  materialsUsed: jsonb('materials_used').$type<Array<{
    name: string;
    quantity: number;
    unit: string;
    cost?: number;
  }>>(),
  customerSignature: text('customer_signature'), // Base64 encoded signature
  customerRating: integer('customer_rating'), // 1-5
  customerFeedback: text('customer_feedback'),
  photos: jsonb('photos').$type<string[]>(), // URLs or paths
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('service_visits_org_idx').on(table.organizationId),
  requestIdx: index('service_visits_request_idx').on(table.requestId),
  technicianIdx: index('service_visits_technician_idx').on(table.technicianId),
  statusIdx: index('service_visits_status_idx').on(table.status),
  scheduledStartIdx: index('service_visits_scheduled_start_idx').on(table.scheduledStart),
}));

// Maintenance Plans (Bakım Planları)
export const maintenancePlans = pgTable('maintenance_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  contactId: uuid('contact_id').references(() => contacts.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  planType: varchar('plan_type', { length: 50 }).notNull(), // preventive, corrective, scheduled
  frequency: varchar('frequency', { length: 50 }).notNull(), // daily, weekly, monthly, quarterly, yearly, custom
  frequencyValue: integer('frequency_value'), // e.g., 3 for "every 3 months"
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  nextScheduledDate: timestamp('next_scheduled_date'),
  assignedTechnicianId: uuid('assigned_technician_id').references(() => technicians.id),
  estimatedDuration: integer('estimated_duration'), // minutes
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  tasks: jsonb('tasks').$type<Array<{
    id: string;
    title: string;
    description?: string;
    order: number;
  }>>(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('maintenance_plans_org_idx').on(table.organizationId),
  contactIdx: index('maintenance_plans_contact_idx').on(table.contactId),
  nextScheduledIdx: index('maintenance_plans_next_scheduled_idx').on(table.nextScheduledDate),
  isActiveIdx: index('maintenance_plans_active_idx').on(table.isActive),
}));

// Maintenance Executions (Bakım Uygulamaları)
export const maintenanceExecutions = pgTable('maintenance_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  planId: uuid('plan_id').references(() => maintenancePlans.id).notNull(),
  visitId: uuid('visit_id').references(() => serviceVisits.id),
  scheduledDate: timestamp('scheduled_date').notNull(),
  executedDate: timestamp('executed_date'),
  status: varchar('status', { length: 50 }).default('scheduled').notNull(), // scheduled, completed, skipped, cancelled
  executedBy: uuid('executed_by').references(() => technicians.id),
  notes: text('notes'),
  tasksCompleted: jsonb('tasks_completed').$type<Array<{
    taskId: string;
    completed: boolean;
    notes?: string;
  }>>(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('maintenance_executions_org_idx').on(table.organizationId),
  planIdx: index('maintenance_executions_plan_idx').on(table.planId),
  visitIdx: index('maintenance_executions_visit_idx').on(table.visitId),
  statusIdx: index('maintenance_executions_status_idx').on(table.status),
  scheduledDateIdx: index('maintenance_executions_scheduled_date_idx').on(table.scheduledDate),
}));

// Define relations
export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [serviceRequests.contactId],
    references: [contacts.id],
  }),
  requestedByUser: one(users, {
    fields: [serviceRequests.requestedBy],
    references: [users.id],
  }),
  assignedTechnician: one(technicians, {
    fields: [serviceRequests.assignedTo],
    references: [technicians.id],
  }),
  visits: many(serviceVisits),
}));

export const techniciansRelations = relations(technicians, ({ one, many }) => ({
  user: one(users, {
    fields: [technicians.userId],
    references: [users.id],
  }),
  assignedRequests: many(serviceRequests),
  visits: many(serviceVisits),
  maintenancePlans: many(maintenancePlans),
}));

export const serviceVisitsRelations = relations(serviceVisits, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [serviceVisits.requestId],
    references: [serviceRequests.id],
  }),
  technician: one(technicians, {
    fields: [serviceVisits.technicianId],
    references: [technicians.id],
  }),
}));

export const maintenancePlansRelations = relations(maintenancePlans, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [maintenancePlans.contactId],
    references: [contacts.id],
  }),
  assignedTechnician: one(technicians, {
    fields: [maintenancePlans.assignedTechnicianId],
    references: [technicians.id],
  }),
  executions: many(maintenanceExecutions),
}));

export const maintenanceExecutionsRelations = relations(maintenanceExecutions, ({ one }) => ({
  plan: one(maintenancePlans, {
    fields: [maintenanceExecutions.planId],
    references: [maintenancePlans.id],
  }),
  visit: one(serviceVisits, {
    fields: [maintenanceExecutions.visitId],
    references: [serviceVisits.id],
  }),
  executedByTechnician: one(technicians, {
    fields: [maintenanceExecutions.executedBy],
    references: [technicians.id],
  }),
}));

