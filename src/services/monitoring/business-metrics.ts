/**
 * Business Metrics Service
 * 
 * Custom Prometheus metrics for business KPIs
 * @module services/monitoring/business-metrics
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { logger } from '@/utils/logger.js';

// Create a custom registry for business metrics
export const businessRegistry = new Registry();

// ============================================
// User & Organization Metrics
// ============================================

export const newUserRegistrations = new Counter({
  name: 'business_user_registrations_total',
  help: 'Total number of new user registrations',
  labelNames: ['plan', 'source'],
  registers: [businessRegistry],
});

export const activeUsers = new Gauge({
  name: 'business_active_users',
  help: 'Number of active users (logged in within last 24h)',
  labelNames: ['plan'],
  registers: [businessRegistry],
});

export const organizationsTotal = new Gauge({
  name: 'business_organizations_total',
  help: 'Total number of organizations',
  labelNames: ['plan', 'status'],
  registers: [businessRegistry],
});

// ============================================
// Subscription & Billing Metrics
// ============================================

export const subscriptionCreated = new Counter({
  name: 'business_subscription_created_total',
  help: 'Total number of subscriptions created',
  labelNames: ['plan'],
  registers: [businessRegistry],
});

export const subscriptionCancelled = new Counter({
  name: 'business_subscription_cancelled_total',
  help: 'Total number of subscriptions cancelled',
  labelNames: ['plan', 'reason'],
  registers: [businessRegistry],
});

export const activeSubscriptions = new Gauge({
  name: 'business_active_subscriptions',
  help: 'Number of active subscriptions by plan',
  labelNames: ['plan'],
  registers: [businessRegistry],
});

export const monthlyRecurringRevenue = new Gauge({
  name: 'business_mrr_cents',
  help: 'Monthly Recurring Revenue in cents',
  labelNames: ['currency'],
  registers: [businessRegistry],
});

// ============================================
// Payment Metrics
// ============================================

export const paymentsProcessed = new Counter({
  name: 'business_payments_processed_total',
  help: 'Total number of payments processed',
  labelNames: ['status', 'payment_method'],
  registers: [businessRegistry],
});

export const paymentAmount = new Histogram({
  name: 'business_payment_amount_cents',
  help: 'Payment amounts in cents',
  labelNames: ['currency', 'payment_method'],
  buckets: [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000],
  registers: [businessRegistry],
});

export const paymentFailures = new Counter({
  name: 'business_payment_failures_total',
  help: 'Total number of payment failures',
  labelNames: ['error_type', 'payment_method'],
  registers: [businessRegistry],
});

// ============================================
// API Usage Metrics
// ============================================

export const apiCallsTotal = new Counter({
  name: 'business_api_calls_total',
  help: 'Total API calls by organization',
  labelNames: ['organization_id', 'endpoint', 'method'],
  registers: [businessRegistry],
});

export const apiQuotaUsage = new Gauge({
  name: 'business_api_quota_usage_percent',
  help: 'API quota usage percentage by organization',
  labelNames: ['organization_id', 'plan'],
  registers: [businessRegistry],
});

// ============================================
// IoT Device Metrics
// ============================================

export const iotDevicesTotal = new Gauge({
  name: 'business_iot_devices_total',
  help: 'Total number of IoT devices',
  labelNames: ['organization_id', 'device_type', 'status'],
  registers: [businessRegistry],
});

export const iotMessagesTotal = new Counter({
  name: 'business_iot_messages_total',
  help: 'Total IoT messages processed',
  labelNames: ['direction', 'message_type'],
  registers: [businessRegistry],
});

// ============================================
// Feature Usage Metrics
// ============================================

export const featureUsage = new Counter({
  name: 'business_feature_usage_total',
  help: 'Feature usage count',
  labelNames: ['feature', 'plan'],
  registers: [businessRegistry],
});

export const aiRequestsTotal = new Counter({
  name: 'business_ai_requests_total',
  help: 'Total AI/LLM requests',
  labelNames: ['model', 'feature', 'status'],
  registers: [businessRegistry],
});

export const aiTokensUsed = new Counter({
  name: 'business_ai_tokens_total',
  help: 'Total AI tokens used',
  labelNames: ['model', 'type'],
  registers: [businessRegistry],
});

// ============================================
// Helper Functions
// ============================================

/**
 * Record a new user registration
 */
