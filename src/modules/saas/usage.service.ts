import { db } from '@/db/index.js';
import { usageMetrics, subscriptions, organizations } from '@/db/schema/index.js';
import { eq, and, sql, gte, lte, desc, sum } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';
import { subscriptionService } from './subscription.service.js';

/**
 * Usage Metric Types
 */
export type UsageMetricType = 
  | 'api_calls'
  | 'storage'
  | 'users'
  | 'devices'
  | 'sms'
  | 'emails'
  | 'feature_usage';

/**
 * Track Usage DTO
 */
export interface TrackUsageDTO {
  organizationId: string;
  metricType: UsageMetricType;
  value: number;
  period?: 'daily' | 'monthly';
  metadata?: Record<string, unknown>;
}

/**
 * Usage Period
 */
export interface UsagePeriod {
  start: Date;
  end: Date;
}

/**
 * Usage Metric Result
 */
export interface UsageMetricResult {
  metricType: UsageMetricType;
  period: 'daily' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Usage Summary
 */
export interface UsageSummary {
  metricType: UsageMetricType;
  total: number;
  daily: number;
  monthly: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Usage Service
 * Handles usage tracking and metrics aggregation
 */
export class UsageService {
  
  /**
   * Track usage metric
   * Increments usage counter for a specific metric type
   */
  async trackUsage(data: TrackUsageDTO): Promise<void> {
    try {
      // Get active subscription to determine period
      const subscription = await subscriptionService.getActiveSubscription(
        data.organizationId
      );

      if (!subscription) {
        logger.warn('[UsageService] No active subscription found for usage tracking', {
          organizationId: data.organizationId,
        });
        // Still track usage even without subscription (for free tier)
      }

      // Determine period dates
      const period = data.period || 'monthly';
      const periodDates = this.getPeriodDates(
        subscription?.currentPeriodStart,
        subscription?.currentPeriodEnd,
        period
      );

      // Check if metric already exists for this period
      const existing = await db.query.usageMetrics.findFirst({
        where: and(
          eq(usageMetrics.organizationId, data.organizationId),
          eq(usageMetrics.metricType, data.metricType),
          eq(usageMetrics.period, period),
          eq(usageMetrics.periodStart, periodDates.start),
          eq(usageMetrics.periodEnd, periodDates.end)
        ),
      });

      if (existing) {
        // Update existing metric (increment value)
        await db
          .update(usageMetrics)
          .set({
            value: sql`${usageMetrics.value} + ${data.value}`,
            metadata: data.metadata ? data.metadata : existing.metadata,
            createdAt: new Date(),
          })
          .where(eq(usageMetrics.id, existing.id));
      } else {
        // Create new metric
        await db.insert(usageMetrics).values({
          organizationId: data.organizationId,
          subscriptionId: subscription?.id,
          metricType: data.metricType,
          value: data.value.toString(),
          period,
          periodStart: periodDates.start,
          periodEnd: periodDates.end,
          metadata: data.metadata || null,
        });
      }

      logger.debug('[UsageService] Usage tracked', {
        organizationId: data.organizationId,
        metricType: data.metricType,
        value: data.value,
        period,
      });
    } catch (error) {
      logger.error('[UsageService] Failed to track usage', {
        error: error instanceof Error ? error.message : String(error),
        data,
      });
      // Don't throw - usage tracking should not break the main flow
      // Log error but continue execution
    }
  }

  /**
   * Batch track usage (for performance optimization)
   */
  async trackUsageBatch(usageData: TrackUsageDTO[]): Promise<void> {
    try {
      // Group by organization and period for efficient batch inserts
      const grouped = new Map<string, TrackUsageDTO[]>();
      
      for (const data of usageData) {
        const key = `${data.organizationId}-${data.period || 'monthly'}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(data);
      }

      // Process each group
      await Promise.all(
        Array.from(grouped.entries()).map(([_, dataList]) =>
          Promise.all(dataList.map(data => this.trackUsage(data)))
        )
      );

      logger.debug('[UsageService] Batch usage tracked', {
        count: usageData.length,
      });
    } catch (error) {
      logger.error('[UsageService] Failed to track usage batch', {
        error: error instanceof Error ? error.message : String(error),
        count: usageData.length,
      });
    }
  }

  /**
   * Get current usage for a metric type
   */
  async getCurrentUsage(
    organizationId: string,
    metricType: UsageMetricType,
    period: 'daily' | 'monthly' = 'monthly'
  ): Promise<number> {
    try {
      const subscription = await subscriptionService.getActiveSubscription(
        organizationId
      );

      if (!subscription) {
        return 0;
      }

      const periodDates = this.getPeriodDates(
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        period
      );

      const [result] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${usageMetrics.value}::numeric), 0)`,
        })
        .from(usageMetrics)
        .where(
          and(
            eq(usageMetrics.organizationId, organizationId),
            eq(usageMetrics.metricType, metricType),
            eq(usageMetrics.period, period),
            gte(usageMetrics.periodStart, periodDates.start),
            lte(usageMetrics.periodEnd, periodDates.end)
          )
        );

      return Number(result?.total || 0);
    } catch (error) {
      logger.error('[UsageService] Failed to get current usage', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        metricType,
      });
      return 0;
    }
  }

