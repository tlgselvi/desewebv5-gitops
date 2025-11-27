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
   * Optimized: Uses JOIN to fetch all related data in a single query
   */
  async sendEInvoice(invoiceId: string, organizationId?: string, einvoiceProvider: string = 'foriba'): Promise<EInvoiceDocument> {
    // Optimized: Fetch invoice with related data using JOIN
    const [invoiceWithRelations] = await db
      .select({
        invoice: invoices,
        account: accounts,
        organization: organizations,
      })
      .from(invoices)
      .leftJoin(accounts, eq(accounts.id, invoices.accountId))
      .leftJoin(organizations, eq(organizations.id, invoices.organizationId))
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoiceWithRelations?.invoice) throw new Error('Invoice not found');

    const invoice = invoiceWithRelations.invoice;
    const account = invoiceWithRelations.account;
    const organization = invoiceWithRelations.organization;
    const orgId = organizationId || invoice.organizationId;

    // Get invoice items (separate query as it's a one-to-many relationship)
    const items = await db.select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    // Prepare invoice data for E-Invoice
    // Sender: Organization (fatrayı gönderen)
    // Receiver: Account/Customer (fatrayı alan)
    const invoiceData = {
      uuid: invoice.id, // Use invoice ID as UUID for tracking
      id: invoice.invoiceNumber,
      sender: {
        vkn: organization?.taxId || '1111111111', // Organization VKN (sender)
        name: organization?.name || 'Organizasyon',
        city: organization?.city || 'İstanbul',
        district: organization?.district || 'Merkez',
      },
      receiver: {
        vkn: account?.taxId || '1111111111', // Account/Customer VKN/TCKN (receiver)
        name: account?.name || 'Test Müşteri',
        city: account?.city || 'İstanbul',
        district: account?.district || 'Merkez',
      },
      payableAmount: parseFloat(invoice.total),
      currency: invoice.currency || 'TRY',
      profileId: 'TICARIFATURA',
      typeCode: invoice.type === 'sales' ? 'SATIS' : 'IADE',
      note: invoice.notes || '',
      items: items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: parseFloat(item.taxRate.toString()),
        unit: 'NIU', // Unit of measure
      })),
    };

    try {
      const provider = await integrationService.getEInvoiceProvider(orgId, einvoiceProvider);
      const result = await provider.sendInvoice(invoiceData);

      // Update DB with e-invoice result
      await db.update(invoices)
          .set({ 
              gibStatus: result.status, 
              invoiceNumber: result.id || invoice.invoiceNumber, // GIB'den gelen resmi numara
              updatedAt: new Date() 
          })
          .where(eq(invoices.id, invoiceId));

      logger.info('[FinanceService] E-Invoice sent successfully', {
        invoiceId,
        uuid: result.uuid,
        status: result.status,
        invoiceNumber: result.id,
      });

      return result;
    } catch (error) {
      logger.error('[FinanceService] Failed to send e-invoice', {
        error,
        invoiceId,
        organizationId: orgId,
      });
      
      // Update status to failed
      await db.update(invoices)
          .set({ 
              gibStatus: 'failed',
              updatedAt: new Date() 
          })
          .where(eq(invoices.id, invoiceId));

      throw error;
    }
  }

  /**
   * E-Fatura Durum Kontrolü
   * Belirli bir e-faturanın GIB'deki durumunu kontrol eder
   */
  async checkEInvoiceStatus(invoiceId: string, organizationId?: string, einvoiceProvider: string = 'foriba'): Promise<string> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.gibStatus) throw new Error('Invoice has not been sent to GIB yet');

    const orgId = organizationId || invoice.organizationId;

    try {
      const provider = await integrationService.getEInvoiceProvider(orgId, einvoiceProvider);
      
      // Get UUID from invoice (if stored separately, otherwise use invoice ID)
      // In real implementation, we might store GIB UUID separately
      const uuid = invoice.id; // Simplified: using invoice ID as UUID
      
      const status = await provider.getInvoiceStatus(uuid);

      // Update DB with latest status
      if (status !== invoice.gibStatus) {
        await db.update(invoices)
          .set({ 
            gibStatus: status,
            updatedAt: new Date() 
          })
          .where(eq(invoices.id, invoiceId));
      }

      return status;
    } catch (error) {
      logger.error('[FinanceService] Failed to check e-invoice status', {
        error,
        invoiceId,
        organizationId: orgId,
      });
      throw error;
    }
  }

  /**
   * E-Fatura Geçmişi Sorgulama
   * Organizasyona ait e-fatura gönderim geçmişini getirir
   */
  async getEInvoiceHistory(
    organizationId: string,
    filters?: {
      fromDate?: Date;
      toDate?: Date;
      status?: string;
      type?: 'sales' | 'purchase';
    }
  ) {
    const queryConditions = [eq(invoices.organizationId, organizationId)];
    
    // Filter by GIB status (only invoices that have been sent)
    queryConditions.push(sql`${invoices.gibStatus} IS NOT NULL`);

    if (filters?.fromDate) {
      queryConditions.push(sql`${invoices.invoiceDate} >= ${filters.fromDate}`);
    }

    if (filters?.toDate) {
      queryConditions.push(sql`${invoices.invoiceDate} <= ${filters.toDate}`);
    }

    if (filters?.status) {
      queryConditions.push(eq(invoices.gibStatus, filters.status));
    }

    if (filters?.type) {
      queryConditions.push(eq(invoices.type, filters.type));
    }

    const einvoices = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      type: invoices.type,
      total: invoices.total,
      currency: invoices.currency,
      gibStatus: invoices.gibStatus,
      status: invoices.status,
      accountId: invoices.accountId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    })
      .from(invoices)
      .where(and(...queryConditions))
      .orderBy(desc(invoices.invoiceDate))
      .limit(100); // Limit to prevent large queries

    return einvoices;
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
   * Optimized: Uses conditional aggregation to fetch all totals in a single query
   */
  async getFinancialSummary(organizationId: string) {
    try {
      // Optimized: Fetch all invoice totals in a single query using conditional aggregation
      const [summaryResult] = await db
        .select({
          totalRevenue: sql<string>`coalesce(sum(case when ${invoices.type} = 'sales' and ${invoices.status} = 'paid' then ${invoices.total} else 0 end), '0')`,
          pendingPayments: sql<string>`coalesce(sum(case when ${invoices.type} = 'sales' and ${invoices.status} = 'sent' then ${invoices.total} else 0 end), '0')`,
          totalExpenses: sql<string>`coalesce(sum(case when ${invoices.type} = 'purchase' and ${invoices.status} = 'paid' then ${invoices.total} else 0 end), '0')`,
        })
        .from(invoices)
        .where(eq(invoices.organizationId, organizationId));

      // Son 5 İşlem
      const recentTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.organizationId, organizationId))
        .orderBy(desc(transactions.date))
        .limit(5);

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
        totalRevenue: parseFloat(summaryResult?.totalRevenue || '0'),
        totalExpenses: parseFloat(summaryResult?.totalExpenses || '0'),
        pendingPayments: parseFloat(summaryResult?.pendingPayments || '0'),
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
   * İşlem eşleştirme algoritması ile mevcut işlemleri tekrar eklemez
   * Optimized: Uses batch operations to avoid N+1 queries
   */
  async syncBankTransactions(organizationId: string, accountId: string, userId: string, bankProvider: string = 'isbank') {
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
    
    // Get existing transactions for matching
    const existingTransactions = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.accountId, accountId),
        eq(transactions.referenceType, 'bank_transaction'),
        sql`${transactions.date} >= ${fromDate}`
      ));

    // Create a map of existing transactions by external ID and amount+date
    const existingTxMap = new Map<string, boolean>();
    existingTransactions.forEach(tx => {
      // Extract external ID from description (format: "Description (EXTERNAL_ID)")
      const match = tx.description.match(/\(([^)]+)\)$/);
      if (match) {
        existingTxMap.set(match[1], true);
      } else {
        // Fallback: match by amount and date (within 1 day tolerance)
        const key = `${tx.amount}_${tx.date.toISOString().split('T')[0]}`;
        existingTxMap.set(key, true);
      }
    });

    // Optimized: Batch match all transactions to invoices in a single query
    const newTransactionsToProcess = bankTransactions.filter(tx => {
      const isExisting = existingTxMap.has(tx.externalId) || 
                        existingTxMap.has(`${tx.amount.toFixed(2)}_${tx.date.toISOString().split('T')[0]}`);
      return !isExisting;
    });

    // Batch match transactions to invoices (optimized to avoid N+1)
    const matchedInvoices = await this.batchMatchTransactionsToInvoices(
      organizationId,
      newTransactionsToProcess
    );

    // Prepare all new transactions for batch insert
    const transactionsToInsert = newTransactionsToProcess.map(tx => {
      const matchedInvoice = matchedInvoices.get(tx.externalId);
      return {
        id: uuidv4(),
        organizationId,
        accountId, 
        date: tx.date,
        amount: tx.amount.toFixed(2),
        description: `${tx.description} (${tx.externalId})`,
        category: matchedInvoice ? 'invoice_payment' : 'bank_sync',
        referenceType: matchedInvoice ? 'invoice' : 'bank_transaction',
        referenceId: matchedInvoice || uuidv4(),
        createdBy: userId || uuidv4(), // Add createdBy field
      };
    });

    // Batch insert all new transactions
    const results = transactionsToInsert.length > 0
      ? await db.insert(transactions).values(transactionsToInsert).returning()
      : [];

    const matched = bankTransactions.filter(tx => {
      const isExisting = existingTxMap.has(tx.externalId) || 
                        existingTxMap.has(`${tx.amount.toFixed(2)}_${tx.date.toISOString().split('T')[0]}`);
      return isExisting;
    });

    logger.info('[FinanceService] Bank transactions synced', {
      organizationId,
      accountId,
      total: bankTransactions.length,
      new: results.length,
      matched: matched.length,
      skipped: bankTransactions.length - results.length - matched.length,
    });

    return {
      syncedCount: results.length,
      matchedCount: matched.length,
      transactions: results
    };
  }

  /**
   * Batch match bank transactions to invoices (optimized to avoid N+1)
   * Matches multiple transactions in a single query
   */
  private async batchMatchTransactionsToInvoices(
    organizationId: string,
    bankTransactions: BankTransaction[]
  ): Promise<Map<string, string>> {
    if (bankTransactions.length === 0) {
      return new Map();
    }

    try {
      const amountTolerance = 0.01;
      const dateTolerance = 7 * 24 * 60 * 60 * 1000; // 7 days

      // Get all potential matching invoices in a single query
      const minDate = new Date(Math.min(...bankTransactions.map(tx => tx.date.getTime())) - dateTolerance);
      const maxDate = new Date(Math.max(...bankTransactions.map(tx => tx.date.getTime())) + dateTolerance);
      const minAmount = Math.min(...bankTransactions.map(tx => tx.amount)) - amountTolerance;
      const maxAmount = Math.max(...bankTransactions.map(tx => tx.amount)) + amountTolerance;

      // Fetch all potential matching invoices
      const potentialInvoices = await db.select()
        .from(invoices)
        .where(and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.status, 'sent'),
          sql`${invoices.total}::numeric >= ${minAmount}`,
          sql`${invoices.total}::numeric <= ${maxAmount}`,
          sql`${invoices.invoiceDate} >= ${minDate}`,
          sql`${invoices.invoiceDate} <= ${maxDate}`
        ));

      // Match transactions to invoices in memory
      const matches = new Map<string, string>();
      const invoicesToUpdate: string[] = [];

      for (const tx of bankTransactions) {
        const matchDateFrom = new Date(tx.date.getTime() - dateTolerance);
        const matchDateTo = new Date(tx.date.getTime() + dateTolerance);
        const amountMin = tx.amount - amountTolerance;
        const amountMax = tx.amount + amountTolerance;

        const matchingInvoice = potentialInvoices.find(inv => {
          const invAmount = parseFloat(inv.total);
          const invDate = inv.invoiceDate;
          return (
            invAmount >= amountMin &&
            invAmount <= amountMax &&
            invDate >= matchDateFrom &&
            invDate <= matchDateTo
          );
        });

        if (matchingInvoice) {
          matches.set(tx.externalId, matchingInvoice.id);
          if (!invoicesToUpdate.includes(matchingInvoice.id)) {
            invoicesToUpdate.push(matchingInvoice.id);
          }
        }
      }

      // Batch update matched invoices to paid status
      if (invoicesToUpdate.length > 0) {
        await db.update(invoices)
          .set({
            status: 'paid',
            updatedAt: new Date(),
          })
          .where(sql`${invoices.id} = ANY(${invoicesToUpdate})`);

        logger.info('[FinanceService] Batch matched bank transactions to invoices', {
          matchedCount: matches.size,
          invoiceIds: invoicesToUpdate,
        });
      }

      return matches;
    } catch (error) {
      logger.warn('[FinanceService] Failed to batch match transactions to invoices', {
        error,
        transactionCount: bankTransactions.length,
      });
      return new Map();
    }
  }

  /**
   * Match bank transaction to invoice (legacy method, kept for backward compatibility)
   * @deprecated Use batchMatchTransactionsToInvoices for better performance
   */
  private async matchTransactionToInvoice(
    organizationId: string,
    bankTx: BankTransaction
  ): Promise<string | null> {
    const matches = await this.batchMatchTransactionsToInvoices(organizationId, [bankTx]);
    return matches.get(bankTx.externalId) || null;
  }
}

export const financeService = new FinanceService();
