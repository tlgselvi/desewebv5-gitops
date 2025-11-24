import { Request, Response } from 'express';
import { iotService } from './service.js';
import { z } from 'zod';
import { asyncHandler } from '@/utils/asyncHandler.js';

interface AuthenticatedRequest extends Request {
  user?: {
    organizationId: string;
    id: string;
    role: string;
  }
}

export class IoTController {
  getDevices = async (req: Request, res: Response) => {
    const orgId = (req as AuthenticatedRequest).user?.organizationId || 'default-org-id';
    const result = await iotService.getDevices(orgId);
    res.json(result);
  }

  createDevice = async (req: Request, res: Response) => {
    const orgId = (req as AuthenticatedRequest).user?.organizationId || 'default-org-id';
    const schema = z.object({
        name: z.string(),
        serialNumber: z.string(),
        type: z.string(),
        model: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const result = await iotService.createDevice(data, orgId);
    res.json(result);
  }

  getTelemetry = async (req: Request, res: Response) => {
    const orgId = (req as AuthenticatedRequest).user?.organizationId || 'default-org-id';
    const { deviceId } = req.params;
    const result = await iotService.getTelemetry(deviceId, orgId);
    res.json(result);
  }

  getAlerts = async (req: Request, res: Response) => {
    const orgId = (req as AuthenticatedRequest).user?.organizationId || 'default-org-id';
    const result = await iotService.getAlerts(orgId);
    res.json(result);
  }
}

export const iotController = new IoTController();

