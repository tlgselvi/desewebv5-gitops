import { Router, type Router as ExpressRouter } from 'express';
import { inventoryRoutes } from '../modules/inventory/routes.js';
import { crmRoutes } from '../modules/crm/routes.js';
import { iotRoutes } from '../modules/iot/routes.js';
import { seoRoutes } from '../modules/seo/routes.js';
import { serviceRoutes } from '../modules/service/routes.js';
import { integrationRoutes } from '../modules/saas/integration.routes.js';
import { organizationRoutes } from '../modules/saas/organization.routes.js';

const router: ExpressRouter = Router();

// ... existing routes ...

// Enterprise Modules
router.use('/crm', crmRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/iot', iotRoutes);
router.use('/seo', seoRoutes);
router.use('/service', serviceRoutes);

// SaaS & Admin Modules
router.use('/integrations', integrationRoutes);
router.use('/admin/organizations', organizationRoutes);

export const moduleRoutes = router;

