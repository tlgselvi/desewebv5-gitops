import { authenticatedGet, authenticatedPost } from "@/lib/api";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  description?: string;
  unit?: string;
  price?: number;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockLevel {
  productName: string;
  sku: string;
  warehouse: string;
  quantity: number;
}

export interface CreateProductDTO {
  name: string;
  sku: string;
  category?: string;
  description?: string;
  unit?: string;
  price?: number;
}

export interface StockMovementDTO {
  warehouseId: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  notes?: string;
  referenceId?: string;
}

export interface TransferStockDTO {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
}

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

