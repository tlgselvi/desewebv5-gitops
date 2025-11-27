import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { InventoryController } from '@/modules/inventory/controller.js';
import { inventoryService } from '@/modules/inventory/service.js';

// Mock dependencies
vi.mock('@/modules/inventory/service.js', () => ({
  inventoryService: {
    createStockMovement: vi.fn(),
    transferStock: vi.fn(),
  },
}));

vi.mock('@/db/index.js', () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock('@/db/schema/index.js', () => ({
  products: {},
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid'),
}));

describe('Inventory Controller - Error Handling Branch Tests', () => {
  let controller: InventoryController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new InventoryController();

    mockReq = {
      params: {},
      body: {},
      user: {
        id: 'user-1',
        organizationId: 'org-1',
      } as any,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('createProduct', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = {
        name: 'Test Product',
      };

      await controller.createProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization context required' });
    });

    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        // Missing required name field
        sku: 'SKU-001',
      };

      await controller.createProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle database error and return 400', async () => {
      mockReq.body = {
        name: 'Test Product',
      };
      const { db } = await import('@/db/index.js');
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as any);

      await controller.createProduct(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('addStockMovement', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = {
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: 10,
      };

      await controller.addStockMovement(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization context required' });
    });

    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        // Missing required fields
        warehouseId: 'warehouse-1',
      };

      await controller.addStockMovement(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when quantity is not positive', async () => {
      mockReq.body = {
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: -10, // Invalid: not positive
      };

      await controller.addStockMovement(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service error and return 400', async () => {
      mockReq.body = {
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: 10,
      };
      vi.mocked(inventoryService.createStockMovement).mockRejectedValue(new Error('Service error'));

      await controller.addStockMovement(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 201 when movement is created successfully', async () => {
      mockReq.body = {
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: 10,
      };
      const mockMovement = { id: 'movement-1', quantity: 10 };
      vi.mocked(inventoryService.createStockMovement).mockResolvedValue(mockMovement as any);

      await controller.addStockMovement(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockMovement);
    });
  });

  describe('transferStock', () => {
    it('should return 400 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = {
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        productId: 'product-1',
        quantity: 10,
      };

      await controller.transferStock(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization context required' });
    });

    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        // Missing required fields
        fromWarehouseId: 'warehouse-1',
      };

      await controller.transferStock(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when quantity is not positive', async () => {
      mockReq.body = {
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        productId: 'product-1',
        quantity: 0, // Invalid: not positive
      };

      await controller.transferStock(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service error and return 400', async () => {
      mockReq.body = {
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        productId: 'product-1',
        quantity: 10,
      };
      vi.mocked(inventoryService.transferStock).mockRejectedValue(new Error('Insufficient stock'));

      await controller.transferStock(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return success when transfer is completed', async () => {
      mockReq.body = {
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        productId: 'product-1',
        quantity: 10,
      };
      vi.mocked(inventoryService.transferStock).mockResolvedValue(undefined);

      await controller.transferStock(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Transfer completed' });
    });
  });
});

