import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { devices, telemetry, deviceAlerts } from '../../db/schema/iot.js';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// --- Devices ---

router.get('/devices', authenticate, asyncHandler(async (req, res) => {
  const orgId = (req.user as any)?.organizationId || 'default-org-id'; // Fallback for MVP
  if (!orgId) return res.status(400).json({ error: 'Organization ID missing' });

  const result = await db.select().from(devices).where(eq(devices.organizationId, orgId));
  res.json(result);
}));

router.post('/devices', authenticate, asyncHandler(async (req, res) => {
  const orgId = (req.user as any)?.organizationId || 'default-org-id';
  if (!orgId) return res.status(400).json({ error: 'Organization ID missing' });

  const schema = z.object({
    name: z.string(),
    serialNumber: z.string(),
    type: z.string(), // pool_controller, sensor_hub
    model: z.string().optional(),
  });

  const data = schema.parse(req.body);
  
  const [newDevice] = await db.insert(devices).values({
    id: uuidv4(),
    ...data,
    organizationId: orgId,
    isActive: true,
    status: 'offline'
  }).returning();
  
  res.json(newDevice);
}));

// --- Telemetry ---

router.get('/telemetry/:deviceId', authenticate, asyncHandler(async (req, res) => {
  const orgId = (req.user as any)?.organizationId || 'default-org-id';
  const { deviceId } = req.params;
  if (!orgId) return res.status(400).json({ error: 'Organization ID missing' });

  // Son 100 veri noktası
  const result = await db.select()
    .from(telemetry)
    .where(and(eq(telemetry.organizationId, orgId), eq(telemetry.deviceId, deviceId)))
    .orderBy(desc(telemetry.timestamp))
    .limit(100);

  res.json(result);
}));

// --- Alerts ---

router.get('/alerts', authenticate, asyncHandler(async (req, res) => {
  const orgId = (req.user as any)?.organizationId || 'default-org-id';
  if (!orgId) return res.status(400).json({ error: 'Organization ID missing' });

  const result = await db.select()
    .from(deviceAlerts)
    .where(eq(deviceAlerts.organizationId, orgId))
    .orderBy(desc(deviceAlerts.createdAt));

  res.json(result);
}));

export const iotRoutes = router;
