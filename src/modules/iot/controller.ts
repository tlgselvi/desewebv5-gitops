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
    
    // Parse query parameters for filtering
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const result = await iotService.getTelemetry(deviceId, orgId, {
      limit: Math.min(limit, 1000), // Cap at 1000
      startDate,
      endDate,
    });
    return res.json(result);
  }

  getAlerts = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const result = await iotService.getAlerts(orgId);
    res.json(result);
  }

  sendCommand = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    const schema = z.object({
      command: z.string(),
      parameters: z.record(z.unknown()).optional(),
      timeout: z.number().optional(),
    });
    
    const data = schema.parse(req.body);
    const result = await iotService.sendCommand(
      deviceId,
      orgId,
      data.command,
      data.parameters || {},
      data.timeout || 30
    );
    
    return res.json(result);
  }

  getCommands = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const status = req.query.status as string | undefined;
    
    const result = await iotService.getCommands(deviceId, orgId, {
      limit: Math.min(limit, 200),
      status,
    });
    
    return res.json(result);
  }

  getStatusHistory = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const result = await iotService.getStatusHistory(deviceId, orgId, {
      limit: Math.min(limit, 1000),
      startDate,
      endDate,
    });
    
    return res.json(result);
  }

  updateDeviceConfig = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    const schema = z.object({
      config: z.record(z.unknown()),
    });
    
    const data = schema.parse(req.body);
    const result = await iotService.updateDeviceConfig(deviceId, orgId, data.config);
    
    return res.json(result);
  }

  getDeviceHealth = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const { deviceId } = req.params;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    try {
      const result = await iotService.getDeviceHealth(deviceId, orgId);
      return res.json(result);
    } catch (error) {
      return res.status(404).json({ 
        error: error instanceof Error ? error.message : 'Device not found' 
      });
    }
  }

  getDashboardSummary = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const result = await iotService.getDashboardSummary(orgId);
    return res.json(result);
  }

  checkDeviceHealth = async (req: Request, res: Response) => {
    const orgId = (req as RequestWithUser).user?.organizationId || 'default-org-id';
    const result = await iotService.checkDeviceHealth(orgId);
    return res.json({ 
      checked: true, 
      alertsGenerated: result.length,
      alerts: result 
    });
  }
}

export const iotController = new IoTController();

