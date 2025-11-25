import { Router, type Router as ExpressRouter } from 'express';
import { iotController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router: ExpressRouter = Router();

router.use(authenticate);

router.get('/devices', asyncHandler(iotController.getDevices));
router.post('/devices', asyncHandler(iotController.createDevice));
router.get('/telemetry/:deviceId', asyncHandler(iotController.getTelemetry));
router.get('/alerts', asyncHandler(iotController.getAlerts));

export const iotRoutes: ExpressRouter = router;
