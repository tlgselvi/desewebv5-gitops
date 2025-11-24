export interface BankTransaction {
  externalId: string;
  date: Date;
  amount: number;
  description: string;
  type: 'incoming' | 'outgoing';
  counterparty?: string; // Gönderen/Alıcı
}

export interface BankAccountSummary {
  accountId: string;
  balance: number;
  currency: string;
  lastSync: Date;
}

export interface IBankProvider {
  name: string;
  getTransactions(accountNumber: string, fromDate: Date): Promise<BankTransaction[]>;
  getBalance(accountNumber: string): Promise<number>;
}

