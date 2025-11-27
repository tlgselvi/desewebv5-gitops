/**
 * Inventory Types
 * 
 * Type definitions for inventory and stock management operations.
 */

// =============================================================================
// PRODUCT TYPES
// =============================================================================

/**
 * Product status
 */
export type ProductStatus = 'active' | 'inactive' | 'discontinued';

/**
 * Product record
 */
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  description?: string;
  unit?: string;
  price?: number;
  cost?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  status?: ProductStatus;
  imageUrl?: string;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create product payload
 */
export interface CreateProductDTO {
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  description?: string;
  unit?: string;
  price?: number;
  cost?: number;
  minStockLevel?: number;
}

/**
 * Update product payload
 */
export interface UpdateProductDTO {
  name?: string;
  category?: string;
  description?: string;
  unit?: string;
  price?: number;
  cost?: number;
  minStockLevel?: number;
  status?: ProductStatus;
}

// =============================================================================
// WAREHOUSE TYPES
// =============================================================================

/**
 * Warehouse record
 */
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  capacity?: number;
  isDefault?: boolean;
  isActive: boolean;
  organizationId: string;
}

// =============================================================================
// STOCK TYPES
// =============================================================================

/**
 * Stock level record
 */
export interface StockLevel {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouse: string;
  quantity: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  lastUpdated?: string;
}

/**
 * Stock movement type
 */
export type StockMovementType = 'in' | 'out' | 'adjustment' | 'transfer';

/**
 * Stock movement record
 */
export interface StockMovement {
  id: string;
  productId: string;
  productName?: string;
  warehouseId: string;
  warehouseName?: string;
  type: StockMovementType;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  notes?: string;
  referenceId?: string;
  referenceType?: string;
  createdBy?: string;
  createdAt: string;
}

/**
 * Stock movement payload
 */
export interface StockMovementDTO {
  warehouseId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  notes?: string;
  referenceId?: string;
  referenceType?: string;
}

/**
 * Stock transfer payload
 */
export interface TransferStockDTO {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

// =============================================================================
// INVENTORY SUMMARY TYPES
// =============================================================================

/**
 * Inventory summary for dashboard
 */
export interface InventorySummary {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentMovements?: StockMovement[];
}

/**
 * Low stock alert
 */
export interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  warehouseId: string;
  warehouseName: string;
}

// =============================================================================
// CATEGORY TYPES
// =============================================================================

/**
 * Product category
 */
export interface ProductCategory {
  id: string;
  name: string;
  code?: string;
  parentId?: string;
  description?: string;
  productCount?: number;
}

