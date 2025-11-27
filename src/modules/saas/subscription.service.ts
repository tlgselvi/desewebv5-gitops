import { db } from '@/db/index.js';
import { 
  subscriptions, 
  subscriptionPlans, 
  organizations 
} from '@/db/schema/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

/**
 * Subscription Status Types
 */
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid';

/**
 * Create Subscription DTO
 */
export interface CreateSubscriptionDTO {
  organizationId: string;
  planId: string;
  paymentMethodId?: string;
  startDate?: Date;
  trialDays?: number;
}

/**
 * Update Subscription DTO
 */
export interface UpdateSubscriptionDTO {
  planId?: string;
  status?: SubscriptionStatus;
  paymentMethodId?: string;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Subscription Service
 * Handles subscription lifecycle management
 */
export class SubscriptionService {
  
  /**
   * Create a new subscription for an organization
   */
  async createSubscription(data: CreateSubscriptionDTO) {
    try {
      // Get plan details
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, data.planId),
      });

      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      if (!plan.isActive) {
        throw new Error('Subscription plan is not active');
      }

      // Check if organization already has an active subscription
      const existingSubscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.organizationId, data.organizationId),
          sql`${subscriptions.status} IN ('trial', 'active', 'past_due')`
        ),
      });

      if (existingSubscription) {
        throw new Error('Organization already has an active subscription');
      }

      // Calculate period dates
      const now = data.startDate || new Date();
      const trialDays = data.trialDays ?? plan.trialDays ?? 0;
      
      let currentPeriodStart: Date;
      let currentPeriodEnd: Date;
      let trialStart: Date | null = null;
      let trialEnd: Date | null = null;
      let status: SubscriptionStatus = 'active';

      if (trialDays > 0) {
        // Trial period
        trialStart = now;
        trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + trialDays);
        
        currentPeriodStart = now;
        currentPeriodEnd = new Date(now);
        
        // Set period end based on billing cycle
        if (plan.billingCycle === 'yearly') {
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
        } else {
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        }
        
        status = 'trial';
      } else {
        // No trial, start immediately
        currentPeriodStart = now;
        currentPeriodEnd = new Date(now);
        
        if (plan.billingCycle === 'yearly') {
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
        } else {
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        }
      }

      // Create subscription
      const [newSubscription] = await db.insert(subscriptions).values({
        organizationId: data.organizationId,
        planId: data.planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart,
        trialEnd,
        paymentMethodId: data.paymentMethodId,
        cancelAtPeriodEnd: false,
      }).returning();

      logger.info('[SubscriptionService] Subscription created', {
        subscriptionId: newSubscription.id,
        organizationId: data.organizationId,
        planId: data.planId,
        status,
      });

      return newSubscription;
    } catch (error) {
      logger.error('[SubscriptionService] Failed to create subscription', {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(subscriptionId: string, organizationId?: string) {
    try {
      const conditions = [eq(subscriptions.id, subscriptionId)];
      
      if (organizationId) {
        conditions.push(eq(subscriptions.organizationId, organizationId));
      }

      const subscription = await db.query.subscriptions.findFirst({
        where: and(...conditions),
        with: {
          plan: true,
          organization: true,
          paymentMethod: true,
        },
      });

      return subscription || null;
    } catch (error) {
      logger.error('[SubscriptionService] Failed to get subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Get active subscription for an organization
   */
  async getActiveSubscription(organizationId: string) {
    try {
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.organizationId, organizationId),
          sql`${subscriptions.status} IN ('trial', 'active', 'past_due')`
        ),
        with: {
          plan: true,
          paymentMethod: true,
        },
        orderBy: [desc(subscriptions.createdAt)],
      });

      return subscription || null;
    } catch (error) {
      logger.error('[SubscriptionService] Failed to get active subscription', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * List all subscriptions for an organization
   */
  async listSubscriptions(organizationId: string) {
    try {
      const subscriptionList = await db.query.subscriptions.findMany({
        where: eq(subscriptions.organizationId, organizationId),
        with: {
          plan: true,
          paymentMethod: true,
        },
        orderBy: [desc(subscriptions.createdAt)],
      });

      return subscriptionList;
    } catch (error) {
      logger.error('[SubscriptionService] Failed to list subscriptions', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    organizationId: string,
    data: UpdateSubscriptionDTO
  ) {
    try {
      // Verify subscription belongs to organization
      const existing = await this.getSubscriptionById(subscriptionId, organizationId);
      if (!existing) {
        throw new Error('Subscription not found');
      }

      const updateData: Partial<typeof subscriptions.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (data.planId) {
        updateData.planId = data.planId;
      }

      if (data.status) {
        updateData.status = data.status;
      }

      if (data.paymentMethodId !== undefined) {
        updateData.paymentMethodId = data.paymentMethodId;
      }

      if (data.cancelAtPeriodEnd !== undefined) {
        updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
      }

      const [updated] = await db
        .update(subscriptions)
        .set(updateData)
        .where(
          and(
            eq(subscriptions.id, subscriptionId),
            eq(subscriptions.organizationId, organizationId)
          )
        )
        .returning();

      logger.info('[SubscriptionService] Subscription updated', {
        subscriptionId,
        organizationId,
        updates: data,
      });

      return updated;
    } catch (error) {
      logger.error('[SubscriptionService] Failed to update subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        organizationId,
        data,
      });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    organizationId: string,
    cancelImmediately: boolean = false
  ) {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId, organizationId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'canceled') {
        throw new Error('Subscription is already canceled');
      }

      if (cancelImmediately) {
        // Cancel immediately
        const [canceled] = await db
          .update(subscriptions)
          .set({
            status: 'canceled',
            canceledAt: new Date(),
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(subscriptions.id, subscriptionId),
              eq(subscriptions.organizationId, organizationId)
            )
          )
          .returning();

        logger.info('[SubscriptionService] Subscription canceled immediately', {
          subscriptionId,
          organizationId,
        });

        return canceled;
      } else {
        // Cancel at period end
        const [updated] = await db
          .update(subscriptions)
          .set({
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(subscriptions.id, subscriptionId),
              eq(subscriptions.organizationId, organizationId)
            )
          )
          .returning();

        logger.info('[SubscriptionService] Subscription scheduled for cancellation', {
          subscriptionId,
          organizationId,
          cancelAt: updated.currentPeriodEnd,
        });

        return updated;
      }
    } catch (error) {
      logger.error('[SubscriptionService] Failed to cancel subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(subscriptionId: string, organizationId: string) {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId, organizationId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'canceled' && !subscription.cancelAtPeriodEnd) {
        throw new Error('Subscription is not canceled');
      }

      const [resumed] = await db
        .update(subscriptions)
        .set({
          status: 'active',
          cancelAtPeriodEnd: false,
          canceledAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.id, subscriptionId),
            eq(subscriptions.organizationId, organizationId)
          )
        )
        .returning();

      logger.info('[SubscriptionService] Subscription resumed', {
        subscriptionId,
        organizationId,
      });

      return resumed;
    } catch (error) {
      logger.error('[SubscriptionService] Failed to resume subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Renew subscription (extend current period)
   */
  async renewSubscription(subscriptionId: string, organizationId: string) {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId, organizationId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'canceled') {
        throw new Error('Cannot renew canceled subscription');
      }

      // Get plan to determine billing cycle
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, subscription.planId),
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Calculate new period
      const newPeriodStart = subscription.currentPeriodEnd;
      const newPeriodEnd = new Date(newPeriodStart);
      
      if (plan.billingCycle === 'yearly') {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      // Update subscription
      const [renewed] = await db
        .update(subscriptions)
        .set({
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          status: 'active', // Ensure status is active after renewal
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptions.id, subscriptionId),
            eq(subscriptions.organizationId, organizationId)
          )
        )
        .returning();

      logger.info('[SubscriptionService] Subscription renewed', {
        subscriptionId,
        organizationId,
        newPeriodStart,
        newPeriodEnd,
      });

      return renewed;
    } catch (error) {
      logger.error('[SubscriptionService] Failed to renew subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Upgrade/Downgrade subscription to a new plan
   */
  async changePlan(
    subscriptionId: string,
    organizationId: string,
    newPlanId: string,
    immediate: boolean = false
  ) {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId, organizationId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const newPlan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, newPlanId),
      });

      if (!newPlan || !newPlan.isActive) {
        throw new Error('New plan not found or not active');
      }

      if (immediate) {
        // Change plan immediately
        const [updated] = await db
          .update(subscriptions)
          .set({
            planId: newPlanId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(subscriptions.id, subscriptionId),
              eq(subscriptions.organizationId, organizationId)
            )
          )
          .returning();

        logger.info('[SubscriptionService] Plan changed immediately', {
          subscriptionId,
          organizationId,
          oldPlanId: subscription.planId,
          newPlanId,
        });

        return updated;
      } else {
        // Schedule plan change at period end
        // For now, we'll change immediately but could implement scheduling logic
        return await this.changePlan(subscriptionId, organizationId, newPlanId, true);
      }
    } catch (error) {
      logger.error('[SubscriptionService] Failed to change plan', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        organizationId,
        newPlanId,
      });
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();

