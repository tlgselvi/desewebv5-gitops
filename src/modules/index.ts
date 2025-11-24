import { Router } from 'express';
import { inventoryRoutes } from '../modules/inventory/routes';
import { crmRoutes } from '../modules/crm/routes';
import { iotRoutes } from '../modules/iot/routes';
// Finance routes zaten import edilmiş olabilir ama buraya da ekleyeceğiz

const router = Router();

// ... existing routes ...

// Enterprise Modules
router.use('/crm', crmRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/iot', iotRoutes);
// router.use('/finance', financeRoutes); // Finance modülü zaten varsa buraya taşınmalı

export const moduleRoutes = router;

