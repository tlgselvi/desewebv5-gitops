import { IBankProvider, BankTransaction } from './types.js';
import { logger } from '@/utils/logger.js';

export class IsBankProvider implements IBankProvider {
  name = 'IsBank';
  private baseUrl = 'https://api.isbank.com.tr/sandbox/v1'; // Mock URL

  constructor(private apiKey: string, private apiSecret: string) {}

  async getBalance(accountNumber: string): Promise<number> {
    logger.info(`Fetching balance for account ${accountNumber} from IsBank`);
    // Mock Implementation
    // Gerçek entegrasyonda burada HTTP request atılır.
    return Promise.resolve(125000.50); 
  }

  async getTransactions(accountNumber: string, fromDate: Date): Promise<BankTransaction[]> {
    logger.info(`Fetching transactions for account ${accountNumber} since ${fromDate.toISOString()}`);
    
    // Mock Transactions (Sandbox verisi)
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
}

