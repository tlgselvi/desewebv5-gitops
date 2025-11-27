import { Counter, Gauge } from 'prom-client';
import { db } from '@/db/index.js';
import { users, subscriptions, subscriptionInvoices } from '@/db/schema/index.js';
import { sql, eq } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

// Business Metrics
const activeSubscriptionsGauge = new Gauge({
  name: 'business_active_subscriptions_total',
  help: 'Total number of active subscriptions',
  labelNames: ['plan'],
});

const monthlyRevenueGauge = new Gauge({
  name: 'business_monthly_revenue_total',
  help: 'Total monthly recurring revenue (MRR)',
  labelNames: ['currency'],
});

const newUserSignupsCounter = new Counter({
  name: 'business_user_signups_total',
  help: 'Total number of new user signups',
  labelNames: ['source'],
});

const successfulPaymentsCounter = new Counter({
  name: 'business_payments_successful_total',
  help: 'Total number of successful payments',
  labelNames: ['currency'],
});

const failedPaymentsCounter = new Counter({
  name: 'business_payments_failed_total',
  help: 'Total number of failed payments',
  labelNames: ['currency', 'reason'],
});

export class BusinessMetricsService {
  /**
   * Update all business metrics
   * Should be called periodically (e.g. every minute)
   */
  async updateMetrics(): Promise<void> {
    try {
      await Promise.all([
        this.updateSubscriptionMetrics(),
        this.updateRevenueMetrics(),
      ]);
    } catch (error) {
      logger.error('Failed to update business metrics', { error });
    }
  }

  /**
   * Update subscription counts by plan
   */
  private async updateSubscriptionMetrics(): Promise<void> {
    try {
      // Group active subscriptions by plan
      // Note: This requires a join with plans table, simplified here
      const results = await db
        .select({
          planId: subscriptions.planId,
          count: sql<number>`count(*)`,
        })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active'))
        .groupBy(subscriptions.planId);

      // Reset gauge
      activeSubscriptionsGauge.reset();

      // Update gauge
      for (const row of results) {
        // In real impl, fetch plan name
        activeSubscriptionsGauge.set({ plan: row.planId }, Number(row.count));
      }
    } catch (error) {
      logger.error('Failed to update subscription metrics', { error });
    }
  }

  /**
   * Update revenue metrics (MRR)
   */
  private async updateRevenueMetrics(): Promise<void> {
    try {
      // Calculate MRR from active subscriptions * plan price
      // Simplified: Just sum paid invoices from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const results = await db
        .select({
          currency: subscriptionInvoices.currency,
          total: sql<number>`sum(${subscriptionInvoices.amount})`,
        })
        .from(subscriptionInvoices)
        .where(
          sql`${subscriptionInvoices.status} = 'paid' AND ${subscriptionInvoices.paidDate} >= ${thirtyDaysAgo}`
        )
        .groupBy(subscriptionInvoices.currency);

      monthlyRevenueGauge.reset();

      for (const row of results) {
        monthlyRevenueGauge.set({ currency: row.currency }, Number(row.total));
      }
    } catch (error) {
      logger.error('Failed to update revenue metrics', { error });
    }
  }

  /**
   * Track new user signup
   */
  trackSignup(source: string = 'organic'): void {
    newUserSignupsCounter.inc({ source });
  }

  /**
   * Track payment result
   */
  trackPayment(success: boolean, currency: string, reason?: string): void {
    if (success) {
      successfulPaymentsCounter.inc({ currency });
    } else {
      failedPaymentsCounter.inc({ currency, reason: reason || 'unknown' });
    }
  }
}

export const businessMetricsService = new BusinessMetricsService();
