"use client"

import { useEffect, useState } from "react"
import { financeService, type FinancialSummary } from "@/services/finance"
import { CreateInvoiceDialog } from "@/components/finance/create-invoice-dialog"
import { ExchangeRatesCard } from "@/components/finance/exchange-rates"
import { KPICard } from "@/components/dashboard/kpi-card"
import { DollarSign, CreditCard } from "lucide-react"

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
        <KPICard
          title="Toplam Ciro"
          value={`₺${summary?.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '0,00'}`}
          icon={<DollarSign className="h-4 w-4" />}
          loading={loading}
        />

        {/* Bekleyen Ödemeler Kartı */}
        <KPICard
          title="Bekleyen Ödemeler"
          value={`₺${summary?.pendingPayments.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '0,00'}`}
          icon={<CreditCard className="h-4 w-4" />}
          loading={loading}
          valueClassName="text-orange-600"
        />

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
