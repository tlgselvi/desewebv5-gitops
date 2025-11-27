import { Request, Response } from 'express';
import { organizationService } from './organization.service.js';
import { z } from 'zod';

export class OrganizationController {
  
  async list(req: Request, res: Response) {
    try {
      const orgs = await organizationService.getAllOrganizations();
      return res.json(orgs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await organizationService.getSystemStats();
      return res.json(stats);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['active', 'suspended', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const updated = await organizationService.updateStatus(id, status);
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const organizationController = new OrganizationController();
