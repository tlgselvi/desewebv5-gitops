import { authenticatedGet, authenticatedPost } from "@/lib/api";
import { logger } from "@/lib/logger";
import type {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  Warehouse,
  StockLevel,
  StockMovement,
  StockMovementDTO,
  TransferStockDTO,
  InventorySummary,
  LowStockAlert,
} from "@/types/inventory";

// Re-export types for backward compatibility
export type {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  Warehouse,
  StockLevel,
  StockMovement,
  StockMovementDTO,
  TransferStockDTO,
  InventorySummary,
  LowStockAlert,
} from "@/types/inventory";

export const inventoryService = {
  /**
   * Tüm ürünleri getir
   */
  async getProducts(): Promise<Product[]> {
    try {
      return await authenticatedGet<Product[]>("/api/v1/inventory/products");
    } catch (error) {
      console.error("Failed to fetch products", error);
      return [];
    }
  },

  /**
   * Yeni ürün oluştur
   */
  async createProduct(data: CreateProductDTO): Promise<Product> {
    return await authenticatedPost<Product>("/api/v1/inventory/products", data);
  },

  /**
   * Stok seviyelerini getir
   */
  async getStockLevels(): Promise<StockLevel[]> {
    try {
      return await authenticatedGet<StockLevel[]>("/api/v1/inventory/levels");
    } catch (error) {
      console.error("Failed to fetch stock levels", error);
      return [];
    }
  },

  /**
   * Stok hareketi ekle (Giriş/Çıkış/Düzeltme)
   */
  async addStockMovement(data: StockMovementDTO): Promise<void> {
    return await authenticatedPost<void>("/api/v1/inventory/movements", data);
  },

  /**
   * Stok transferi (Depolar arası)
   */
  async transferStock(data: TransferStockDTO): Promise<void> {
    return await authenticatedPost<void>("/api/v1/inventory/transfer", data);
  }
};

