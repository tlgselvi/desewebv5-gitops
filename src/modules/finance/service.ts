import { db } from '@/db/index.js';
import { invoices, invoiceItems, accounts, transactions } from '@/db/schema/index.js';
import { eq, sql, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { IsBankProvider } from '@/integrations/banking/isbank.js';
import { BankTransaction } from '@/integrations/banking/types.js';
import { ForibaProvider } from '@/integrations/einvoice/foriba.js';
import { EInvoiceDocument, EInvoiceUser } from '@/integrations/einvoice/types.js';

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
  async checkEInvoiceUser(vkn: string): Promise<EInvoiceUser | null> {
    const provider = new ForibaProvider('mock-user', 'mock-pass');
    return await provider.checkUser(vkn);
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
  async sendEInvoice(invoiceId: string) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) throw new Error('Invoice not found');

    // Mock Provider (Gerçekte DB'den settings çekilmeli)
    const provider = new ForibaProvider('mock-user', 'mock-pass');

    // Faturayı UBL formatına dönüştür (Burada çok basit bir mapping yapıyoruz)
    const ublInvoice = {
        invoiceId: invoice.id,
        issueDate: invoice.invoiceDate,
        payableAmount: invoice.total,
        currency: invoice.currency,
        receiver: { vkn: '1111111111' } // Mock VKN - Gerçekte Account'tan çekilmeli
    };

    // Provider'a gönder
    const result = await provider.sendInvoice(ublInvoice);

    // DB güncelle
    await db.update(invoices)
        .set({ 
            gibStatus: result.status, 
            invoiceNumber: result.id, // GIB'den gelen resmi numara
            updatedAt: new Date() 
        })
        .where(eq(invoices.id, invoiceId));

    return result;
  }

  /**
   * Faturayı Onayla (Draft -> Sent)
   * Cari hesaba borç/alacak kaydı atar.
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

      // Cari hareket (Transaction) oluştur
      const amount = Number(invoice.total);
      // Satış faturası ise cariye borç (+), alış faturası ise alacak (-) yazarız (Basit mantık)
      // Enterprise muhasebede: 120 Alıcılar (Borç) - 600 Satışlar (Alacak)
      // Burada tek hesap üzerinden bakiye yönetiyoruz.
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
      // Not: Trigger veya event ile de yapılabilir ama şimdilik manuel update
      const [account] = await tx.select().from(accounts).where(eq(accounts.id, invoice.accountId));
      if (account) {
        const newBalance = Number(account.balance || 0) + transactionAmount;
        await tx.update(accounts)
          .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
          .where(eq(accounts.id, invoice.accountId));
      }

      return { success: true, invoiceId };
    });
  }

  /**
   * Dashboard için Finansal Özet Getir
   */
  async getFinancialSummary(organizationId: string) {
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

    return {
      totalRevenue: parseFloat(salesResult.total),
      pendingPayments: parseFloat(pendingResult.total),
      recentTransactions
    };
  }

  /**
   * Banka Hareketlerini Senkronize Et
   */
  async syncBankTransactions(organizationId: string, accountId: string) {
    const provider = new IsBankProvider('mock-key', 'mock-secret');
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const bankTransactions = await provider.getTransactions('1234567890', fromDate);
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
