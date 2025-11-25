import { Request, Response } from 'express';
import { iotService } from './service.js';
import { z } from 'zod';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { RequestWithUser } from '@/middleware/auth.js';

export class IoTController {
  getDevices = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const result = await iotService.getDevices(orgId);
    res.json(result);
  }

  createDevice = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const schema = z.object({
        name: z.string(),
        serialNumber: z.string(),
        type: z.string(),
        model: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const deviceData: any = {
      name: data.name,
      serialNumber: data.serialNumber,
      type: data.type,
    };
    if (data.model) deviceData.model = data.model;
    const result = await iotService.createDevice(deviceData, orgId);
    return res.json(result);
  }

  getTelemetry = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const { deviceId } = req.params;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }
    const result = await iotService.getTelemetry(deviceId, orgId);
    return res.json(result);
  }

  getAlerts = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const result = await iotService.getAlerts(orgId);
    res.json(result);
  }
}

export const iotController = new IoTController();

