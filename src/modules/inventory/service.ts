import { db } from '@/db/index.js';
import { products, stockLevels, stockMovements, warehouses } from '@/db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface StockMovementDTO {
  organizationId: string;
  warehouseId: string;
  productId: string;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  quantity: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  createdBy: string;
}

export class InventoryService {

  /**
   * Stok Hareketi Ekle (Giriş/Çıkış)
   * Otomatik olarak depo stok seviyesini günceller.
   */
  async createStockMovement(data: StockMovementDTO) {
    return await db.transaction(async (tx) => {
      // 1. Hareketi kaydet
      const [movement] = await tx.insert(stockMovements).values({
        id: uuidv4(),
        organizationId: data.organizationId,
        warehouseId: data.warehouseId,
        productId: data.productId,
        type: data.type,
        quantity: data.quantity.toString(),
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        notes: data.notes,
        createdBy: data.createdBy,
      }).returning();

      // 2. Stok seviyesini güncelle
      // Giriş (+) veya Çıkış (-) yönünü belirle
      let change = data.quantity;
      if (data.type === 'out') {
        change = -data.quantity;
      }
      // Transfer veya adjustment durumları iş mantığına göre değişebilir. 
      // Şimdilik basit mantık: 'in' artırır, 'out' azaltır.

      // Mevcut stok kaydı var mı?
      const [currentStock] = await tx.select()
        .from(stockLevels)
        .where(and(
          eq(stockLevels.warehouseId, data.warehouseId),
          eq(stockLevels.productId, data.productId)
        ));

      if (currentStock) {
        // Güncelle
        const newQuantity = Number(currentStock.quantity) + change;
        await tx.update(stockLevels)
          .set({ quantity: newQuantity.toString(), updatedAt: new Date() })
          .where(eq(stockLevels.id, currentStock.id));
      } else {
        // Yeni kayıt oluştur
        await tx.insert(stockLevels).values({
          id: uuidv4(),
          organizationId: data.organizationId,
          warehouseId: data.warehouseId,
          productId: data.productId,
          quantity: change.toString()
        });
      }

      return movement;
    });
  }

  /**
   * Stok Transferi (Depolar Arası)
   */
  async transferStock(
    orgId: string, 
    fromWarehouseId: string, 
    toWarehouseId: string, 
    productId: string, 
    quantity: number, 
    userId: string
  ) {
    return await db.transaction(async (tx) => {
      // Çıkış Hareketi
      await this.createStockMovement({
        organizationId: orgId,
        warehouseId: fromWarehouseId,
        productId,
        type: 'out', // Transfer out
        quantity,
        referenceType: 'transfer',
        notes: `Transfer to ${toWarehouseId}`,
        createdBy: userId
      });

      // Giriş Hareketi
      await this.createStockMovement({
        organizationId: orgId,
        warehouseId: toWarehouseId,
        productId,
        type: 'in', // Transfer in
        quantity,
        referenceType: 'transfer',
        notes: `Transfer from ${fromWarehouseId}`,
        createdBy: userId
      });

      return { success: true };
    });
  }
}

export const inventoryService = new InventoryService();

