import { Router, type Router as ExpressRouter } from 'express';
import { inventoryController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';
import { requireModulePermission } from '@/middleware/rbac.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';
import { db } from '@/db/index.js';
import { products, stockLevels, warehouses } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router: ExpressRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory Management (Products, Stock Levels, Movements, Transfers)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         sku:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         unitPrice:
 *           type: number
 *         costPrice:
 *           type: number
 *         status:
 *           type: string
 *           enum: [active, inactive, discontinued]
 *     CreateProductDTO:
 *       type: object
 *       required:
 *         - name
 *         - sku
 *       properties:
 *         name:
 *           type: string
 *         sku:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         unitPrice:
 *           type: number
 *         costPrice:
 *           type: number
 *     StockLevel:
 *       type: object
 *       properties:
 *         productName:
 *           type: string
 *         sku:
 *           type: string
 *         warehouse:
 *           type: string
 *         quantity:
 *           type: number
 *     StockMovement:
 *       type: object
 *       required:
 *         - productId
 *         - warehouseId
 *         - quantity
 *         - type
 *       properties:
 *         productId:
 *           type: string
 *           format: uuid
 *         warehouseId:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: number
 *         type:
 *           type: string
 *           enum: [in, out, adjustment]
 *         reason:
 *           type: string
 */

router.use(authenticate);
router.use(setRLSContextMiddleware); // Set RLS context for tenant isolation
// Module-based RBAC: Inventory modülü için read permission gerekli
router.use(requireModulePermission('inventory', 'read'));

/**
 * @swagger
 * /api/v1/inventory/products:
 *   get:
 *     summary: Get all products
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Products
router.get('/products', asyncHandler(async (req, res) => {
  const orgId = (req.user as any)?.organizationId;
  const result = await db.select().from(products).where(eq(products.organizationId, orgId));
  res.json(result);
}));

/**
 * @swagger
 * /api/v1/inventory/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductDTO'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/products', requireModulePermission('inventory', 'write'), (req, res) => inventoryController.createProduct(req, res));

/**
 * @swagger
 * /api/v1/inventory/movements:
 *   post:
 *     summary: Add stock movement (in/out/adjustment)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StockMovement'
 *     responses:
 *       201:
 *         description: Stock movement recorded successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Stock Movements
router.post('/movements', requireModulePermission('inventory', 'write'), (req, res) => inventoryController.addStockMovement(req, res));

/**
 * @swagger
 * /api/v1/inventory/transfer:
 *   post:
 *     summary: Transfer stock between warehouses
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - fromWarehouseId
 *               - toWarehouseId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               fromWarehouseId:
 *                 type: string
 *                 format: uuid
 *               toWarehouseId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: number
 *                 minimum: 0.01
 *     responses:
 *       200:
 *         description: Stock transferred successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/transfer', requireModulePermission('inventory', 'write'), (req, res) => inventoryController.transferStock(req, res));

/**
 * @swagger
 * /api/v1/inventory/levels:
 *   get:
 *     summary: Get stock levels for all products
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock levels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StockLevel'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
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
