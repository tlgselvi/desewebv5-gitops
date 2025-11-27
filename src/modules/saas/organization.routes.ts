import { Router, type Router as ExpressRouter } from 'express';
import { organizationController } from './organization.controller.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router: ExpressRouter = Router();

// Only Super Admin can access these routes
router.use(authenticate);
router.use(setRLSContextMiddleware); // Set RLS context (super_admin can see all)
router.use(authorize(['super_admin']));

router.get('/', asyncHandler((req, res) => organizationController.list(req, res)));
router.get('/stats', asyncHandler((req, res) => organizationController.getStats(req, res)));
router.patch('/:id/status', asyncHandler((req, res) => organizationController.updateStatus(req, res)));

export const organizationRoutes = router;

