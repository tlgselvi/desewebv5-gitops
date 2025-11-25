import { Request, Response } from 'express';
import { integrationService, CreateIntegrationDTO, UpdateIntegrationDTO } from './integration.service.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { logger } from '@/utils/logger.js';
import { z } from 'zod';

// Validation schemas
const CreateIntegrationSchema = z.object({
  provider: z.string().min(1),
  category: z.enum(['payment', 'banking', 'einvoice', 'email', 'sms', 'whatsapp']),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  endpointUrl: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
});

const UpdateIntegrationSchema = z.object({
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  endpointUrl: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export class IntegrationController {
  /**
   * Create a new integration
   * POST /api/v1/integrations
   */
  async create(req: Request, res: Response) {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: 'Organization ID required' });
    }

    const validated = CreateIntegrationSchema.parse(req.body);
    const dto: CreateIntegrationDTO = {
      organizationId,
      ...validated,
    };

    const integration = await integrationService.createIntegration(dto);
    return res.status(201).json(integration);
  }

  /**
   * Get all integrations for organization
   * GET /api/v1/integrations
   */
  async list(req: Request, res: Response) {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: 'Organization ID required' });
    }

    const integrations = await integrationService.getIntegrationsByOrganization(organizationId);
    return res.json(integrations);
  }

  /**
   * Get integration by ID
   * GET /api/v1/integrations/:id
   */
  async getById(req: Request, res: Response) {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: 'Organization ID required' });
    }

    const integration = await integrationService.getIntegration(req.params.id, organizationId);
    return res.json(integration);
  }

  /**
   * Update integration
   * PUT /api/v1/integrations/:id
   */
  async update(req: Request, res: Response) {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: 'Organization ID required' });
    }

    const validated = UpdateIntegrationSchema.parse(req.body);
    const dto: UpdateIntegrationDTO = validated;

    const integration = await integrationService.updateIntegration(req.params.id, organizationId, dto);
    return res.json(integration);
  }

  /**
   * Delete integration
   * DELETE /api/v1/integrations/:id
   */
  async delete(req: Request, res: Response) {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: 'Organization ID required' });
    }

    await integrationService.deleteIntegration(req.params.id, organizationId);
    return res.status(204).send();
  }

  /**
   * Test integration connection
   * POST /api/v1/integrations/:id/test
   */
  async testConnection(req: Request, res: Response) {
    const organizationId = (req as any).user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: 'Organization ID required' });
    }

    const result = await integrationService.testConnection(req.params.id, organizationId);
    return res.json(result);
  }
}

export const integrationController = new IntegrationController();

