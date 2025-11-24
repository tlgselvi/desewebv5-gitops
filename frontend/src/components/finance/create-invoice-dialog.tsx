"use client"

import { useState } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { financeService } from "@/services/finance"
import { useRouter } from "next/navigation"

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}

export function CreateInvoiceDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 20 }
  ])

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 20 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    // @ts-ignore
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((acc, item) => {
      const lineTotal = item.quantity * item.unitPrice
      const tax = lineTotal * (item.taxRate / 100)
      return acc + lineTotal + tax
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await financeService.createInvoice({
        accountId: '00000000-0000-0000-0000-000000000000', // TODO: Gerçek hesap ID'si seçilmeli
        type: 'sales',
        invoiceDate: new Date().toISOString(),
        items: items
      })
      setOpen(false)
      router.refresh() // Sayfayı yenile
    } catch (error) {
      alert('Hata: ' + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Fatura
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Yeni Satış Faturası</DialogTitle>
          <DialogDescription>
            Fatura detaylarını giriniz. Kaydettikten sonra PDF oluşturulacaktır.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Müşteri</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Yeni Müşteri</SelectItem>
                  <SelectItem value="cust_1">Ahmet Yılmaz A.Ş.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fatura Tarihi</Label>
              <Input type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Hizmet / Ürün Kalemleri</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Input 
                    placeholder="Açıklama" 
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input 
                    type="number" 
                    placeholder="Adet" 
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                    min="1"
                  />
                </div>
                <div className="col-span-3">
                  <Input 
                    type="number" 
                    placeholder="Fiyat" 
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Genel Toplam</div>
              <div className="text-2xl font-bold">
                ₺{calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Faturayı Oluştur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
