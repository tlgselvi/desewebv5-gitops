import { Request, Response } from 'express';
import { inventoryService } from './service.js';
import { z } from 'zod';

export class InventoryController {

  async addStockMovement(req: Request, res: Response) {
    try {
      const schema = z.object({
        warehouseId: z.string(),
        productId: z.string(),
        type: z.enum(['in', 'out', 'adjustment']),
        quantity: z.number().positive(),
        notes: z.string().optional(),
        referenceId: z.string().optional(),
      });

      const data = schema.parse(req.body);
      const organizationId = (req.user as any)?.organizationId;
      const userId = (req.user as any)?.id;

      if (!organizationId) return res.status(400).json({ error: 'Organization context required' });

      const movementData: any = {
        organizationId,
        warehouseId: data.warehouseId,
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        createdBy: userId || 'system',
      };
      if (data.notes) movementData.notes = data.notes;
      if (data.referenceId) movementData.referenceId = data.referenceId;
      
      const movement = await inventoryService.createStockMovement(movementData);

      return res.status(201).json(movement);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async transferStock(req: Request, res: Response) {
    try {
      const schema = z.object({
        fromWarehouseId: z.string(),
        toWarehouseId: z.string(),
        productId: z.string(),
        quantity: z.number().positive(),
      });

      const data = schema.parse(req.body);
      const organizationId = (req.user as any)?.organizationId;
      const userId = (req.user as any)?.id;

      if (!organizationId) return res.status(400).json({ error: 'Organization context required' });

      await inventoryService.transferStock(
        organizationId,
        data.fromWarehouseId,
        data.toWarehouseId,
        data.productId,
        data.quantity,
        userId || 'system'
      );

      return res.json({ success: true, message: 'Transfer completed' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export const inventoryController = new InventoryController();

