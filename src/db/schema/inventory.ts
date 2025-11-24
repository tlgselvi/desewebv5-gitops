import { pgTable, text, timestamp, boolean, integer, decimal, uuid, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations, users } from './saas';

// Warehouses (Depolar)
export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  location: text('location'),
  isMain: boolean('is_main').default(false), // Ana depo mu?
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('warehouses_org_idx').on(table.organizationId),
}));

// Products & Services (Ürünler ve Hizmetler)
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }), // Stok Kodu
  barcode: varchar('barcode', { length: 100 }),
  
  type: varchar('type', { length: 50 }).default('product').notNull(), // product, service, digital
  category: varchar('category', { length: 100 }),
  
  salesPrice: decimal('sales_price', { precision: 15, scale: 2 }).default('0.00'),
  purchasePrice: decimal('purchase_price', { precision: 15, scale: 2 }).default('0.00'),
  taxRate: integer('tax_rate').default(20),
  currency: varchar('currency', { length: 3 }).default('TRY'),
  
  unit: varchar('unit', { length: 20 }).default('pcs'), // adet, kg, lt, saat
  
  minStockLevel: integer('min_stock_level').default(0),
  trackStock: boolean('track_stock').default(true),
  
  description: text('description'),
  imageUrl: text('image_url'),
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('products_org_idx').on(table.organizationId),
  skuIdx: uniqueIndex('products_sku_idx').on(table.organizationId, table.sku),
  barcodeIdx: index('products_barcode_idx').on(table.organizationId, table.barcode),
}));

// Stock Levels (Depo Bazlı Stok Miktarları)
export const stockLevels = pgTable('stock_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  
  quantity: decimal('quantity', { precision: 15, scale: 4 }).default('0.0000').notNull(),
  
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('stock_levels_org_idx').on(table.organizationId),
  productWarehouseIdx: uniqueIndex('stock_levels_pw_idx').on(table.warehouseId, table.productId),
}));

// Stock Movements (Stok Hareketleri)
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  
  type: varchar('type', { length: 50 }).notNull(), // in, out, transfer, adjustment
  quantity: decimal('quantity', { precision: 15, scale: 4 }).notNull(),
  
  referenceId: uuid('reference_id'), // invoice_id, order_id
  referenceType: varchar('reference_type', { length: 50 }),
  
  notes: text('notes'),
  
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('stock_movements_org_idx').on(table.organizationId),
  productIdx: index('stock_movements_product_idx').on(table.productId),
  dateIdx: index('stock_movements_date_idx').on(table.createdAt),
}));

// Relations
export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [warehouses.organizationId],
    references: [organizations.id],
  }),
  stockLevels: many(stockLevels),
  movements: many(stockMovements),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  stockLevels: many(stockLevels),
  movements: many(stockMovements),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [stockLevels.warehouseId],
    references: [warehouses.id],
  }),
  product: one(products, {
    fields: [stockLevels.productId],
    references: [products.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [stockMovements.warehouseId],
    references: [warehouses.id],
  }),
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  creator: one(users, {
    fields: [stockMovements.createdBy],
    references: [users.id],
  }),
}));

