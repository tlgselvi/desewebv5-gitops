"use client";

import McpLayout from "@/components/layout/McpLayout";
import { McpSection } from "@/components/mcp/mcp-section";
import { HealthCheckPanel } from "@/components/mcp/health-check-panel";
import { MetricCard } from "@/components/mcp/metric-card";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Cpu,
  MemoryStick,
  Network,
  PieChart,
  Radar,
  Shield,
  ShieldCheck,
} from "lucide-react";
import AlertDashboard from "@/components/aiops/AlertDashboard";
import DriftPanel from "@/components/aiops/DriftPanel";
import InsightsPanel from "@/components/aiops/InsightsPanel";
import ReplayTimeline from "@/components/aiops/ReplayTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useState } from "react";
import { authenticatedGet } from "@/lib/api";

type ModuleName = "mubot" | "finbot" | "aiops" | "observability";

type HealthCheckDto = {
  serviceName: string;
  status: string;
  lastChecked: string;
};

type MetricChangeType = "increase" | "decrease" | "neutral";

type MetricIconKey = "Cpu" | "MemoryStick" | "AlertTriangle" | "Network";

type MetricDto = {
  icon: MetricIconKey;
  title: string;
  value: string;
  change?: string;
  changeType?: MetricChangeType;
  footerText?: string;
};

type McpDashboardDto = {
  module: ModuleName;
  generatedAt: string;
  healthChecks: HealthCheckDto[];
  metrics: MetricDto[];
};

export default function AIOpsPage() {
  const [dashboardData, setDashboardData] = useState<McpDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const metricIconMap = useMemo(
    () => ({
      Cpu,
      MemoryStick,
      AlertTriangle,
      Network,
    }),
    [],
  );

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await authenticatedGet<McpDashboardDto>("/api/v1/mcp/dashboard/aiops");
        setDashboardData(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Veri yüklenirken bir hata oluştu.";
        // Handle specific auth error for better user feedback
        if (message.includes("401") || message.includes("token not found") || message.includes("Session expired")) {
          setError("Yetkilendirme hatası. Lütfen tekrar giriş yapın.");
        } else {
          setError(message);
        }
        console.error("AIOps dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return (
    <McpLayout
      title="Jarvis AIOps MCP · Operasyon Kontrol Merkezi"
      subtitle="Kyverno politikaları, ArgoCD senkronizasyonu ve Prometheus alarm zincirini tek panelde topla"
      footerNote="Jarvis otomasyon zinciri alarm verilerini 60 saniyede bir yeniden işler"
    >
      <div className="space-y-12">
        <McpSection
          variant="primary"
          kicker="Kyverno Stabilizasyonu · v6.8.1"
          title="Jarvis AIOps Kontrol Merkezi"
          description="Kyverno politikaları, ArgoCD senkronizasyonu ve Prometheus alarm zincirini tek ekranda takip edin. İşletim sürprizlerini azaltmak için drift ve otomasyon sinyallerini gerçek zamanlı olarak yönetin."
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="primary" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Drift Analizini Aç
              </Button>
              <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900 dark:text-blue-300">
                <Clock className="h-4 w-4" />
                Son Otomasyon Raporu
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Badge variant="success" className="justify-center">
              Kyverno senkron
            </Badge>
            <Badge variant="warning" className="justify-center">
              ArgoCD manuel sync bekliyor
            </Badge>
            <Badge
              variant="outline"
              className="justify-center border-emerald-200 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-200"
            >
              Redis cache aktif
            </Badge>
            <Badge
              variant="outline"
              className="justify-center border-blue-200 text-blue-700 dark:border-blue-500/40 dark:text-blue-200"
            >
              MCP Faz 1 revizyonu
            </Badge>
          </div>
        </McpSection>

        <McpSection
          variant="success"
          title="Sistem Sağlığı"
          description="AIOps ve bağlı servislerin son sağlık kontrol özetleri."
          icon={<Shield className="h-5 w-5 text-emerald-500" />}
          footerNote="Veri kaynağı: AIOps health endpoint, Anomaly Detector telemetrisi."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                ))
              : error
              ? (
                  <p className="col-span-full text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                )
              : dashboardData?.healthChecks.map((item) => (
                  <HealthCheckPanel
                    key={item.serviceName}
                    serviceName={item.serviceName}
                    status={item.status}
                    lastChecked={item.lastChecked}
                  />
                ))}
          </div>
        </McpSection>

        <McpSection
          variant="primary"
          title="Sistemsel İzleme"
          description="Altyapı ve AIOps metriklerinin anlık durumu."
          icon={<PieChart className="h-5 w-5 text-blue-500" />}
          footerNote="Veri kaynakları: Prometheus · Tempo · Jarvis AIOps olay günlükleri."
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full rounded-2xl" />
                ))
              : error
              ? (
                  <p className="col-span-full text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                )
              : dashboardData?.metrics.map((item) => {
                  const IconComponent = metricIconMap[item.icon] ?? Cpu;
                  return (
                    <MetricCard
                      key={item.title}
                      icon={IconComponent}
                      title={item.title}
                      value={item.value}
                      change={item.change}
                      changeType={item.changeType}
                      footerText={item.footerText}
                    />
                  );
                })}
          </div>
        </McpSection>

        <McpSection
          title="Drift ve Otomasyon Durumu"
          description="Jarvis otomasyon zinciri ve Kyverno policy enforcement akışında tespit edilen son durum."
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <DriftPanel />
              <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard
                  title="Prometheus drift alarmı"
                  value="1 kritik"
                  description="Kyverno enforce edilen policy sapması"
                  icon={<Radar className="h-6 w-6" />}
                  trend={{ value: 12, direction: "down" }}
                  variant="primary"
                />
                <KpiCard
                  title="Auto-remediation başarı oranı"
                  value="92%"
                  description="Jarvis otomasyon zinciri son 24 saat"
                  icon={<ShieldCheck className="h-6 w-6" />}
                  trend={{ value: 8, direction: "up" }}
                />
              </div>
            </div>
            <div className="space-y-4">
              <KpiCard
                title="ArgoCD uygulama senkronizasyonu"
                value="Manual"
                description="Security app sync'i manuel tetiklendi"
                icon={<Cpu className="h-6 w-6" />}
                trend={{ value: 5, direction: "down" }}
              />
              <KpiCard
                title="Prometheus metrik okuma süresi"
                value="640ms"
                description="Kyverno CRD parse süresi · cached"
                icon={<Clock className="h-6 w-6" />}
              />
            </div>
          </div>
        </McpSection>

        <McpSection
          title="Alarm Analizi ve Zaman Çizelgesi"
          description="Drift insights ve Jarvis replay timeline bileşenleri güncel verilerle besleniyor."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InsightsPanel />
            <ReplayTimeline />
          </div>
        </McpSection>

        <McpSection
          variant="warning"
          title="Canlı Alarm Panosu"
          description="Prometheus, Kyverno ve ArgoCD kaynaklı uyarılar tek akış altında takip ediliyor."
        >
          <AlertDashboard />
        </McpSection>
      </div>
    </McpLayout>
  );
}

