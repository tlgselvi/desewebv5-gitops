import { IBankProvider, BankTransaction } from './types.js';
import { logger } from '@/utils/logger.js';
import { retry, isRetryableHttpError } from '@/utils/retry.js';

export interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  description?: string;
  toBankCode?: string; // Banka kodu (EFT için)
}

export interface TransferResponse {
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  fee?: number;
  completedAt?: Date;
  errorMessage?: string;
}

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

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Secret': this.apiSecret,
      'Content-Type': 'application/json',
    };
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

    // Production mode: Real API call with retry
    return await retry(
      async () => {
        const response = await fetch(`${this.baseUrl}/accounts/${accountNumber}/balance`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`IsBank API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        logger.info(`[IsBank] Balance fetched: ${data.balance}`, { accountNumber });
        return parseFloat(data.balance);
      },
      {
        maxRetries: 3,
        delayMs: 1000,
        retryableErrors: isRetryableHttpError,
      }
    ).catch((error) => {
      logger.error('[IsBank] Failed to fetch balance after retries', { error, accountNumber });
      throw error;
    });
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

    // Production mode: Real API call with retry
    return await retry(
      async () => {
        const dateStr = queryDate.toISOString().split('T')[0] || queryDate.toISOString().substring(0, 10);
        const params = new URLSearchParams();
        params.append('fromDate', dateStr); // YYYY-MM-DD format
        params.append('limit', '100');

        const response = await fetch(`${this.baseUrl}/accounts/${accountNumber}/transactions?${params}`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`IsBank API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
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

        logger.info(`[IsBank] Fetched ${transactions.length} transactions`, { accountNumber });
        return transactions;
      },
      {
        maxRetries: 3,
        delayMs: 1000,
        retryableErrors: isRetryableHttpError,
      }
    ).catch((error) => {
      logger.error('[IsBank] Failed to fetch transactions after retries', { error, accountNumber });
      throw error;
    });
  }

  /**
   * Transfer money (Havale/EFT)
   * @param request Transfer request details
   */
  async transfer(request: TransferRequest): Promise<TransferResponse> {
    logger.info(`[IsBank] Initiating transfer from ${request.fromAccount} to ${request.toAccount}`, {
      amount: request.amount,
      currency: request.currency,
    });

    // Sandbox mode: Return mock response
    if (this.isSandbox || !this.apiKey || !this.apiSecret) {
      logger.debug('[IsBank] Using sandbox/mock mode for transfer');
      return {
        transactionId: `TRX-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: 'completed',
        amount: request.amount,
        fee: request.amount * 0.001, // Mock fee: 0.1%
        completedAt: new Date(),
      };
    }

    // Production mode: Real API call with retry
    return await retry(
      async () => {
        const payload = {
          fromAccount: request.fromAccount,
          toAccount: request.toAccount,
          amount: request.amount,
          currency: request.currency,
          description: request.description || '',
          toBankCode: request.toBankCode, // Required for EFT (inter-bank transfers)
        };

        const response = await fetch(`${this.baseUrl}/transfers`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(60000), // 60 second timeout for transfers
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
          logger.error('[IsBank] Transfer failed', {
            status: response.status,
            error: errorMessage,
            request,
          });
          
          return {
            transactionId: '',
            status: 'failed',
            amount: request.amount,
            errorMessage,
          };
        }

        const data = await response.json();
        logger.info('[IsBank] Transfer completed', {
          transactionId: data.transactionId,
          status: data.status,
        });

        return {
          transactionId: data.transactionId,
          status: data.status === 'completed' ? 'completed' : data.status === 'pending' ? 'pending' : 'failed',
          amount: parseFloat(data.amount),
          fee: data.fee ? parseFloat(data.fee) : undefined,
          completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        };
      },
      {
        maxRetries: 2, // Fewer retries for transfers (financial operations)
        delayMs: 2000,
        retryableErrors: (error) => {
          // Don't retry on 4xx errors (bad request, insufficient funds, etc.)
          if (error instanceof Error) {
            if (error.message.includes('400') || 
                error.message.includes('401') || 
                error.message.includes('402') || // Payment required
                error.message.includes('403')) {
              return false;
            }
          }
          return isRetryableHttpError(error);
        },
      }
    ).catch((error) => {
      logger.error('[IsBank] Failed to transfer after retries', { error, request });
      return {
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    });
  }
}

