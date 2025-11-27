import { pgTable, uuid, varchar, timestamp, decimal, boolean, text, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizations } from './saas/core.js';

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  managerId: uuid('manager_id'), // Self-reference to employees table can be tricky with circular deps, will handle in service
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  orgIdx: index('departments_org_idx').on(table.organizationId),
  managerIdx: index('departments_manager_idx').on(table.managerId),
}));

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  
  // Personal Info
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  tckn: varchar('tckn', { length: 11 }).notNull(), // Turkish ID Number
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  
  // Job Info
  title: varchar('title', { length: 100 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'), // Null if currently employed
  status: varchar('status', { length: 20 }).default('active'), // active, terminated, on_leave
  type: varchar('type', { length: 20 }).default('full_time'), // full_time, part_time, contractor
  
  // Salary Info (Gross)
  salaryAmount: decimal('salary_amount', { precision: 12, scale: 2 }).notNull(),
  salaryCurrency: varchar('salary_currency', { length: 3 }).default('TRY'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  orgIdx: index('employees_org_idx').on(table.organizationId),
  departmentIdx: index('employees_department_idx').on(table.departmentId),
  statusIdx: index('employees_status_idx').on(table.status),
  emailIdx: uniqueIndex('employees_email_org_idx').on(table.organizationId, table.email),
  tcknIdx: uniqueIndex('employees_tckn_org_idx').on(table.organizationId, table.tckn),
}));

export const payrolls = pgTable('payrolls', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  
  period: varchar('period', { length: 7 }).notNull(), // YYYY-MM format
  
  // Income
  grossSalary: decimal('gross_salary', { precision: 12, scale: 2 }).notNull(),
  bonus: decimal('bonus', { precision: 12, scale: 2 }).default('0'),
  overtimePay: decimal('overtime_pay', { precision: 12, scale: 2 }).default('0'),
  
  // Deductions
  sgkWorkerShare: decimal('sgk_worker_share', { precision: 12, scale: 2 }).notNull(), // %14
  unemploymentWorkerShare: decimal('unemployment_worker_share', { precision: 12, scale: 2 }).notNull(), // %1
  incomeTax: decimal('income_tax', { precision: 12, scale: 2 }).notNull(), // Gelir Vergisi
  stampTax: decimal('stamp_tax', { precision: 12, scale: 2 }).notNull(), // Damga Vergisi
  
  // Employer Costs
  sgkEmployerShare: decimal('sgk_employer_share', { precision: 12, scale: 2 }), // %20.5 (5 puan indirim hariç)
  unemploymentEmployerShare: decimal('unemployment_employer_share', { precision: 12, scale: 2 }), // %2
  
  // Net
  netSalary: decimal('net_salary', { precision: 12, scale: 2 }).notNull(),
  
  status: varchar('status', { length: 20 }).default('draft'), // draft, approved, paid
  paymentDate: timestamp('payment_date'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgIdx: index('payrolls_org_idx').on(table.organizationId),
  employeeIdx: index('payrolls_employee_idx').on(table.employeeId),
  periodIdx: index('payrolls_period_idx').on(table.period),
  statusIdx: index('payrolls_status_idx').on(table.status),
  employeePeriodIdx: uniqueIndex('payrolls_employee_period_idx').on(table.employeeId, table.period),
}));