export function recordUserRegistration(plan: string, source: string = 'web'): void {
  newUserRegistrations.inc({ plan, source });
}

/**
 * Record a subscription event
 */
export function recordSubscriptionEvent(
  event: 'created' | 'cancelled' | 'upgraded' | 'downgraded',
  plan: string,
  reason?: string
): void {
  if (event === 'created') {
    subscriptionCreated.inc({ plan });
  } else if (event === 'cancelled') {
    subscriptionCancelled.inc({ plan, reason: reason || 'unknown' });
  }
}

/**
 * Record a payment
 */
export function recordPayment(
  status: 'success' | 'failed' | 'pending',
  amount: number,
  currency: string = 'USD',
  paymentMethod: string = 'card',
  errorType?: string
): void {
  paymentsProcessed.inc({ status, payment_method: paymentMethod });
  
  if (status === 'success') {
    paymentAmount.observe({ currency, payment_method: paymentMethod }, amount);
  } else if (status === 'failed' && errorType) {
    paymentFailures.inc({ error_type: errorType, payment_method: paymentMethod });
  }
}

/**
 * Update MRR
 */
export function updateMRR(amount: number, currency: string = 'USD'): void {
  monthlyRecurringRevenue.set({ currency }, amount);
}

/**
 * Record API usage
 */
export function recordApiUsage(
  organizationId: string,
  endpoint: string,
  method: string
): void {
  apiCallsTotal.inc({ organization_id: organizationId, endpoint, method });
}

/**
 * Update API quota usage
 */
export function updateApiQuotaUsage(
  organizationId: string,
  plan: string,
  usagePercent: number
): void {
  apiQuotaUsage.set({ organization_id: organizationId, plan }, usagePercent);
}

/**
 * Record feature usage
 */
export function recordFeatureUsage(feature: string, plan: string): void {
  featureUsage.inc({ feature, plan });
}

/**
 * Record AI request
 */
export function recordAiRequest(
  model: string,
  feature: string,
  status: 'success' | 'error',
  promptTokens: number = 0,
  completionTokens: number = 0
): void {
  aiRequestsTotal.inc({ model, feature, status });
  
  if (promptTokens > 0) {
    aiTokensUsed.inc({ model, type: 'prompt' }, promptTokens);
  }
  if (completionTokens > 0) {
    aiTokensUsed.inc({ model, type: 'completion' }, completionTokens);
  }
}

/**
 * Get all business metrics
 */
export async function getBusinessMetrics(): Promise<string> {
  try {
    return await businessRegistry.metrics();
  } catch (error) {
    logger.error('Error getting business metrics', { error });
    return '';
  }
}

/**
 * Initialize business metrics with default values
 */
export async function initializeBusinessMetrics(): Promise<void> {
  try {
    // Set initial values for gauges
    activeUsers.set({ plan: 'starter' }, 0);
    activeUsers.set({ plan: 'pro' }, 0);
    activeUsers.set({ plan: 'enterprise' }, 0);
    
    activeSubscriptions.set({ plan: 'starter' }, 0);
    activeSubscriptions.set({ plan: 'pro' }, 0);
    activeSubscriptions.set({ plan: 'enterprise' }, 0);
    
    monthlyRecurringRevenue.set({ currency: 'USD' }, 0);
    
    logger.info('Business metrics initialized');
  } catch (error) {
    logger.error('Failed to initialize business metrics', { error });
  }
}

