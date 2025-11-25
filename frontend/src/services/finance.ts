import { authenticatedGet, authenticatedPost } from "@/lib/api";

export interface FinancialSummary {
  totalRevenue: number;
  pendingPayments: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface CreateInvoiceDTO {
  accountId: string;
  type: 'sales' | 'purchase';
  invoiceDate: string;
  items: InvoiceItem[];
}

export const financeService = {
  async createInvoice(data: CreateInvoiceDTO): Promise<any> {
    return await authenticatedPost<any>("/api/v1/finance/invoices", data);
  },

  async getSummary(): Promise<FinancialSummary> {
    try {
      return await authenticatedGet<FinancialSummary>("/api/v1/finance/dashboard/summary");
    } catch (error) {
      console.error('Failed to fetch financial summary:', error);
      return {
        totalRevenue: 0,
        pendingPayments: 0,
      };
    }
  }
};