  /**
   * Get usage history for a metric type
   */
  async getUsageHistory(
    organizationId: string,
    metricType: UsageMetricType,
    options?: {
      period?: 'daily' | 'monthly';
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<UsageMetricResult[]> {
    try {
      const conditions = [
        eq(usageMetrics.organizationId, organizationId),
        eq(usageMetrics.metricType, metricType),
      ];

      if (options?.period) {
        conditions.push(eq(usageMetrics.period, options.period));
      }

      if (options?.startDate) {
        conditions.push(gte(usageMetrics.periodStart, options.startDate));
      }

      if (options?.endDate) {
        conditions.push(lte(usageMetrics.periodEnd, options.endDate));
      }

      const metrics = await db.query.usageMetrics.findMany({
        where: and(...conditions),
        orderBy: [desc(usageMetrics.periodStart)],
        limit: options?.limit || 100,
      });

      return metrics.map(metric => ({
        metricType: metric.metricType as UsageMetricType,
        period: metric.period as 'daily' | 'monthly',
        periodStart: metric.periodStart,
        periodEnd: metric.periodEnd,
        value: Number(metric.value),
        metadata: metric.metadata as Record<string, unknown> | undefined,
      }));
    } catch (error) {
      logger.error('[UsageService] Failed to get usage history', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        metricType,
      });
      throw error;
    }
  }

  /**
   * Get usage summary for all metric types
   */
  async getUsageSummary(
    organizationId: string,
    period: 'daily' | 'monthly' = 'monthly'
  ): Promise<UsageSummary[]> {
    try {
      const subscription = await subscriptionService.getActiveSubscription(
        organizationId
      );

      if (!subscription) {
        return [];
      }

      const periodDates = this.getPeriodDates(
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        period
      );

      // Get all metric types
      const metricTypes: UsageMetricType[] = [
        'api_calls',
        'storage',
        'users',
        'devices',
        'sms',
        'emails',
      ];

      const summaries = await Promise.all(
        metricTypes.map(async (metricType) => {
          const [result] = await db
            .select({
              total: sql<number>`COALESCE(SUM(${usageMetrics.value}::numeric), 0)`,
            })
            .from(usageMetrics)
            .where(
              and(
                eq(usageMetrics.organizationId, organizationId),
                eq(usageMetrics.metricType, metricType),
                eq(usageMetrics.period, period),
                gte(usageMetrics.periodStart, periodDates.start),
                lte(usageMetrics.periodEnd, periodDates.end)
              )
            );

          // Also get daily total if period is monthly
          let daily = 0;
          if (period === 'monthly') {
            const dailyTotal = await this.getCurrentUsage(
              organizationId,
              metricType,
              'daily'
            );
            daily = dailyTotal;
          }

          return {
            metricType,
            total: Number(result?.total || 0),
            daily,
            monthly: period === 'monthly' ? Number(result?.total || 0) : 0,
            periodStart: periodDates.start,
            periodEnd: periodDates.end,
          };
        })
      );

      return summaries;
    } catch (error) {
      logger.error('[UsageService] Failed to get usage summary', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Aggregate usage metrics (for cron jobs)
   * Aggregates daily metrics into monthly metrics
   */
  async aggregateUsageMetrics(organizationId?: string): Promise<void> {
    try {
      const conditions = [
        eq(usageMetrics.period, 'daily'),
      ];

      if (organizationId) {
        conditions.push(eq(usageMetrics.organizationId, organizationId));
      }

      // Get all daily metrics that need aggregation
      const dailyMetrics = await db.query.usageMetrics.findMany({
        where: and(...conditions),
        orderBy: [desc(usageMetrics.periodStart)],
      });

      // Group by organization, metric type, and month
      const grouped = new Map<string, typeof dailyMetrics>();

      for (const metric of dailyMetrics) {
        const monthKey = `${metric.organizationId}-${metric.metricType}-${metric.periodStart.getFullYear()}-${metric.periodStart.getMonth()}`;
        
        if (!grouped.has(monthKey)) {
          grouped.set(monthKey, []);
        }
        grouped.get(monthKey)!.push(metric);
      }

      // Aggregate each group
      for (const [key, metrics] of grouped.entries()) {
        if (metrics.length === 0) continue;

        const firstMetric = metrics[0];
        const monthStart = new Date(
          firstMetric.periodStart.getFullYear(),
          firstMetric.periodStart.getMonth(),
          1
        );
        const monthEnd = new Date(
          firstMetric.periodStart.getFullYear(),
          firstMetric.periodStart.getMonth() + 1,
          0,
          23,
          59,
          59
        );

        // Calculate total
        const total = metrics.reduce(
          (sum, m) => sum + Number(m.value),
          0
        );

        // Check if monthly metric already exists
        const existing = await db.query.usageMetrics.findFirst({
          where: and(
            eq(usageMetrics.organizationId, firstMetric.organizationId),
            eq(usageMetrics.metricType, firstMetric.metricType),
            eq(usageMetrics.period, 'monthly'),
            eq(usageMetrics.periodStart, monthStart),
            eq(usageMetrics.periodEnd, monthEnd)
          ),
        });

        if (existing) {
          // Update existing
          await db
            .update(usageMetrics)
            .set({
              value: total.toString(),
              updatedAt: new Date(),
            })
            .where(eq(usageMetrics.id, existing.id));
        } else {
          // Create new
          await db.insert(usageMetrics).values({
            organizationId: firstMetric.organizationId,
            subscriptionId: firstMetric.subscriptionId,
            metricType: firstMetric.metricType,
            value: total.toString(),
            period: 'monthly',
            periodStart: monthStart,
            periodEnd: monthEnd,
            metadata: null,
          });
        }
      }

      logger.info('[UsageService] Usage metrics aggregated', {
        organizationId,
        groupsProcessed: grouped.size,
      });
    } catch (error) {
      logger.error('[UsageService] Failed to aggregate usage metrics', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Get period dates based on subscription period or current date
   */
  private getPeriodDates(
    periodStart?: Date | null,
    periodEnd?: Date | null,
    period: 'daily' | 'monthly' = 'monthly'
  ): UsagePeriod {
    const now = new Date();

    if (period === 'daily') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    // Monthly period
    if (periodStart && periodEnd) {
      return { start: periodStart, end: periodEnd };
    }

    // Fallback to current month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Track API call usage
   */
  async trackApiCall(
    organizationId: string,
    endpoint?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackUsage({
      organizationId,
      metricType: 'api_calls',
      value: 1,
      period: 'monthly',
      metadata: {
        endpoint,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Track storage usage
   */
  async trackStorage(
    organizationId: string,
    bytes: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Convert bytes to GB
    const gb = bytes / (1024 * 1024 * 1024);
    
    await this.trackUsage({
      organizationId,
      metricType: 'storage',
      value: gb,
      period: 'monthly',
      metadata: {
        bytes,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Track user count
   */
  async trackUserCount(organizationId: string, count: number): Promise<void> {
    await this.trackUsage({
      organizationId,
      metricType: 'users',
      value: count,
      period: 'monthly',
    });
  }

  /**
   * Track device count
   */
  async trackDeviceCount(organizationId: string, count: number): Promise<void> {
    await this.trackUsage({
      organizationId,
      metricType: 'devices',
      value: count,
      period: 'monthly',
    });
  }

  /**
   * Track SMS send
   */
  async trackSms(
    organizationId: string,
    count: number = 1,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackUsage({
      organizationId,
      metricType: 'sms',
      value: count,
      period: 'monthly',
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  /**
   * Track email send
   */
  async trackEmail(
    organizationId: string,
    count: number = 1,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.trackUsage({
      organizationId,
      metricType: 'emails',
      value: count,
      period: 'monthly',
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  }
}

export const usageService = new UsageService();

