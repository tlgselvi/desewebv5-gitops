import { db } from '@/db/index.js';
import { subscriptionPlans } from '@/db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';

/**
 * Create Plan DTO
 */
export interface CreatePlanDTO {
  name: string;
  slug: string;
  description?: string;
  price: string; // Decimal as string
  currency?: string;
  billingCycle: 'monthly' | 'yearly';
  trialDays?: number;
  features: {
    maxUsers: number;
    maxStorage: number;
    maxApiCalls: number;
    maxDevices: number;
    maxSms: number;
    maxEmails: number;
    modules: string[];
    advancedFeatures: string[];
  };
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
}

/**
 * Update Plan DTO
 */
export interface UpdatePlanDTO {
  name?: string;
  description?: string;
  price?: string;
  currency?: string;
  billingCycle?: 'monthly' | 'yearly';
  trialDays?: number;
  features?: {
    maxUsers?: number;
    maxStorage?: number;
    maxApiCalls?: number;
    maxDevices?: number;
    maxSms?: number;
    maxEmails?: number;
    modules?: string[];
    advancedFeatures?: string[];
  };
  isActive?: boolean;
  isPublic?: boolean;
  sortOrder?: number;
}

/**
 * Plan Service
 * Handles subscription plan management
 */
export class PlanService {
  
  /**
   * Create a new subscription plan
   */
  async createPlan(data: CreatePlanDTO) {
    try {
      // Check if slug already exists
      const existing = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.slug, data.slug),
      });

      if (existing) {
        throw new Error('Plan with this slug already exists');
      }

      const [newPlan] = await db.insert(subscriptionPlans).values({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price: data.price,
        currency: data.currency || 'TRY',
        billingCycle: data.billingCycle,
        trialDays: data.trialDays ?? 14,
        features: data.features,
        isActive: data.isActive ?? true,
        isPublic: data.isPublic ?? true,
        sortOrder: data.sortOrder ?? 0,
      }).returning();

      logger.info('[PlanService] Plan created', {
        planId: newPlan.id,
        slug: data.slug,
      });

      return newPlan;
    } catch (error) {
      logger.error('[PlanService] Failed to create plan', {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    }
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string) {
    try {
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId),
      });

      return plan || null;
    } catch (error) {
      logger.error('[PlanService] Failed to get plan', {
        error: error instanceof Error ? error.message : String(error),
        planId,
      });
      throw error;
    }
  }

  /**
   * Get plan by slug
   */
  async getPlanBySlug(slug: string) {
    try {
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.slug, slug),
      });

      return plan || null;
    } catch (error) {
      logger.error('[PlanService] Failed to get plan by slug', {
        error: error instanceof Error ? error.message : String(error),
        slug,
      });
      throw error;
    }
  }

  /**
   * List all plans (optionally filter by active/public)
   */
  async listPlans(options?: {
    activeOnly?: boolean;
    publicOnly?: boolean;
  }) {
    try {
      const conditions = [];

      if (options?.activeOnly) {
        conditions.push(eq(subscriptionPlans.isActive, true));
      }

      if (options?.publicOnly) {
        conditions.push(eq(subscriptionPlans.isPublic, true));
      }

      const plans = await db.query.subscriptionPlans.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [
          subscriptionPlans.sortOrder,
          subscriptionPlans.name,
        ],
      });

      return plans;
    } catch (error) {
      logger.error('[PlanService] Failed to list plans', {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  /**
   * Update plan
   */
  async updatePlan(planId: string, data: UpdatePlanDTO) {
    try {
      const existing = await this.getPlanById(planId);
      if (!existing) {
        throw new Error('Plan not found');
      }

      const updateData: Partial<typeof subscriptionPlans.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (data.name) {
        updateData.name = data.name;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.price) {
        updateData.price = data.price;
      }

      if (data.currency) {
        updateData.currency = data.currency;
      }

      if (data.billingCycle) {
        updateData.billingCycle = data.billingCycle;
      }

      if (data.trialDays !== undefined) {
        updateData.trialDays = data.trialDays;
      }

      if (data.features) {
        // Merge with existing features
        updateData.features = {
          ...existing.features,
          ...data.features,
        } as typeof existing.features;
      }

      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      if (data.isPublic !== undefined) {
        updateData.isPublic = data.isPublic;
      }

      if (data.sortOrder !== undefined) {
        updateData.sortOrder = data.sortOrder;
      }

      const [updated] = await db
        .update(subscriptionPlans)
        .set(updateData)
        .where(eq(subscriptionPlans.id, planId))
        .returning();

      logger.info('[PlanService] Plan updated', {
        planId,
        updates: data,
      });

      return updated;
    } catch (error) {
      logger.error('[PlanService] Failed to update plan', {
        error: error instanceof Error ? error.message : String(error),
        planId,
        data,
      });
      throw error;
    }
  }

  /**
   * Delete plan (soft delete by setting isActive to false)
   */
  async deletePlan(planId: string) {
    try {
      const existing = await this.getPlanById(planId);
      if (!existing) {
        throw new Error('Plan not found');
      }

      // Check if plan has active subscriptions
      // Note: This would require a join query, for now we'll just deactivate
      const [deactivated] = await db
        .update(subscriptionPlans)
        .set({
          isActive: false,
          isPublic: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.id, planId))
        .returning();

      logger.info('[PlanService] Plan deactivated', {
        planId,
      });

      return deactivated;
    } catch (error) {
      logger.error('[PlanService] Failed to delete plan', {
        error: error instanceof Error ? error.message : String(error),
        planId,
      });
      throw error;
    }
  }
}

export const planService = new PlanService();

