import type { Response } from 'express';
import { serviceService } from './service.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { logger } from '@/utils/logger.js';
import type { RequestWithUser } from '@/middleware/auth.js';

export class ServiceController {
  async createServiceRequest(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestData: Parameters<typeof serviceService.createServiceRequest>[0] = {
      organizationId,
      title: req.body.title,
      requestedBy: req.user.id,
    };
    
    if (req.body.contactId) requestData.contactId = req.body.contactId;
    if (req.body.description) requestData.description = req.body.description;
    if (req.body.priority) requestData.priority = req.body.priority;
    if (req.body.category) requestData.category = req.body.category;
    if (req.body.scheduledDate) requestData.scheduledDate = new Date(req.body.scheduledDate);
    if (req.body.location) requestData.location = req.body.location;
    
    const request = await serviceService.createServiceRequest(requestData);

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

    if (!requestId || !technicianId) {
      return res.status(400).json({ error: 'requestId and technicianId are required' });
    }

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

    const filter: { availability?: string; isActive?: boolean } = {};
    if (req.query.availability) {
      filter.availability = req.query.availability as string;
    }
    if (req.query.isActive === 'true') {
      filter.isActive = true;
    } else if (req.query.isActive === 'false') {
      filter.isActive = false;
    }
    
    const technicians = await serviceService.getTechnicians(organizationId, filter);

    return res.json({ technicians });
  }

  async createMaintenancePlan(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const planData: Parameters<typeof serviceService.createMaintenancePlan>[0] = {
      organizationId,
      contactId: req.body.contactId,
      name: req.body.name,
      description: req.body.description,
      planType: req.body.planType,
      frequency: req.body.frequency,
      frequencyValue: req.body.frequencyValue,
      startDate: new Date(req.body.startDate),
      assignedTechnicianId: req.body.assignedTechnicianId,
      estimatedDuration: req.body.estimatedDuration,
      estimatedCost: req.body.estimatedCost,
      tasks: req.body.tasks,
    };
    if (req.body.endDate) {
      planData.endDate = new Date(req.body.endDate);
    }
    
    const plan = await serviceService.createMaintenancePlan(planData);

    return res.status(201).json(plan);
  }

  async getMaintenancePlans(req: RequestWithUser, res: Response): Promise<Response> {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const filter: Parameters<typeof serviceService.getMaintenancePlans>[1] = {};
    if (req.query.isActive === 'true') {
      filter.isActive = true;
    } else if (req.query.isActive === 'false') {
      filter.isActive = false;
    }
    if (req.query.planType) {
      filter.planType = req.query.planType as string;
    }
    
    const plans = await serviceService.getMaintenancePlans(organizationId, filter);

    return res.json({ plans });
  }
}

export const serviceController = new ServiceController();

