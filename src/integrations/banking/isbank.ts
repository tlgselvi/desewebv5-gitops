import { IBankProvider, BankTransaction } from './types.js';
import { logger } from '@/utils/logger.js';

export class IsBankProvider implements IBankProvider {
  name = 'IsBank';
  private baseUrl: string;
  private isSandbox: boolean;

  constructor(
    private apiKey: string, 
    private apiSecret: string,
    options?: { sandbox?: boolean; baseUrl?: string }
  ) {
    this.isSandbox = options?.sandbox ?? true;
    this.baseUrl = options?.baseUrl ?? (this.isSandbox 
      ? 'https://api.isbank.com.tr/sandbox/v1' 
      : 'https://api.isbank.com.tr/v1');
  }

  /**
   * Get account balance
   * @param accountNumber Bank account number
   */
  async getBalance(accountNumber: string): Promise<number> {
    logger.info(`[IsBank] Fetching balance for account ${accountNumber}`);

    // Sandbox mode: Return mock data
    if (this.isSandbox || !this.apiKey || !this.apiSecret) {
      logger.debug('[IsBank] Using sandbox/mock mode');
      return Promise.resolve(125000.50);
    }

    // Production mode: Real API call
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${accountNumber}/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Secret': this.apiSecret,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`IsBank API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info(`[IsBank] Balance fetched: ${data.balance}`);
      return parseFloat(data.balance);
    } catch (error) {
      logger.error('[IsBank] Failed to fetch balance', error);
      throw error;
    }
  }

  /**
   * Get transactions for an account
   * @param accountNumber Bank account number
   * @param fromDate Start date for transaction query
   */
  async getTransactions(accountNumber: string, fromDate?: Date): Promise<BankTransaction[]> {
    const queryDate = fromDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d;
    })();
    logger.info(`[IsBank] Fetching transactions for account ${accountNumber} since ${queryDate.toISOString()}`);

    // Sandbox mode: Return mock data
    if (this.isSandbox || !this.apiKey || !this.apiSecret) {
      logger.debug('[IsBank] Using sandbox/mock mode');
      const mockTransactions: BankTransaction[] = [
        {
          externalId: `ISB-${Date.now()}-1`,
          date: new Date(),
          amount: 15000,
          description: 'Müşteri Ödemesi - ABC Ltd',
          type: 'incoming',
          counterparty: 'ABC Ltd. Şti.'
        },
        {
          externalId: `ISB-${Date.now()}-2`,
          date: new Date(Date.now() - 86400000), // Dün
          amount: -2500,
          description: 'AWS Bulut Hizmetleri',
          type: 'outgoing',
          counterparty: 'Amazon Web Services'
        },
        {
          externalId: `ISB-${Date.now()}-3`,
          date: new Date(Date.now() - 172800000), // Önceki gün
          amount: -1200,
          description: 'Yemek Kartı Yüklemesi',
          type: 'outgoing',
          counterparty: 'Multinet'
        }
      ];
      return Promise.resolve(mockTransactions);
    }

    // Production mode: Real API call
    try {
      const dateStr = queryDate.toISOString().split('T')[0] || queryDate.toISOString().substring(0, 10);
      const params = new URLSearchParams();
      params.append('fromDate', dateStr); // YYYY-MM-DD format
      params.append('limit', '100');

      const response = await fetch(`${this.baseUrl}/accounts/${accountNumber}/transactions?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Secret': this.apiSecret,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`IsBank API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const transactions: BankTransaction[] = data.transactions.map((tx: any) => ({
        externalId: tx.id,
        date: new Date(tx.date),
        amount: parseFloat(tx.amount),
        description: tx.description || tx.reference,
        type: parseFloat(tx.amount) >= 0 ? 'incoming' : 'outgoing',
        counterparty: tx.counterparty || tx.beneficiary,
      }));

      logger.info(`[IsBank] Fetched ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      logger.error('[IsBank] Failed to fetch transactions', error);
      throw error;
    }
  }
}

