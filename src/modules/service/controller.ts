import type { Request, Response } from 'express';
import { serviceService } from './service.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    organizationId: string;
  };
}

export class ServiceController {
  async createServiceRequest(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request = await serviceService.createServiceRequest({
      organizationId,
      contactId: req.body.contactId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      category: req.body.category,
      requestedBy: req.user.id,
      scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      location: req.body.location,
    });

    return res.status(201).json(request);
  }

  async getServiceRequests(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requests = await serviceService.getServiceRequests(organizationId, {
      status: req.query.status as string,
      assignedTo: req.query.assignedTo as string,
      priority: req.query.priority as string,
    });

    return res.json({ requests });
  }

  async assignTechnician(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const { technicianId } = req.body;

    const updated = await serviceService.assignTechnician(requestId, technicianId, organizationId);

    return res.json(updated);
  }

  async createTechnician(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const technician = await serviceService.createTechnician({
      organizationId,
      userId: req.body.userId,
      employeeNumber: req.body.employeeNumber,
      specialization: req.body.specialization,
      skillLevel: req.body.skillLevel,
      hourlyRate: req.body.hourlyRate,
    });

    return res.status(201).json(technician);
  }

  async getTechnicians(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const technicians = await serviceService.getTechnicians(organizationId, {
      availability: req.query.availability as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    });

    return res.json({ technicians });
  }

  async createMaintenancePlan(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const plan = await serviceService.createMaintenancePlan({
      organizationId,
      contactId: req.body.contactId,
      name: req.body.name,
      description: req.body.description,
      planType: req.body.planType,
      frequency: req.body.frequency,
      frequencyValue: req.body.frequencyValue,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      assignedTechnicianId: req.body.assignedTechnicianId,
      estimatedDuration: req.body.estimatedDuration,
      estimatedCost: req.body.estimatedCost,
      tasks: req.body.tasks,
    });

    return res.status(201).json(plan);
  }

  async getMaintenancePlans(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const plans = await serviceService.getMaintenancePlans(organizationId, {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      planType: req.query.planType as string,
    });

    return res.json({ plans });
  }
}

export const serviceController = new ServiceController();

