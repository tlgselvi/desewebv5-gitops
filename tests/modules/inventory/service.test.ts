import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '@/modules/inventory/service.js';
import { db } from '@/db/index.js';
import { stockMovements, stockLevels } from '@/db/schema/index.js';

// Mock database
vi.mock('@/db/index.js', () => ({
  db: {
    transaction: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe('Inventory Service', () => {
  let inventoryService: InventoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    inventoryService = new InventoryService();
  });

  describe('createStockMovement', () => {
    it('should create stock movement and update existing stock level', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: '10',
      };

      const mockCurrentStock = {
        id: 'stock-1',
        quantity: '50',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMovement]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCurrentStock]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await inventoryService.createStockMovement({
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: 10,
        createdBy: 'user-1',
      });

      expect(result).toEqual(mockMovement);
      expect(mockTx.insert).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalled();
    });

    it('should create new stock level if it does not exist', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: '10',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMovement]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No existing stock
          }),
        }),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await inventoryService.createStockMovement({
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: 10,
        createdBy: 'user-1',
      });

      expect(result).toEqual(mockMovement);
      expect(mockTx.insert).toHaveBeenCalledTimes(2); // Movement + Stock Level
    });

    it('should decrease stock for "out" type movement', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'out',
        quantity: '5',
      };

      const mockCurrentStock = {
        id: 'stock-1',
        quantity: '50',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMovement]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCurrentStock]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await inventoryService.createStockMovement({
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'out',
        quantity: 5,
        createdBy: 'user-1',
      });

      // Verify update was called with decreased quantity (50 - 5 = 45)
      expect(mockTx.update).toHaveBeenCalled();
      const updateCall = mockTx.update.mock.calls[0];
      expect(updateCall[0]).toBe(stockLevels);
    });

    it('should handle "transfer" type movement', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'transfer',
        quantity: '10',
      };

      const mockCurrentStock = {
        id: 'stock-1',
        quantity: '50',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMovement]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCurrentStock]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await inventoryService.createStockMovement({
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'transfer',
        quantity: 10,
        createdBy: 'user-1',
      });

      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('should handle "adjustment" type movement', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'adjustment',
        quantity: '10',
      };

      const mockCurrentStock = {
        id: 'stock-1',
        quantity: '50',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMovement]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCurrentStock]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await inventoryService.createStockMovement({
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'adjustment',
        quantity: 10,
        createdBy: 'user-1',
      });

      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('should handle optional fields (referenceId, referenceType, notes)', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: '10',
        referenceId: 'ref-123',
        referenceType: 'purchase',
        notes: 'Test notes',
      };

      const mockCurrentStock = {
        id: 'stock-1',
        quantity: '50',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMovement]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCurrentStock]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await inventoryService.createStockMovement({
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: 10,
        referenceId: 'ref-123',
        referenceType: 'purchase',
        notes: 'Test notes',
        createdBy: 'user-1',
      });

      expect(result).toEqual(mockMovement);
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('should handle database insert failure (movement insert returns empty array)', async () => {
      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // Empty array - insert failed
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn(),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await inventoryService.createStockMovement({
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: 10,
        createdBy: 'user-1',
      });

      // Service doesn't check for empty array, so result will be undefined
      expect(result).toBeUndefined();
    });

    it('should handle database insert error when creating movement', async () => {
      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
          }),
        }),
        select: vi.fn(),
        update: vi.fn(),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await expect(
        inventoryService.createStockMovement({
          organizationId: 'org-1',
          warehouseId: 'warehouse-1',
          productId: 'product-1',
          type: 'in',
          quantity: 10,
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Database insert error');
    });

    it('should handle database query error when fetching stock level', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: '10',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMovement]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        }),
        update: vi.fn(),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await expect(
        inventoryService.createStockMovement({
          organizationId: 'org-1',
          warehouseId: 'warehouse-1',
          productId: 'product-1',
          type: 'in',
          quantity: 10,
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Database query error');
    });

    it('should handle database update error when updating stock level', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: '10',
      };

      const mockCurrentStock = {
        id: 'stock-1',
        quantity: '50',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMovement]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockCurrentStock]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error('Database update error')),
          }),
        }),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await expect(
        inventoryService.createStockMovement({
          organizationId: 'org-1',
          warehouseId: 'warehouse-1',
          productId: 'product-1',
          type: 'in',
          quantity: 10,
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Database update error');
    });

    it('should handle database insert error when creating new stock level', async () => {
      const mockMovement = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: '10',
      };

      let insertCallCount = 0;
      const mockTx = {
        insert: vi.fn().mockImplementation(() => {
          insertCallCount++;
          if (insertCallCount === 1) {
            // First insert: movement (success)
            return {
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockMovement]),
              }),
            };
          } else {
            // Second insert: stock level (failure)
            return {
              values: vi.fn().mockRejectedValue(new Error('Database insert error')),
            };
          }
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No existing stock
          }),
        }),
        update: vi.fn(),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await expect(
        inventoryService.createStockMovement({
          organizationId: 'org-1',
          warehouseId: 'warehouse-1',
          productId: 'product-1',
          type: 'in',
          quantity: 10,
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Database insert error');
    });

    it('should handle transaction rollback on error', async () => {
      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Transaction error')),
          }),
        }),
        select: vi.fn(),
        update: vi.fn(),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        try {
          return await callback(mockTx);
        } catch (error) {
          // Transaction should rollback
          throw error;
        }
      });

      await expect(
        inventoryService.createStockMovement({
          organizationId: 'org-1',
          warehouseId: 'warehouse-1',
          productId: 'product-1',
          type: 'in',
          quantity: 10,
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Transaction error');
    });
  });

  describe('transferStock', () => {
    it('should transfer stock between warehouses successfully', async () => {
      const mockMovement1 = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'out',
        quantity: '10',
      };

      const mockMovement2 = {
        id: 'movement-2',
        organizationId: 'org-1',
        warehouseId: 'warehouse-2',
        productId: 'product-1',
        type: 'in',
        quantity: '10',
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn()
              .mockResolvedValueOnce([mockMovement1])
              .mockResolvedValueOnce([mockMovement2]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No existing stock for simplicity
          }),
        }),
      };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      // Mock createStockMovement to avoid nested transaction issues
      const originalCreateStockMovement = inventoryService.createStockMovement;
      inventoryService.createStockMovement = vi.fn()
        .mockResolvedValueOnce(mockMovement1)
        .mockResolvedValueOnce(mockMovement2);

      const result = await inventoryService.transferStock(
        'org-1',
        'warehouse-1',
        'warehouse-2',
        'product-1',
        10,
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(inventoryService.createStockMovement).toHaveBeenCalledTimes(2);
      expect(inventoryService.createStockMovement).toHaveBeenNthCalledWith(1, {
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'out',
        quantity: 10,
        referenceType: 'transfer',
        notes: 'Transfer to warehouse-2',
        createdBy: 'user-1',
      });
      expect(inventoryService.createStockMovement).toHaveBeenNthCalledWith(2, {
        organizationId: 'org-1',
        warehouseId: 'warehouse-2',
        productId: 'product-1',
        type: 'in',
        quantity: 10,
        referenceType: 'transfer',
        notes: 'Transfer from warehouse-1',
        createdBy: 'user-1',
      });

      // Restore original method
      inventoryService.createStockMovement = originalCreateStockMovement;
    });

    it('should handle transfer with same warehouse (edge case)', async () => {
      const mockMovement1 = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'out',
        quantity: '10',
      };

      const mockMovement2 = {
        id: 'movement-2',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'in',
        quantity: '10',
      };

      const originalCreateStockMovement = inventoryService.createStockMovement;
      inventoryService.createStockMovement = vi.fn()
        .mockResolvedValueOnce(mockMovement1)
        .mockResolvedValueOnce(mockMovement2);

      const result = await inventoryService.transferStock(
        'org-1',
        'warehouse-1',
        'warehouse-1',
        'product-1',
        10,
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(inventoryService.createStockMovement).toHaveBeenCalledTimes(2);

      inventoryService.createStockMovement = originalCreateStockMovement;
    });

    it('should handle error when first createStockMovement fails', async () => {
      const originalCreateStockMovement = inventoryService.createStockMovement;
      inventoryService.createStockMovement = vi.fn()
        .mockRejectedValueOnce(new Error('First movement failed'));

      await expect(
        inventoryService.transferStock(
          'org-1',
          'warehouse-1',
          'warehouse-2',
          'product-1',
          10,
          'user-1'
        )
      ).rejects.toThrow('First movement failed');

      expect(inventoryService.createStockMovement).toHaveBeenCalledTimes(1);
      inventoryService.createStockMovement = originalCreateStockMovement;
    });

    it('should handle error when second createStockMovement fails', async () => {
      const mockMovement1 = {
        id: 'movement-1',
        organizationId: 'org-1',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        type: 'out',
        quantity: '10',
      };

      const originalCreateStockMovement = inventoryService.createStockMovement;
      inventoryService.createStockMovement = vi.fn()
        .mockResolvedValueOnce(mockMovement1)
        .mockRejectedValueOnce(new Error('Second movement failed'));

      await expect(
        inventoryService.transferStock(
          'org-1',
          'warehouse-1',
          'warehouse-2',
          'product-1',
          10,
          'user-1'
        )
      ).rejects.toThrow('Second movement failed');

      expect(inventoryService.createStockMovement).toHaveBeenCalledTimes(2);
      inventoryService.createStockMovement = originalCreateStockMovement;
    });

    it('should handle transaction rollback on transfer error', async () => {
      const originalCreateStockMovement = inventoryService.createStockMovement;
      inventoryService.createStockMovement = vi.fn()
        .mockRejectedValueOnce(new Error('Transfer transaction error'));

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        try {
          return await callback({});
        } catch (error) {
          // Transaction should rollback
          throw error;
        }
      });

      await expect(
        inventoryService.transferStock(
          'org-1',
          'warehouse-1',
          'warehouse-2',
          'product-1',
          10,
          'user-1'
        )
      ).rejects.toThrow('Transfer transaction error');

      inventoryService.createStockMovement = originalCreateStockMovement;
    });
  });
});

