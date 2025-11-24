export interface FinancialSummary {
  totalRevenue: number;
  pendingPayments: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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
    try {
      const response = await fetch(`${API_URL}/finance/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': 'default-org-id', // Geçici
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fatura oluşturulamadı');
      }

      return await response.json();
    } catch (error) {
      console.error('Create invoice failed:', error);
      throw error;
    }
  },

  async getSummary(): Promise<FinancialSummary> {
    try {
      const response = await fetch(`${API_URL}/finance/dashboard/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth headers here
          'x-organization-id': 'default-org-id', // Geçici
        },
        cache: 'no-store', // Her zaman güncel veri çek
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch financial summary:', error);
      // Hata durumunda 0 dön, uygulamayı patlatma
      return {
        totalRevenue: 0,
        pendingPayments: 0,
      };
    }
  }
};

