/**
 * Finance Types
 * 
 * Type definitions for finance and accounting operations.
 */

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/**
 * Transaction type (income or expense)
 */
export type TransactionType = 'income' | 'expense';

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  category?: string;
  accountId?: string;
  reference?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Monthly revenue data for charts
 */
export interface MonthlyRevenue {
  name: string;
  total: number;
  month?: string;
}

// =============================================================================
// FINANCIAL SUMMARY
// =============================================================================

/**
 * Financial summary for dashboard
 */
export interface FinancialSummary {
  totalRevenue: number;
  totalExpense?: number;
  pendingPayments: number;
  netIncome?: number;
  recentTransactions?: Transaction[];
  monthlyRevenue?: MonthlyRevenue[];
}

// =============================================================================
// INVOICE TYPES
// =============================================================================

/**
 * Invoice type
 */
export type InvoiceType = 'sales' | 'purchase';

/**
 * Invoice status
 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/**
 * Invoice line item
 */
export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total?: number;
}

/**
 * Invoice record
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  accountId: string;
  type: InvoiceType;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create invoice payload
 */
export interface CreateInvoiceDTO {
  accountId: string;
  type: InvoiceType;
  invoiceDate: string;
  dueDate?: string;
  items: Omit<InvoiceItem, 'id' | 'total'>[];
  notes?: string;
}

// =============================================================================
// ACCOUNT TYPES
// =============================================================================

/**
 * Account type (for chart of accounts)
 */
export type AccountType = 
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense';

/**
 * Financial account
 */
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  balance: number;
  currency: string;
  isActive: boolean;
  organizationId: string;
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

/**
 * Payment method
 */
export type PaymentMethod = 
  | 'cash'
  | 'bank_transfer'
  | 'credit_card'
  | 'check'
  | 'other';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Payment record
 */
export interface Payment {
  id: string;
  invoiceId?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  reference?: string;
  notes?: string;
}

// =============================================================================
// EXCHANGE RATE TYPES
// =============================================================================

/**
 * Currency code
 */
export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP';

/**
 * Exchange rate data
 */
export interface ExchangeRate {
  base: CurrencyCode;
  target: CurrencyCode;
  rate: number;
  date: string;
}

