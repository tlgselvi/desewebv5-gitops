import { db } from '@/db/index.js';
import { paymentMethods, subscriptionInvoices } from '@/db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';
import { billingService } from './billing.service.js';

/**
 * Payment Provider Interface
 */
interface PaymentProvider {
  createPaymentMethod(token: string): Promise<{ id: string; last4: string; brand: string; expiryMonth: number; expiryYear: number }>;
  charge(amount: number, currency: string, paymentMethodId: string, description: string): Promise<{ id: string; status: string }>;
}

/**
 * Mock Payment Provider (Stripe Simulator)
 */
class MockStripeProvider implements PaymentProvider {
  async createPaymentMethod(token: string) {
    // Simulate Stripe payment method creation
    return {
      id: `pm_${Math.random().toString(36).substring(7)}`,
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2030,
    };
  }

  async charge(amount: number, currency: string, paymentMethodId: string, description: string) {
    // Simulate Stripe charge
    return {
      id: `ch_${Math.random().toString(36).substring(7)}`,
      status: 'succeeded',
    };
  }
}

export class PaymentService {
  private provider: PaymentProvider;

  constructor() {
    this.provider = new MockStripeProvider();
  }

  /**
   * Add a payment method
   */
  async addPaymentMethod(organizationId: string, token: string, isDefault: boolean = false) {
    try {
      const pmDetails = await this.provider.createPaymentMethod(token);

      // If this is the first payment method, make it default
      const count = await db.query.paymentMethods.findMany({
        where: eq(paymentMethods.organizationId, organizationId),
      });
      
      const shouldBeDefault = isDefault || count.length === 0;

      if (shouldBeDefault) {
        // Unset other defaults
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.organizationId, organizationId));
      }

      const [paymentMethod] = await db.insert(paymentMethods).values({
        organizationId,
        type: 'card',
        provider: 'stripe',
        last4: pmDetails.last4,
        brand: pmDetails.brand,
        expiryMonth: pmDetails.expiryMonth,
        expiryYear: pmDetails.expiryYear,
        stripePaymentMethodId: pmDetails.id,
        isDefault: shouldBeDefault,
      }).returning();

      logger.info('[PaymentService] Payment method added', {
        organizationId,
        paymentMethodId: paymentMethod.id,
      });

      return paymentMethod;
    } catch (error) {
      logger.error('[PaymentService] Failed to add payment method', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * List payment methods
   */
  async listPaymentMethods(organizationId: string) {
    try {
      return await db.query.paymentMethods.findMany({
        where: and(
          eq(paymentMethods.organizationId, organizationId),
          eq(paymentMethods.isActive, true)
        ),
        orderBy: [desc(paymentMethods.isDefault), desc(paymentMethods.createdAt)],
      });
    } catch (error) {
      logger.error('[PaymentService] Failed to list payment methods', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Process payment for an invoice
   */
  async processInvoicePayment(invoiceId: string, organizationId: string) {
    try {
      const invoice = await billingService.getInvoiceById(invoiceId, organizationId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'paid') {
        throw new Error('Invoice is already paid');
      }

      // Get payment method
      let paymentMethodId = invoice.paymentMethodId;
      
      if (!paymentMethodId) {
        const defaultPm = await db.query.paymentMethods.findFirst({
          where: and(
            eq(paymentMethods.organizationId, organizationId),
            eq(paymentMethods.isDefault, true)
          ),
        });
        
        if (!defaultPm) {
          throw new Error('No payment method available');
        }
        paymentMethodId = defaultPm.id;
      }

      // Process charge
      const amount = parseFloat(invoice.total);
      if (amount <= 0) {
        // Free or zero amount invoice, just mark as paid
        return await billingService.markAsPaid(invoiceId, paymentMethodId);
      }

      const pm = await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.id, paymentMethodId),
      });

      if (!pm || !pm.stripePaymentMethodId) {
        throw new Error('Invalid payment method');
      }

      // Charge via provider
      const charge = await this.provider.charge(
        amount,
        invoice.currency,
        pm.stripePaymentMethodId,
        `Invoice ${invoice.invoiceNumber}`
      );

      if (charge.status === 'succeeded') {
        const paidInvoice = await billingService.markAsPaid(invoiceId, paymentMethodId);
        logger.info('[PaymentService] Payment successful', {
          invoiceId,
          amount,
          chargeId: charge.id,
        });
        return paidInvoice;
      } else {
        throw new Error(`Payment failed with status: ${charge.status}`);
      }

    } catch (error) {
      logger.error('[PaymentService] Payment processing failed', {
        error: error instanceof Error ? error.message : String(error),
        invoiceId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(paymentMethodId: string, organizationId: string) {
    try {
      const pm = await db.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.id, paymentMethodId),
          eq(paymentMethods.organizationId, organizationId)
        ),
      });

      if (!pm) {
        throw new Error('Payment method not found');
      }

      if (pm.isDefault) {
        throw new Error('Cannot remove default payment method. Set another default first.');
      }

      // Soft delete
      const [removed] = await db.update(paymentMethods)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(paymentMethods.id, paymentMethodId))
        .returning();

      return removed;
    } catch (error) {
      logger.error('[PaymentService] Failed to remove payment method', {
        error: error instanceof Error ? error.message : String(error),
        paymentMethodId,
      });
      throw error;
    }
  }
}

export const paymentService = new PaymentService();

