"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, CreditCard, DollarSign, Users, Loader2, Sparkles, AlertTriangle } from "lucide-react"
import { authenticatedGet } from "@/lib/api"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { KPICard } from "@/components/dashboard/kpi-card"


interface DashboardSummary {
  finance: {
    totalRevenue: number;
    pendingPayments: number;
    recentTransactions: any[];
    monthlyRevenue: { name: string; total: number }[];
  };
  system: {
    uptime: number;
    activeUsers: number;
    openTickets: number;
    activeAlerts?: number;
  };
  iot: {
    poolTemp: number;
    phLevel: number;
    chlorine: number;
  };
  ai?: {
    prediction: {
      predictedRevenue: number;
      confidence: number;
      reasoning: string;
    };
  };
}

// Fetch function for React Query
const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  return await authenticatedGet<DashboardSummary>("/api/v1/ceo/summary");
}

export default function DashboardPage() {
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true,
  });

  if (isError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center flex-col gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-muted-foreground">
          Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">CEO Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Toplam Ciro"
          value={`₺${summary?.finance.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '0,00'}`}
          icon={<DollarSign className="h-4 w-4" />}
          loading={isLoading}
          trend={{ value: 20.1, label: "geçen aydan", direction: "up" }}
          description="geçen aydan"
        />
        <KPICard
          title="Aktif Kullanıcı"
          value={`+${summary?.system.activeUsers ?? 0}`}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
          description="+180 geçen aydan"
        />
        <KPICard
          title="Bekleyen Tahsilat"
          value={`₺${summary?.finance.pendingPayments.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '0,00'}`}
          icon={<CreditCard className="h-4 w-4" />}
          loading={isLoading}
          description={`${summary?.system.openTickets ?? 0} açık destek talebi`}
        />
        <KPICard
          title="Sistem Sağlığı"
          value={`%${summary?.system.uptime ?? 0}`}
          icon={<Activity className="h-4 w-4" />}
          loading={isLoading}
          description={`IoT: ${summary?.iot.poolTemp ?? 0}°C | pH ${summary?.iot.phLevel ?? 0}`}
        />
      </div>

      {/* Jarvis AI Insights */}
      {summary?.ai && (
        <div className="grid gap-4 md:grid-cols-1">
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-indigo-200 dark:border-indigo-800">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
              <CardTitle className="text-base font-semibold text-indigo-800 dark:text-indigo-200">JARVIS AI Öngörüsü</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-indigo-900 dark:text-indigo-100 mb-1 font-medium">
                    Finansal Tahmin (Gelecek Ay)
                  </p>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    ₺{summary.ai.prediction.predictedRevenue.toLocaleString('tr-TR')} 
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (Güven Skoru: %{(summary.ai.prediction.confidence * 100).toFixed(0)})
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {summary.ai.prediction.reasoning}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Gelir Trendi</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={summary?.finance.monthlyRevenue || []}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₺${value}`}
                />
                <Tooltip 
                  contentStyle={{ background: "#333", border: "none" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="total" fill="#adfa1d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Son İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {summary?.finance.recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz işlem yok.</p>
              ) : (
                summary?.finance.recentTransactions.map((tx: any) => (
                  <div className="flex items-center" key={tx.id}>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      {Number(tx.amount) > 0 ? '+' : ''}₺{Number(tx.amount).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
