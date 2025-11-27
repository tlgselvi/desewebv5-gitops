import { db } from '@/db/index.js';
import { subscriptionPlans } from '@/db/schema/index.js';
import { logger } from '@/utils/logger.js';
import { eq } from 'drizzle-orm';

/**
 * Seed Subscription Plans
 * Creates default subscription plans if they don't exist
 */
async function seedPlans() {
  try {
    logger.info('Seeding subscription plans...');

    const plans = [
      {
        name: 'Free',
        slug: 'free',
        description: 'For individuals and small teams starting out',
        price: '0.00',
        currency: 'TRY',
        billingCycle: 'monthly',
        trialDays: 0,
        features: {
          maxUsers: 1,
          maxStorage: 1, // 1 GB
          maxApiCalls: 1000,
          maxDevices: 1,
          maxSms: 0,
          maxEmails: 100,
          modules: ['finance'],
          advancedFeatures: [],
        },
        isActive: true,
        isPublic: true,
        sortOrder: 1,
      },
      {
        name: 'Starter',
        slug: 'starter',
        description: 'For growing businesses',
        price: '299.00',
        currency: 'TRY',
        billingCycle: 'monthly',
        trialDays: 14,
        features: {
          maxUsers: 5,
          maxStorage: 10, // 10 GB
          maxApiCalls: 10000,
          maxDevices: 5,
          maxSms: 100,
          maxEmails: 1000,
          modules: ['finance', 'crm', 'inventory'],
          advancedFeatures: ['api_access'],
        },
        isActive: true,
        isPublic: true,
        sortOrder: 2,
      },
      {
        name: 'Professional',
        slug: 'pro',
        description: 'For established companies needing advanced features',
        price: '799.00',
        currency: 'TRY',
        billingCycle: 'monthly',
        trialDays: 14,
        features: {
          maxUsers: 20,
          maxStorage: 100, // 100 GB
          maxApiCalls: 100000,
          maxDevices: 20,
          maxSms: 1000,
          maxEmails: 10000,
          modules: ['finance', 'crm', 'inventory', 'hr', 'iot'],
          advancedFeatures: ['api_access', 'custom_reports', 'webhooks', 'ai_insights'],
        },
        isActive: true,
        isPublic: true,
        sortOrder: 3,
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Custom solutions for large organizations',
        price: '2499.00',
        currency: 'TRY',
        billingCycle: 'monthly',
        trialDays: 30,
        features: {
          maxUsers: 999999,
          maxStorage: 1000, // 1 TB
          maxApiCalls: 1000000,
          maxDevices: 1000,
          maxSms: 10000,
          maxEmails: 100000,
          modules: ['finance', 'crm', 'inventory', 'hr', 'iot', 'service'],
          advancedFeatures: ['api_access', 'custom_reports', 'webhooks', 'ai_insights', 'sso', 'audit_logs'],
        },
        isActive: true,
        isPublic: true,
        sortOrder: 4,
      },
    ];

    for (const plan of plans) {
      const existing = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.slug, plan.slug),
      });

      if (!existing) {
        await db.insert(subscriptionPlans).values(plan as any); // Cast as any due to jsonb typing strictness
        logger.info(`Created plan: ${plan.name}`);
      } else {
        logger.info(`Plan already exists: ${plan.name}`);
      }
    }

    logger.info('Subscription plans seeded successfully');
  } catch (error) {
    logger.error('Failed to seed subscription plans', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedPlans()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedPlans };

