import { pgTable, text, timestamp, boolean, integer, decimal, jsonb, uuid, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations, users } from './saas/core.js';

// Chart of Accounts (Hesap Planı)
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  code: varchar('code', { length: 50 }).notNull(), // 100, 120, 320 gibi
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // asset, liability, equity, revenue, expense
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  balance: decimal('balance', { precision: 15, scale: 2 }).default('0.00'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('accounts_org_idx').on(table.organizationId),
  codeIdx: index('accounts_code_idx').on(table.organizationId, table.code),
}));

// Invoices (Faturalar - E-Fatura Uyumlu)
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(), // Müşteri/Tedarikçi hesabı
  
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(), // GIB format: GIB2025000000001
  invoiceDate: timestamp('invoice_date').notNull(),
  dueDate: timestamp('due_date'),
  
  type: varchar('type', { length: 20 }).notNull(), // sales, purchase
  status: varchar('status', { length: 20 }).default('draft'), // draft, sent, paid, overdue, cancelled
  
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  taxTotal: decimal('tax_total', { precision: 15, scale: 2 }).notNull(),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).default('1.0000'),
  
  notes: text('notes'),
  gibStatus: varchar('gib_status', { length: 50 }), // GIB entegrasyon durumu
  
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('invoices_org_idx').on(table.organizationId),
  numberIdx: uniqueIndex('invoices_number_idx').on(table.organizationId, table.invoiceNumber),
  dateIdx: index('invoices_date_idx').on(table.invoiceDate),
  statusIdx: index('invoices_status_idx').on(table.status),
  accountIdx: index('invoices_account_idx').on(table.accountId),
  orgStatusIdx: index('invoices_org_status_idx').on(table.organizationId, table.status),
  orgDateIdx: index('invoices_org_date_idx').on(table.organizationId, table.invoiceDate),
  // Composite index for type + status queries (getFinancialSummary)
  orgTypeStatusIdx: index('invoices_org_type_status_idx').on(table.organizationId, table.type, table.status),
}));

// Invoice Items (Fatura Kalemleri)
export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }).notNull(),
  taxRate: integer('tax_rate').default(20).notNull(), // %1, %10, %20
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).notNull(),
  total: decimal('total', { precision: 15, scale: 2 }).notNull(),
}, (table) => ({
  invoiceIdx: index('invoice_items_invoice_idx').on(table.invoiceId),
}));

// Financial Transactions (Kasa/Banka Hareketleri - Tek Taraflı)
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  
  date: timestamp('date').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(), // + giriş, - çıkış
  description: varchar('description', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }), // payment, collection, expense, salary
  
  referenceId: uuid('reference_id'), // invoice_id vb.
  referenceType: varchar('reference_type', { length: 50 }), // invoice, salary, tax
  
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('transactions_org_idx').on(table.organizationId),
  dateIdx: index('transactions_date_idx').on(table.date),
  accountIdx: index('transactions_account_idx').on(table.accountId),
  categoryIdx: index('transactions_category_idx').on(table.category),
  orgDateIdx: index('transactions_org_date_idx').on(table.organizationId, table.date),
  referenceIdx: index('transactions_reference_idx').on(table.referenceId, table.referenceType),
}));

// General Ledger (Yevmiye Defteri - Çift Taraflı)
export const ledgers = pgTable('ledgers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  journalNumber: varchar('journal_number', { length: 50 }).notNull(), // Yevmiye No
  date: timestamp('date').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).default('general'), // opening, closing, general
  
  referenceId: uuid('reference_id'),
  referenceType: varchar('reference_type', { length: 50 }),
  
  status: varchar('status', { length: 20 }).default('draft'), // draft, posted
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('ledgers_org_idx').on(table.organizationId),
  dateIdx: index('ledgers_date_idx').on(table.date),
  journalIdx: uniqueIndex('ledgers_journal_idx').on(table.organizationId, table.journalNumber),
    // Composite index for date range queries
    orgDateIdx: index('ledgers_org_date_idx').on(table.organizationId, table.date),
  }));

// Ledger Entries (Yevmiye Maddeleri)
export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  ledgerId: uuid('ledger_id').references(() => ledgers.id).notNull(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  
  debit: decimal('debit', { precision: 15, scale: 2 }).default('0.00'),
  credit: decimal('credit', { precision: 15, scale: 2 }).default('0.00'),
  
  description: varchar('description', { length: 255 }),
  documentNumber: varchar('document_number', { length: 50 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  ledgerIdx: index('ledger_entries_ledger_idx').on(table.ledgerId),
  accountIdx: index('ledger_entries_account_idx').on(table.accountId),
}));

// Relations
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [accounts.organizationId],
    references: [organizations.id],
  }),
  invoices: many(invoices),
  transactions: many(transactions),
  ledgerEntries: many(ledgerEntries),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  account: one(accounts, {
    fields: [invoices.accountId],
    references: [accounts.id],
  }),
  items: many(invoiceItems),
  creator: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [transactions.organizationId],
    references: [organizations.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  creator: one(users, {
    fields: [transactions.createdBy],
    references: [users.id],
  }),
}));

export const ledgersRelations = relations(ledgers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ledgers.organizationId],
    references: [organizations.id],
  }),
  entries: many(ledgerEntries),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  ledger: one(ledgers, {
    fields: [ledgerEntries.ledgerId],
    references: [ledgers.id],
  }),
  account: one(accounts, {
    fields: [ledgerEntries.accountId],
    references: [accounts.id],
  }),
}));
