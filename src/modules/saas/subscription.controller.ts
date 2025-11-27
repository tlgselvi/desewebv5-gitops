import { Request, Response } from 'express';
import { subscriptionService } from './subscription.service.js';
import { planService } from './plan.service.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export class SubscriptionController {
  
  /**
   * Get Active Subscription
   * GET /api/saas/subscription
   */
  getSubscription = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const subscription = await subscriptionService.getActiveSubscription(organizationId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'not_found', message: 'No active subscription found' });
    }

    res.json(subscription);
  });

  /**
   * Create Subscription
   * POST /api/saas/subscription
   */
  createSubscription = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { planId, paymentMethodId, trialDays } = req.body;

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const subscription = await subscriptionService.createSubscription({
      organizationId,
      planId,
      paymentMethodId,
      trialDays
    });

    res.status(201).json(subscription);
  });

  /**
   * Cancel Subscription
   * POST /api/saas/subscription/cancel
   */
  cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { immediate } = req.body;

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const subscription = await subscriptionService.getActiveSubscription(organizationId);
    if (!subscription) {
      return res.status(404).json({ error: 'not_found', message: 'No active subscription found' });
    }

    const canceled = await subscriptionService.cancelSubscription(
      subscription.id,
      organizationId,
      immediate
    );

    res.json(canceled);
  });

  /**
   * Resume Subscription
   * POST /api/saas/subscription/resume
   */
  resumeSubscription = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const subscription = await subscriptionService.getActiveSubscription(organizationId);
    if (!subscription) {
      // Check if there is a canceled one? 
      // getActiveSubscription returns 'trial', 'active', 'past_due'
      // We might need to look for canceled ones specifically if getActive doesn't return them
      // For resume, usually it's about canceling the cancellation request (cancelAtPeriodEnd)
      // Or reviving a recently canceled sub. 
      // Let's assume the user calls this on a sub that is marked to cancel or recently canceled.
      return res.status(404).json({ error: 'not_found', message: 'No active subscription found to resume' });
    }

    const resumed = await subscriptionService.resumeSubscription(subscription.id, organizationId);
    res.json(resumed);
  });

  /**
   * Change Plan
   * POST /api/saas/subscription/change-plan
   */
  changePlan = asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user?.organizationId;
    const { planId, immediate } = req.body;

    if (!organizationId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Organization ID required' });
    }

    const subscription = await subscriptionService.getActiveSubscription(organizationId);
    if (!subscription) {
      return res.status(404).json({ error: 'not_found', message: 'No active subscription found' });
    }

    const updated = await subscriptionService.changePlan(
      subscription.id,
      organizationId,
      planId,
      immediate
    );

    res.json(updated);
  });

  /**
   * List Plans
   * GET /api/saas/plans
   */
  listPlans = asyncHandler(async (req: Request, res: Response) => {
    const { activeOnly, publicOnly } = req.query;
    
    const plans = await planService.listPlans({
      activeOnly: activeOnly === 'true',
      publicOnly: publicOnly === 'true',
    });

    res.json(plans);
  });
}

export const subscriptionController = new SubscriptionController();

