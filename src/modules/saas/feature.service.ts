import { db } from '@/db/index.js';
import { subscriptions, subscriptionPlans, usageMetrics } from '@/db/schema/index.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';
import { subscriptionService } from './subscription.service.js';

/**
 * Feature Types
 */
export type FeatureType = 
  | 'users'
  | 'storage'
  | 'api_calls'
  | 'devices'
  | 'sms'
  | 'emails'
  | 'modules'
  | 'advanced_features';

/**
 * Feature Access Result
 */
export interface FeatureAccessResult {
  hasAccess: boolean;
  limit?: number;
  current?: number;
  remaining?: number;
  message?: string;
}

/**
 * Feature Service
 * Handles feature access control and limit enforcement
 */
export class FeatureService {
  
  /**
   * Get active subscription for organization
   */
  private async getActiveSubscriptionWithPlan(organizationId: string) {
    const subscription = await subscriptionService.getActiveSubscription(organizationId);
    
    if (!subscription) {
      return null;
    }

    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, subscription.planId),
    });

    if (!plan) {
      return null;
    }

    return { subscription, plan };
  }

  /**
   * Check if organization has access to a feature
   */
  async checkFeatureAccess(
    organizationId: string,
    featureType: FeatureType,
    featureName?: string
  ): Promise<FeatureAccessResult> {
    try {
      const subWithPlan = await this.getActiveSubscriptionWithPlan(organizationId);
      
      if (!subWithPlan) {
        return {
          hasAccess: false,
          message: 'No active subscription found',
        };
      }

      const { plan } = subWithPlan;

      // Check module access
      if (featureType === 'modules' && featureName) {
        const hasModule = plan.features.modules.includes(featureName);
        return {
          hasAccess: hasModule,
          message: hasModule 
            ? `Module '${featureName}' is available` 
            : `Module '${featureName}' is not included in your plan`,
        };
      }

      // Check advanced features
      if (featureType === 'advanced_features' && featureName) {
        const hasFeature = plan.features.advancedFeatures.includes(featureName);
        return {
          hasAccess: hasFeature,
          message: hasFeature 
            ? `Advanced feature '${featureName}' is available` 
            : `Advanced feature '${featureName}' is not included in your plan`,
        };
      }

      // For limit-based features, check current usage
      const limit = this.getFeatureLimit(plan.features, featureType);
      
      if (limit === undefined || limit === null) {
        return {
          hasAccess: true,
          message: 'Feature has no limit',
        };
      }

      // Get current usage
      const current = await this.getCurrentUsage(organizationId, featureType);

      return {
        hasAccess: current < limit,
        limit,
        current,
        remaining: Math.max(0, limit - current),
        message: current < limit 
          ? `Usage: ${current}/${limit}` 
          : `Limit reached: ${current}/${limit}`,
      };
    } catch (error) {
      logger.error('[FeatureService] Failed to check feature access', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        featureType,
        featureName,
      });
      throw error;
    }
  }

  /**
   * Get feature limit from plan features
   */
  private getFeatureLimit(
    features: typeof subscriptionPlans.$inferSelect.features,
    featureType: FeatureType
  ): number | null {
    switch (featureType) {
      case 'users':
        return features.maxUsers;
      case 'storage':
        return features.maxStorage;
      case 'api_calls':
        return features.maxApiCalls;
      case 'devices':
        return features.maxDevices;
      case 'sms':
        return features.maxSms;
      case 'emails':
        return features.maxEmails;
      case 'modules':
      case 'advanced_features':
        return null; // Boolean features, not limit-based
      default:
        return null;
    }
  }

  /**
   * Get current usage for a feature
   */
  async getCurrentUsage(
    organizationId: string,
    featureType: FeatureType,
    period: 'daily' | 'monthly' = 'monthly'
  ): Promise<number> {
    try {
      const subscription = await subscriptionService.getActiveSubscription(organizationId);
      
      if (!subscription) {
        return 0;
      }

      // Map feature type to metric type
      const metricType = this.mapFeatureTypeToMetricType(featureType);
      
      if (!metricType) {
        return 0;
      }

      // Get current period
      const periodStart = subscription.currentPeriodStart;
      const periodEnd = subscription.currentPeriodEnd;

      // Query usage metrics
      const [usage] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${usageMetrics.value}), 0)`,
        })
        .from(usageMetrics)
        .where(
          and(
            eq(usageMetrics.organizationId, organizationId),
            eq(usageMetrics.metricType, metricType),
            eq(usageMetrics.period, period),
            gte(usageMetrics.periodStart, periodStart),
            lte(usageMetrics.periodEnd, periodEnd)
          )
        );

      return Number(usage?.total || 0);
    } catch (error) {
      logger.error('[FeatureService] Failed to get current usage', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        featureType,
      });
      return 0;
    }
  }

  /**
   * Map feature type to metric type
   */
  private mapFeatureTypeToMetricType(featureType: FeatureType): string | null {
    switch (featureType) {
      case 'users':
        return 'users';
      case 'storage':
        return 'storage';
      case 'api_calls':
        return 'api_calls';
      case 'devices':
        return 'devices';
      case 'sms':
        return 'sms';
      case 'emails':
        return 'emails';
      default:
        return null;
    }
  }

  /**
   * Enforce feature limit (throw error if limit exceeded)
   */
  async enforceFeatureLimit(
    organizationId: string,
    featureType: FeatureType,
    requestedAmount: number = 1
  ): Promise<void> {
    const access = await this.checkFeatureAccess(organizationId, featureType);
    
    if (!access.hasAccess) {
      throw new Error(
        access.message || `Feature limit exceeded for ${featureType}`
      );
    }

    if (access.limit !== undefined && access.current !== undefined) {
      const newTotal = access.current + requestedAmount;
      if (newTotal > access.limit) {
        throw new Error(
          `Feature limit would be exceeded: ${newTotal}/${access.limit} for ${featureType}`
        );
      }
    }
  }

  /**
   * Get all feature limits for an organization
   */
  async getFeatureLimits(organizationId: string) {
    try {
      const subWithPlan = await this.getActiveSubscriptionWithPlan(organizationId);
      
      if (!subWithPlan) {
        return null;
      }

      const { plan, subscription } = subWithPlan;

      // Get current usage for all limit-based features
      const [users, storage, apiCalls, devices, sms, emails] = await Promise.all([
        this.getCurrentUsage(organizationId, 'users'),
        this.getCurrentUsage(organizationId, 'storage'),
        this.getCurrentUsage(organizationId, 'api_calls'),
        this.getCurrentUsage(organizationId, 'devices'),
        this.getCurrentUsage(organizationId, 'sms'),
        this.getCurrentUsage(organizationId, 'emails'),
      ]);

      return {
        plan: {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
        },
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
        limits: {
          users: {
            limit: plan.features.maxUsers,
            current: users,
            remaining: Math.max(0, plan.features.maxUsers - users),
          },
          storage: {
            limit: plan.features.maxStorage,
            current: storage,
            remaining: Math.max(0, plan.features.maxStorage - storage),
          },
          apiCalls: {
            limit: plan.features.maxApiCalls,
            current: apiCalls,
            remaining: Math.max(0, plan.features.maxApiCalls - apiCalls),
          },
          devices: {
            limit: plan.features.maxDevices,
            current: devices,
            remaining: Math.max(0, plan.features.maxDevices - devices),
          },
          sms: {
            limit: plan.features.maxSms,
            current: sms,
            remaining: Math.max(0, plan.features.maxSms - sms),
          },
          emails: {
            limit: plan.features.maxEmails,
            current: emails,
            remaining: Math.max(0, plan.features.maxEmails - emails),
          },
        },
        modules: plan.features.modules,
        advancedFeatures: plan.features.advancedFeatures,
      };
    } catch (error) {
      logger.error('[FeatureService] Failed to get feature limits', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Check if organization has access to a module
   */
  async hasModuleAccess(organizationId: string, moduleName: string): Promise<boolean> {
    const access = await this.checkFeatureAccess(organizationId, 'modules', moduleName);
    return access.hasAccess;
  }

  /**
   * Check if organization has access to an advanced feature
   */
  async hasAdvancedFeatureAccess(
    organizationId: string,
    featureName: string
  ): Promise<boolean> {
    const access = await this.checkFeatureAccess(
      organizationId,
      'advanced_features',
      featureName
    );
    return access.hasAccess;
  }
}

export const featureService = new FeatureService();

