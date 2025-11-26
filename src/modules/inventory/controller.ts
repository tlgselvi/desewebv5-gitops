import { Request, Response } from 'express';
import { inventoryService } from './service.js';
import { z } from 'zod';

export class InventoryController {

  async createProduct(req: Request, res: Response) {
    try {
      const schema = z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        unit: z.string().optional().default('pcs'),
        price: z.number().optional().default(0),
        salesPrice: z.number().optional(),
        purchasePrice: z.number().optional(),
        taxRate: z.number().optional().default(20),
        currency: z.string().optional().default('TRY'),
        minStockLevel: z.number().optional().default(0),
        trackStock: z.boolean().optional().default(true),
      });

      const data = schema.parse(req.body);
      const organizationId = (req.user as any)?.organizationId;
      const { db } = await import('@/db/index.js');
      const { products } = await import('@/db/schema/index.js');
      const { v4: uuidv4 } = await import('uuid');

      if (!organizationId) return res.status(400).json({ error: 'Organization context required' });

      const [product] = await db.insert(products).values({
        id: uuidv4(),
        organizationId,
        name: data.name,
        sku: data.sku || undefined,
        category: data.category || undefined,
        description: data.description || undefined,
        unit: data.unit || 'pcs',
        salesPrice: (data.salesPrice ?? data.price ?? 0).toString(),
        purchasePrice: (data.purchasePrice ?? data.price ?? 0).toString(),
        taxRate: data.taxRate || 20,
        currency: data.currency || 'TRY',
        minStockLevel: data.minStockLevel || 0,
        trackStock: data.trackStock !== false,
      }).returning();

      return res.status(201).json(product);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

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

