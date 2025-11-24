"use client"

import { useEffect, useState } from "react"
import { financeService, type FinancialSummary } from "@/services/finance"
import { CreateInvoiceDialog } from "@/components/finance/create-invoice-dialog"
import { ExchangeRatesCard } from "@/components/finance/exchange-rates"
import { Loader2 } from "lucide-react"

export default function FinancePage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await financeService.getSummary()
        setSummary(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finans Yönetimi</h1>
          <p className="text-muted-foreground">
            Nakit akışı, faturalar ve cari hesap takibi.
          </p>
        </div>
        <CreateInvoiceDialog />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Ciro Kartı */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Toplam Ciro</div>
          <div className="text-2xl font-bold flex items-center">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              `₺${summary?.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '0,00'}`
            )}
          </div>
        </div>

        {/* Bekleyen Ödemeler Kartı */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Bekleyen Ödemeler</div>
          <div className="text-2xl font-bold flex items-center text-orange-600">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              `₺${summary?.pendingPayments.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '0,00'}`
            )}
          </div>
        </div>

        {/* Döviz Kurları */}
        <div className="md:col-span-2 lg:col-span-2">
             <ExchangeRatesCard />
        </div>
      </div>
      
      <div className="rounded-md border border-dashed p-8 text-center">
        {loading ? (
          <p>Veriler yükleniyor...</p>
        ) : (
          <p className="text-muted-foreground">
            Sistem şu an {summary ? 'aktif' : 'pasif'} durumda. <br/>
            Yeni fatura oluşturmak için yukarıdaki "Yeni Ekle" butonunu kullanın.
          </p>
        )}
      </div>
    </div>
  )
}
