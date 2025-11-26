import { db } from '@/db/index.js';
import { invoices, invoiceItems, accounts, transactions, ledgers, ledgerEntries, organizations } from '@/db/schema/index.js';
import { eq, sql, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { BankTransaction } from '@/integrations/banking/types.js';
import { EInvoiceDocument, EInvoiceUser } from '@/integrations/einvoice/types.js';
import { integrationService } from '@/modules/saas/integration.service.js';
import { logger } from '@/utils/logger.js';

interface CreateInvoiceDTO {
  organizationId: string;
  accountId: string;
  type: 'sales' | 'purchase';
  invoiceDate: Date;
  dueDate?: Date;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }[];
  createdBy: string;
  notes?: string;
  eInvoice?: boolean; // E-Fatura olarak gönderilsin mi?
}

export class FinanceService {
  
  /**
   * E-Fatura Mükellef Kontrolü
   */
  async checkEInvoiceUser(organizationId: string, vkn: string, einvoiceProvider: string = 'foriba'): Promise<EInvoiceUser | null> {
    try {
      const provider = await integrationService.getEInvoiceProvider(organizationId, einvoiceProvider);
      return await provider.checkUser(vkn);
    } catch (error) {
      // If integration not found, fallback to mock (for development)
      logger.warn('[FinanceService] E-Invoice integration not found, using mock', error);
      const { ForibaProvider } = await import('@/integrations/einvoice/foriba.js');
      const mockProvider = new ForibaProvider('mock-user', 'mock-pass', { sandbox: true });
      return await mockProvider.checkUser(vkn);
    }
  }

