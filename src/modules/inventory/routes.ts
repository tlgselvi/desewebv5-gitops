import { Router, type Router as ExpressRouter } from 'express';
import { inventoryController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { db } from '@/db/index.js';
import { products, stockLevels, warehouses } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router: ExpressRouter = Router();

router.use(authenticate);

// Products
router.get('/products', asyncHandler(async (req, res) => {
  const orgId = (req.user as any)?.organizationId;
  const result = await db.select().from(products).where(eq(products.organizationId, orgId));
  res.json(result);
}));

// Stock Movements
router.post('/movements', (req, res) => inventoryController.addStockMovement(req, res));
router.post('/transfer', (req, res) => inventoryController.transferStock(req, res));

// Stock Levels View
router.get('/levels', asyncHandler(async (req, res) => {
  const orgId = (req.user as any)?.organizationId;
  
  const result = await db.select({
    productName: products.name,
    sku: products.sku,
    warehouse: warehouses.name,
    quantity: stockLevels.quantity
  })
  .from(stockLevels)
  .innerJoin(products, eq(stockLevels.productId, products.id))
  .innerJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
  .where(eq(stockLevels.organizationId, orgId));

  res.json(result);
}));

export const inventoryRoutes = router;
