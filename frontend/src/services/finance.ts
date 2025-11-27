/**
 * Finance Service
 * 
 * Handles all finance and accounting API operations.
 * Errors are properly propagated to allow React Query to handle them.
 */

import { authenticatedGet, authenticatedPost } from "@/lib/api";
import { logger } from "@/lib/logger";
import type {
  FinancialSummary,
  Transaction,
  MonthlyRevenue,
  Invoice,
  InvoiceItem,
  CreateInvoiceDTO,
  ExchangeRate,
} from "@/types/finance";

// Re-export types for backward compatibility
export type {
  FinancialSummary,
  Transaction,
  MonthlyRevenue,
  Invoice,
  InvoiceItem,
  CreateInvoiceDTO,
  ExchangeRate,
} from "@/types/finance";

export interface FinanceInvoice {
  id: string;
  invoiceNumber: string;
  accountId: string;
  type: 'sales' | 'purchase';
  invoiceDate: string;
  totalAmount: number;
  taxAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  items: InvoiceItem[];
  createdAt: string;
}

// =============================================================================
// SERVICE
// =============================================================================

export const financeService = {
  /**
   * Create a new invoice
   * @throws {ApiError} When request fails or validation error
   */
  async createInvoice(data: CreateInvoiceDTO): Promise<Invoice> {
    try {
      return await authenticatedPost<Invoice>("/api/v1/finance/invoices", data);
    } catch (error) {
      logger.error("Failed to create invoice", error, { data });
      throw error;
    }
  },

  /**
   * Get financial dashboard summary
   * @throws {ApiError} When request fails
   */
  async getSummary(): Promise<FinancialSummary> {
    try {
      return await authenticatedGet<FinancialSummary>("/api/v1/finance/dashboard/summary");
    } catch (error) {
      logger.error("Failed to fetch financial summary", error);
      throw error; // Re-throw instead of returning default values
    }
  },

  /**
   * Get all invoices
   * @throws {ApiError} When request fails
   */
  async getInvoices(params?: { type?: string; status?: string }): Promise<Invoice[]> {
    try {
      let url = "/api/v1/finance/invoices";
      
      if (params) {
        const searchParams = new URLSearchParams();
        if (params.type) searchParams.append('type', params.type);
        if (params.status) searchParams.append('status', params.status);
        
        const queryString = searchParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
      
      return await authenticatedGet<Invoice[]>(url);
    } catch (error) {
      logger.error("Failed to fetch invoices", error, { params });
      throw error;
    }
  },

  /**
   * Get recent transactions
   * @throws {ApiError} When request fails
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
      return await authenticatedGet<Transaction[]>(`/api/v1/finance/transactions?limit=${limit}`);
    } catch (error) {
      logger.error("Failed to fetch recent transactions", error);
      throw error;
    }
  },

  /**
   * Get monthly revenue data
   * @throws {ApiError} When request fails
   */
  async getMonthlyRevenue(months: number = 12): Promise<MonthlyRevenue[]> {
    try {
      return await authenticatedGet<MonthlyRevenue[]>(`/api/v1/finance/analytics/monthly-revenue?months=${months}`);
    } catch (error) {
      logger.error("Failed to fetch monthly revenue", error);
      throw error;
    }
  },
};

export default financeService;