  /**
   * Yeni Fatura Oluştur
   * Otomatik olarak alt toplam, KDV ve genel toplamı hesaplar.
   */
  async createInvoice(data: CreateInvoiceDTO) {
    // Hesaplama yap
    let subtotal = 0;
    let taxTotal = 0;
    
    const itemsWithTotals = data.items.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineTax = lineTotal * (item.taxRate / 100);
      
      subtotal += lineTotal;
      taxTotal += lineTax;
      
      return {
        ...item,
        taxAmount: lineTax.toFixed(2),
        total: (lineTotal + lineTax).toFixed(2)
      };
    });

    const total = subtotal + taxTotal;

    // Transaction başlat (Atomik işlem)
    return await db.transaction(async (tx) => {
      // 1. Fatura başlığını oluştur
      const [newInvoice] = await tx.insert(invoices).values({
        id: uuidv4(),
        organizationId: data.organizationId,
        accountId: data.accountId,
        invoiceNumber: `INV-${Date.now()}`, // Geçici numara, ileride sequence olacak
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        type: data.type,
        status: 'draft',
        subtotal: subtotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        total: total.toFixed(2),
        notes: data.notes,
        createdBy: data.createdBy,
        gibStatus: data.eInvoice ? 'pending' : null, // E-Fatura ise pending
      }).returning();

      if (!newInvoice) {
        throw new Error('Failed to create invoice');
      }

      // 2. Fatura kalemlerini ekle
      if (itemsWithTotals.length > 0) {
        await tx.insert(invoiceItems).values(
          itemsWithTotals.map(item => ({
            id: uuidv4(),
            invoiceId: newInvoice.id,
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            total: item.total,
          }))
        );
      }
      
      // E-Fatura Gönderimi (Eğer istenmişse)
      if (data.eInvoice) {
        // Not: Transaction içinde asenkron işlem yapmak risklidir, normalde queue'ya atılmalı.
        // MVP için direct call yapıyoruz ama hatayı yutuyoruz (fatura oluşsun, gönderim sonra denensin)
        // Gerçek hayatta BullMQ gibi bir kuyruk yapısı kullanılır.
        try {
            await this.sendEInvoice(newInvoice.id);
        } catch (e) {
            console.error("Auto e-invoice send failed", e);
        }
      }

      return newInvoice;
    });
  }

  /**
   * E-Fatura Gönder (GIB Entegrasyonu)
   */
  async sendEInvoice(invoiceId: string, organizationId?: string, einvoiceProvider: string = 'foriba'): Promise<EInvoiceDocument> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) throw new Error('Invoice not found');

    const orgId = organizationId || invoice.organizationId;

    // Get invoice items
    const items = await db.select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    // Get account (customer) data
    const [account] = await db.select()
      .from(accounts)
      .where(eq(accounts.id, invoice.accountId))
      .limit(1);

    // Get organization taxId (accounts don't have taxId, get from organization)
    const [organization] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    // Prepare invoice data for E-Invoice
    const invoiceData = {
      receiver: {
        vkn: organization?.taxId || '1111111111', // Fallback to test VKN
        name: account?.name || 'Test Müşteri',
      },
      payableAmount: parseFloat(invoice.total),
      currency: invoice.currency || 'TRY',
      profileId: 'TICARIFATURA',
      typeCode: invoice.type === 'sales' ? 'SATIS' : 'IADE',
      items: items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: parseFloat(item.taxRate.toString()),
      })),
    };

    try {
      const provider = await integrationService.getEInvoiceProvider(orgId, einvoiceProvider);
      const result = await provider.sendInvoice(invoiceData);

      // DB güncelle
      await db.update(invoices)
          .set({ 
              gibStatus: result.status, 
              invoiceNumber: result.id, // GIB'den gelen resmi numara
              updatedAt: new Date() 
          })
          .where(eq(invoices.id, invoiceId));

      return result;
    } catch (error) {
      // If integration not found, fallback to mock (for development)
      logger.warn('[FinanceService] E-Invoice integration not found, using mock', error);
      const { ForibaProvider } = await import('@/integrations/einvoice/foriba.js');
      const mockProvider = new ForibaProvider('mock-user', 'mock-pass', { sandbox: true });
      const result = await mockProvider.sendInvoice(invoiceData);

      // DB güncelle
      await db.update(invoices)
          .set({ 
              gibStatus: result.status, 
              invoiceNumber: result.id,
              updatedAt: new Date() 
          })
          .where(eq(invoices.id, invoiceId));

      return result;
    }
  }

  /**
   * Faturayı Onayla (Draft -> Sent)
   * Cari hesaba borç/alacak kaydı atar VE Yevmiye Kaydı (Ledger) oluşturur.
   */
  async approveInvoice(invoiceId: string, userId: string) {
    return await db.transaction(async (tx) => {
      // Faturayı bul
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status !== 'draft') throw new Error('Only draft invoices can be approved');

      // Statüyü güncelle
      await tx.update(invoices)
        .set({ status: 'sent', updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));

      // 1. Cari hareket (Transaction) oluştur (Legacy/Simple View)
      const amount = Number(invoice.total);
      const transactionAmount = invoice.type === 'sales' ? amount : -amount;

      await tx.insert(transactions).values({
        id: uuidv4(),
        organizationId: invoice.organizationId,
        accountId: invoice.accountId,
        date: new Date(),
        amount: transactionAmount.toFixed(2),
        description: `Fatura Onayı: ${invoice.invoiceNumber}`,
        category: invoice.type === 'sales' ? 'sales_invoice' : 'purchase_invoice',
        referenceId: invoice.id,
        referenceType: 'invoice',
        createdBy: userId
      });

      // Cari hesap bakiyesini güncelle
      const [account] = await tx.select().from(accounts).where(eq(accounts.id, invoice.accountId));
      if (account) {
        const newBalance = Number(account.balance || 0) + transactionAmount;
        await tx.update(accounts)
          .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
          .where(eq(accounts.id, invoice.accountId));
      }

      // 2. Create General Ledger Entry (Yevmiye Defteri) - Double Entry Bookkeeping
      // Helper: Get or create system account by code
      const getAccount = async (code: string, name: string, type: string = 'revenue') => {
        let [acc] = await tx.select().from(accounts).where(and(
            eq(accounts.organizationId, invoice.organizationId),
            eq(accounts.code, code)
        ));
        if (!acc) {
            [acc] = await tx.insert(accounts).values({
                id: uuidv4(),
                organizationId: invoice.organizationId,
                code,
                name,
                type,
                balance: '0.00'
            }).returning();
        }
        return acc;
      };

      // Create Ledger Header
      const [newLedger] = await tx.insert(ledgers).values({
        id: uuidv4(),
        organizationId: invoice.organizationId,
        journalNumber: `JNL-${Date.now()}`, 
        date: new Date(),
        description: `Satış Faturası: ${invoice.invoiceNumber}`,
        type: 'sales',
        referenceId: invoice.id,
        referenceType: 'invoice',
        status: 'posted'
      }).returning();

      if (!newLedger) {
        throw new Error('Failed to create ledger');
      }

      // Entries Logic
      if (invoice.type === 'sales') {
        // Debit: 120 Alıcılar (Customer)
        await tx.insert(ledgerEntries).values({
            id: uuidv4(),
            ledgerId: newLedger.id,
            accountId: invoice.accountId,
            debit: invoice.total,
            credit: '0.00',
            description: `Fatura Alacağı`
        });

        // Credit: 600 Yurt İçi Satışlar
        const salesAccount = await getAccount('600', 'Yurt İçi Satışlar', 'revenue');
        if (!salesAccount) {
          throw new Error('Sales account not found');
        }
        await tx.insert(ledgerEntries).values({
            id: uuidv4(),
            ledgerId: newLedger.id,
            accountId: salesAccount.id,
            debit: '0.00',
            credit: invoice.subtotal, // KDV hariç
            description: `Mal/Hizmet Bedeli`
        });

        // Credit: 391 Hesaplanan KDV
        const vatAccount = await getAccount('391', 'Hesaplanan KDV', 'liability');
        if (!vatAccount) {
          throw new Error('VAT account not found');
        }
        await tx.insert(ledgerEntries).values({
            id: uuidv4(),
            ledgerId: newLedger.id,
            accountId: vatAccount.id,
            debit: '0.00',
            credit: invoice.taxTotal,
            description: `KDV Tutarı`
        });

      } else if (invoice.type === 'purchase') {
        // Debit: 150/740/770 (Expense/Inventory) - Simplified to 770 Genel Giderler
        const expenseAccount = await getAccount('770', 'Genel Yönetim Giderleri', 'expense');
        if (!expenseAccount) {
          throw new Error('Expense account not found');
        }
        await tx.insert(ledgerEntries).values({
            id: uuidv4(),
            ledgerId: newLedger.id,
            accountId: expenseAccount.id,
            debit: invoice.subtotal,
            credit: '0.00',
            description: `Mal/Hizmet Bedeli`
        });

        // Debit: 191 İndirilecek KDV
        const vatAccount2 = await getAccount('191', 'İndirilecek KDV', 'asset');
        if (!vatAccount2) {
          throw new Error('VAT account (191) not found');
        }
        await tx.insert(ledgerEntries).values({
            id: uuidv4(),
            ledgerId: newLedger.id,
            accountId: vatAccount2.id,
            debit: invoice.taxTotal,
            credit: '0.00',
            description: `KDV Tutarı`
        });

        // Credit: 320 Satıcılar (Vendor)
        await tx.insert(ledgerEntries).values({
            id: uuidv4(),
            ledgerId: newLedger.id,
            accountId: invoice.accountId,
            debit: '0.00',
            credit: invoice.total,
            description: `Fatura Borcu`
        });
      }

      return { success: true, invoiceId, ledgerId: newLedger.id };
    });
  }

  /**
   * Dashboard için Finansal Özet Getir
   */
  async getFinancialSummary(organizationId: string) {
    try {
      // Toplam Ciro (Satış Faturaları)
      const [salesResult] = await db
        .select({ 
          total: sql<string>`coalesce(sum(${invoices.total}), '0')` 
        })
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.type, 'sales'),
          eq(invoices.status, 'paid') // Sadece ödenmişler cirodur
        ));

      // Bekleyen Ödemeler (Tahsil Edilecek)
      const [pendingResult] = await db
        .select({ 
          total: sql<string>`coalesce(sum(${invoices.total}), '0')` 
        })
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.type, 'sales'),
          eq(invoices.status, 'sent') // Gönderilmiş ama ödenmemiş
        ));

      // Son 5 İşlem
      const recentTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.organizationId, organizationId))
        .orderBy(desc(transactions.date))
        .limit(5);

      // Calculate total expenses (purchase invoices)
      const [expensesResult] = await db
        .select({ 
          total: sql<string>`coalesce(sum(${invoices.total}), '0')` 
        })
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.type, 'purchase'),
          eq(invoices.status, 'paid')
        ));

      // Monthly Revenue Trend (Last 6 months)
      const monthlyRevenue = await db.execute(sql`
        SELECT 
          TO_CHAR(invoice_date, 'Mon') as name,
          COALESCE(SUM(total), 0) as total
        FROM invoices
        WHERE 
          organization_id = ${organizationId}
          AND type = 'sales'
          AND status = 'paid'
          AND invoice_date >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(invoice_date, 'Mon'), DATE_TRUNC('month', invoice_date)
        ORDER BY DATE_TRUNC('month', invoice_date) ASC
      `);

      return {
        totalRevenue: parseFloat(salesResult?.total || '0'),
        totalExpenses: parseFloat(expensesResult?.total || '0'),
        pendingPayments: parseFloat(pendingResult?.total || '0'),
        recentTransactions: recentTransactions || [],
        monthlyRevenue: monthlyRevenue.map((row: any) => ({
          name: row.name,
          total: parseFloat(row.total)
        }))
      };
    } catch (error) {
      logger.error('[FinanceService] Error in getFinancialSummary', { error, organizationId });
      // Return empty summary on error (e.g., table doesn't exist yet or query fails)
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        pendingPayments: 0,
        recentTransactions: []
      };
    }
  }

  /**
   * Banka Hareketlerini Senkronize Et
   */
  async syncBankTransactions(organizationId: string, accountId: string, bankProvider: string = 'isbank') {
    // Get banking provider from integration service
    const provider = await integrationService.getBankingProvider(organizationId, bankProvider);
    
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    // Get account number from account record
    const [account] = await db.select()
      .from(accounts)
      .where(and(
        eq(accounts.id, accountId),
        eq(accounts.organizationId, organizationId)
      ))
      .limit(1);

    if (!account) {
      throw new Error('Account not found');
    }

    // Use account code as account number (accounts table doesn't have iban/accountNumber fields)
    const accountNumber = account.code || '1234567890';
    const bankTransactions = await provider.getTransactions(accountNumber, fromDate);
    const results = [];
    
    for (const tx of bankTransactions) {
      const [newTx] = await db.insert(transactions).values({
        id: uuidv4(),
        organizationId,
        accountId, 
        date: tx.date,
        amount: tx.amount.toFixed(2),
        description: `${tx.description} (${tx.externalId})`,
        category: 'bank_sync',
        referenceType: 'bank_transaction',
        referenceId: uuidv4(),
      }).returning();
      
      results.push(newTx);
    }

    return {
      syncedCount: results.length,
      transactions: results
    };
  }
}

export const financeService = new FinanceService();
