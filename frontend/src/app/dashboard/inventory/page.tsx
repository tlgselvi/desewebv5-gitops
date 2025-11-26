"use client"

import { useState, useEffect } from "react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { columns, Product } from "./columns"
import { Button } from "@/components/ui/button"
import { Plus, PackageSearch, ArrowUpRight, ArrowDownRight, AlertTriangle, RefreshCw, Loader2 } from "lucide-react"
import { KPICard } from "@/components/dashboard/kpi-card"
import { inventoryService, type Product as ApiProduct } from "@/services/inventory"
import { toast } from "sonner"
import { CreateProductDialog } from "@/components/inventory/create-product-dialog"

// Helper: API Product'ı UI Product'a dönüştür
const mapApiProductToUI = (apiProduct: ApiProduct, stockLevels: any[] = []): Product => {
  // Stock seviyesini bul - stockLevels'tan bu ürün için toplam stok miktarını hesapla
  const productStockLevels = stockLevels.filter(sl => sl.sku === apiProduct.sku);
  const totalStock = productStockLevels.reduce((sum, sl) => sum + parseFloat(sl.quantity?.toString() || "0"), 0);
  const stock = totalStock;
  
  // Min stock level'ı al (şimdilik varsayılan 10, ileride API'den gelecek)
  const minStock = 10; // TODO: apiProduct.minStockLevel'dan al
  
  let status: "active" | "low_stock" | "out_of_stock" = "active";
  if (stock === 0) status = "out_of_stock";
  else if (stock < minStock) status = "low_stock";

  return {
    id: apiProduct.id,
    name: apiProduct.name,
    sku: apiProduct.sku || "",
    category: apiProduct.category || "Genel",
    stock: stock,
    unit: apiProduct.unit || "ad",
    price: parseFloat(apiProduct.price?.toString() || apiProduct.salesPrice?.toString() || "0"),
    status: status,
  };
};

export default function InventoryPage() {
  const [data, setData] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [products, stockLevels] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getStockLevels(),
      ]);
      
      // API'den gelen ürünleri UI formatına dönüştür
      const mappedProducts = products.map(p => mapApiProductToUI(p, stockLevels));
      setData(mappedProducts);
      
      if (products.length === 0) {
        toast.info("Henüz ürün eklenmemiş. Yeni ürün eklemek için 'Yeni Ürün' butonunu kullanın.");
      }
    } catch (error) {
      console.error("Failed to fetch inventory data", error);
      toast.error("Ürünler yüklenirken bir hata oluştu");
      // Fallback: Boş array
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [])

  // Calculate KPI metrics
  const totalProducts = data.length
  const lowStock = data.filter(p => p.status === "low_stock").length
  const outOfStock = data.filter(p => p.status === "out_of_stock").length
  const totalValue = data.reduce((acc, curr) => acc + (curr.price * curr.stock), 0)

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stok Yönetimi</h1>
          <p className="text-muted-foreground">
            Ürünler, depolar ve envanter takibi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <CreateProductDialog onSuccess={fetchData} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Toplam Ürün"
          value={totalProducts}
          icon={<PackageSearch className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Envanter Değeri"
          value={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalValue)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          loading={isLoading}
        />
        <KPICard
          title="Azalan Stok"
          value={lowStock}
          icon={<AlertTriangle className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-yellow-600"
        />
        <KPICard
          title="Tükenen"
          value={outOfStock}
          icon={<ArrowDownRight className="h-4 w-4" />}
          loading={isLoading}
          valueClassName="text-red-600"
        />
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-hidden rounded-lg border bg-background shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            searchKey="name" 
            searchPlaceholder="Ürün adı ile ara..."
          />
        )}
      </div>
    </div>
  )
}
