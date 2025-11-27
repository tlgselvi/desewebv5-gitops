import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { subscriptionController } from './subscription.controller.js';
import { authenticate } from '@/middleware/auth.js';

const router: ExpressRouter = Router();

// Public routes (e.g. plans list might be public)
router.get('/plans', subscriptionController.listPlans);

// Protected routes
router.use(authenticate);

router.get('/subscription', subscriptionController.getSubscription);
router.post('/subscription', subscriptionController.createSubscription);
router.post('/subscription/cancel', subscriptionController.cancelSubscription);
router.post('/subscription/resume', subscriptionController.resumeSubscription);
router.post('/subscription/change-plan', subscriptionController.changePlan);

export { router as subscriptionRoutes };

