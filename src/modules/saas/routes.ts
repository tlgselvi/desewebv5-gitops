import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { billingRoutes } from './billing.routes.js';
import { subscriptionRoutes } from './subscription.routes.js';
import { usageRoutes } from './usage.routes.js';
import { organizationRoutes } from './organization.routes.js';
import { integrationRoutes } from './integration.routes.js';

const router: ExpressRouter = Router();

router.use('/billing', billingRoutes);
router.use('/subscriptions', subscriptionRoutes); // Note: mounted as plural /subscriptions in most APIs, but we used singular in controller. Let's stick to /subscriptions
router.use('/usage', usageRoutes);
router.use('/organizations', organizationRoutes);
router.use('/integrations', integrationRoutes);

export { router as saasRoutes };

