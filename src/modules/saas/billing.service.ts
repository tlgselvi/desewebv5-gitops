import { db } from '@/db/index.js';
import { subscriptionInvoices, subscriptions, subscriptionPlans, organizations, paymentMethods } from '@/db/schema/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { subscriptionService } from './subscription.service.js';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'subscription' | 'usage' | 'addon' | 'discount';
}

export interface GenerateInvoiceDTO {
  organizationId: string;
  subscriptionId?: string;
  items: Omit<InvoiceLineItem, 'id' | 'total'>[];
  dueDate?: Date;
  taxRate?: number; // percentage (e.g., 20 for 20%)
  currency?: string;
}

export class BillingService {
  
  /**
   * Generate a new invoice
   */
  async generateInvoice(data: GenerateInvoiceDTO) {
    try {
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, data.organizationId),
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Calculate totals
      let amount = 0;
      const lineItems: InvoiceLineItem[] = data.items.map(item => {
        const total = item.quantity * item.unitPrice;
        amount += total;
        return {
          id: uuidv4(),
          ...item,
          total,
        };
      });

      // Calculate tax
      const taxRate = data.taxRate ?? 20; // Default VAT 20%
      const tax = amount * (taxRate / 100);
      const total = amount + tax;

      // Generate invoice number (Simple format: INV-TIMESTAMP-RANDOM)
      // In production, use a proper sequence or format like INV-2025-00001
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // Determine due date (default 7 days)
      const dueDate = data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Get default payment method
      const defaultPaymentMethod = await db.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.organizationId, data.organizationId),
          eq(paymentMethods.isDefault, true)
        ),
      });

      // Create invoice
      const [invoice] = await db.insert(subscriptionInvoices).values({
        organizationId: data.organizationId,
        subscriptionId: data.subscriptionId,
        invoiceNumber,
        amount: amount.toFixed(2),
        tax: tax.toFixed(2),
        discount: '0.00',
        total: total.toFixed(2),
        currency: data.currency || 'TRY',
        status: 'draft',
        dueDate,
        lineItems: lineItems,
        paymentMethodId: defaultPaymentMethod?.id,
      }).returning();

      logger.info('[BillingService] Invoice generated', {
        invoiceId: invoice.id,
        invoiceNumber,
        organizationId: data.organizationId,
        total: invoice.total,
      });

      return invoice;
    } catch (error) {
      logger.error('[BillingService] Failed to generate invoice', {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  /**
   * Generate invoice for subscription renewal
   */
  async generateSubscriptionInvoice(subscriptionId: string, organizationId: string) {
    try {
      const subscription = await subscriptionService.getSubscriptionById(subscriptionId, organizationId);
      if (!subscription || !subscription.plan) {
        throw new Error('Subscription or plan not found');
      }

      const plan = subscription.plan;
      
      // Create line item for plan
      const items: Omit<InvoiceLineItem, 'id' | 'total'>[] = [{
        description: `Subscription Renewal - ${plan.name} (${plan.billingCycle})`,
        quantity: 1,
        unitPrice: parseFloat(plan.price),
        type: 'subscription',
      }];

      return await this.generateInvoice({
        organizationId,
        subscriptionId,
        items,
        currency: plan.currency,
      });
    } catch (error) {
      logger.error('[BillingService] Failed to generate subscription invoice', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string, organizationId?: string) {
    try {
      const conditions = [eq(subscriptionInvoices.id, invoiceId)];
      if (organizationId) {
        conditions.push(eq(subscriptionInvoices.organizationId, organizationId));
      }

      const invoice = await db.query.subscriptionInvoices.findFirst({
        where: and(...conditions),
        with: {
          organization: true,
          subscription: true,
          paymentMethod: true,
        },
      });

      return invoice || null;
    } catch (error) {
      logger.error('[BillingService] Failed to get invoice', {
        error: error instanceof Error ? error.message : String(error),
        invoiceId,
      });
      throw error;
    }
  }

  /**
   * List invoices for organization
   */
  async listInvoices(organizationId: string) {
    try {
      return await db.query.subscriptionInvoices.findMany({
        where: eq(subscriptionInvoices.organizationId, organizationId),
        orderBy: [desc(subscriptionInvoices.createdAt)],
      });
    } catch (error) {
      logger.error('[BillingService] Failed to list invoices', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string, paymentMethodId?: string) {
    try {
      const [updated] = await db.update(subscriptionInvoices)
        .set({
          status: 'paid',
          paidDate: new Date(),
          paymentMethodId: paymentMethodId || undefined,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionInvoices.id, invoiceId))
        .returning();

      logger.info('[BillingService] Invoice marked as paid', {
        invoiceId,
      });

      return updated;
    } catch (error) {
      logger.error('[BillingService] Failed to mark invoice as paid', {
        error: error instanceof Error ? error.message : String(error),
        invoiceId,
      });
      throw error;
    }
  }

  /**
   * Generate Invoice PDF (Mock)
   */
  async generateInvoicePdf(invoiceId: string): Promise<string> {
    // In a real implementation, this would generate a PDF using pdfkit or puppeteer
    // For now, we return a placeholder URL
    return `https://api.dese.com/v1/invoices/${invoiceId}/download`;
  }
}

export const billingService = new BillingService();

