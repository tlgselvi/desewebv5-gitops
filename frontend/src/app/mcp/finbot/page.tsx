"use client";

import McpLayout from "@/components/layout/McpLayout";
import { IncidentCard } from "@/components/mcp/incident-card";
import { HealthCheckPanel } from "@/components/mcp/health-check-panel";
import { MetricCard } from "@/components/mcp/metric-card";
import { McpSection } from "@/components/mcp/mcp-section";
import {
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  ClipboardList,
  Clock,
  Coins,
  Cpu,
  GitBranch,
  MemoryStick,
  PieChart,
  Shield,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useMemo, useState } from "react";

type ModuleName = "mubot" | "finbot" | "aiops" | "observability";

type HealthCheckDto = {
  serviceName: string;
  status: string;
  lastChecked: string;
};

type MetricChangeType = "increase" | "decrease" | "neutral";

type MetricIconKey = "Cpu" | "MemoryStick" | "Users" | "Clock";

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

const PRIORITY_STREAMS = [
  {
    title: "Gelir Akışı",
    owner: "Scenario Engine",
    description:
      "FinBot, SaaS ve SmartPool gelirlerini tekleştirip 90 günlük tahmin üretir.",
    status: "Aktif",
  },
  {
    title: "Operasyonel Giderler",
    owner: "MuBot",
    description:
      "Enerji + bakım giderlerini Redis cache üstünden 5 dk’da bir güncelliyor.",
    status: "İzleniyor",
  },
  {
    title: "Risk Havuzu",
    owner: "FinBot Risk Matrix",
    description:
      "Kyverno policy ihlalleri ve finansal risk skorlarını aynı grafikte bağlıyor.",
    status: "Analizde",
  },
] as const;

const SCENARIO_QUEUE = [
  {
    id: "FIN-204",
    topic: "Kur duyarlılığı · USD/TRY",
    window: "Son 14 gün",
    impact: "+4.2% gelir varyansı",
    status: "Çalışıyor",
  },
  {
    id: "FIN-198",
    topic: "SmartPool abonelik modeli",
    window: "Q1 2026",
    impact: "-2.1% churn",
    status: "Hazırlanıyor",
  },
  {
    id: "FIN-192",
    topic: "Grafana tüketim trendleri",
    window: "Son 30 gün",
    impact: "+1.6% maliyet tasarrufu",
    status: "Tamamlandı",
  },
] as const;

const IS_NON_PRODUCTION = process.env.NODE_ENV !== "production";

export default function FinBotPage() {
  const [dashboardData, setDashboardData] = useState<McpDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const metricIconMap = useMemo(
    () => ({
      Cpu,
      MemoryStick,
      Users,
      Clock,
    }),
    [],
  );

  const handlePublishTestEvent = useCallback(async () => {
    if (!IS_NON_PRODUCTION) {
      return;
    }

    try {
      const response = await fetch("/api/devtools/websocket/finbot/publish-test-event", {
        method: "POST",
      });

      if (!response.ok) {
        console.warn("Test WebSocket event publish failed", {
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (publishError) {
      console.warn("Test WebSocket event publish encountered an error", publishError);
    }
  }, []);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/mcp/dashboard/finbot", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`API isteği başarısız: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as McpDashboardDto;
        setDashboardData(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Veri yüklenirken bir hata oluştu.";
        setError(message);
        console.error("FinBot dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return (
    <McpLayout
      title="FinBot MCP · Finans Operasyonları"
      subtitle="Gelir projeksiyonları, bütçe planları ve risk simülasyonları tek akışta"
      footerNote="FinBot verileri Redis cache üzerinden her 5 saniyede güncellenir"
    >
      <div className="space-y-12">
        <McpSection
          variant="success"
          kicker="FinBot MCP · Finans Operasyonları"
          title="Finansal Planlama ve Senaryo Kontrolü"
          description="Gelir projeksiyonları, bütçe planlama ve risk simülasyonlarını tek panoda konsolide ediyoruz. Kyverno stabilizasyonu sonrası FinBot’un veri akışı Redis cache üzerinden 5 saniyede güncelleniyor."
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="primary" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Yeni Finans Senaryosu
              </Button>
              <Button variant="ghost" className="gap-2 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300">
                <GitBranch className="h-4 w-4" />
                Akış Grafiğini Aç
              </Button>
              {IS_NON_PRODUCTION ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  data-testid="publish-test-event-button"
                  onClick={handlePublishTestEvent}
                >
                  <Clock className="h-4 w-4" />
                  Test WebSocket Event
                </Button>
              ) : null}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Badge variant="success" className="justify-center">
              Forecast API · 12 ms
            </Badge>
            <Badge variant="warning" className="justify-center">
              Kyverno imza doğrulaması bekleniyor
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
              Finans raporu · v6.8.1
            </Badge>
          </div>
        </McpSection>

        <McpSection
          variant="success"
          title="Sistem Sağlığı"
          description="FinBot ve bağlı servislerin son sağlık kontrol özetleri."
          icon={<Shield className="h-5 w-5 text-emerald-500" />}
          footerNote="Veri kaynağı: FinBot health endpoint, Redis cache heartbeat, Forecast worker telemetrisi."
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
          description="Altyapı ve uygulama metriklerinin anlık durumu."
          icon={<PieChart className="h-5 w-5 text-blue-500" />}
          footerNote="Veri kaynakları: Prometheus · Tempo · Redis · Kyverno olay günlükleri."
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
          title="Kritik Finansal Göstergeler"
          description="FinBot Forecast Engine’den gelen son 30 günlük performans metrikleri."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              title="Gelir Tahmin Doğruluğu"
              value="96.4%"
              description="FinBot Forecast Engine · Son 30 gün"
              icon={<PieChart className="h-6 w-6" />}
              trend={{ value: 2.4, direction: "up" }}
              variant="primary"
            />
            <KpiCard
              title="Aylık Yinelenen Gelir"
              value="$382K"
              description="SmartPool + SaaS birleşik MRR"
              icon={<Coins className="h-6 w-6" />}
              trend={{ value: 3.1, direction: "up" }}
            />
            <KpiCard
              title="Operasyonel Giderler"
              value="$142K"
              description="MuBot gider matrisi · Kyverno onaylı"
              icon={<Banknote className="h-6 w-6" />}
              trend={{ value: 1.8, direction: "down" }}
            />
          </div>
        </McpSection>

        <div className="grid gap-8 lg:grid-cols-2">
          <McpSection
            title="Öncelikli Veri Akışları"
            description="FinBot senaryo motoru, Kyverno politikaları ile birlikte işletme gelir/gider akışlarını izler."
            footerNote="Veri kaynakları: Scenario Engine, MuBot, Risk Matrix"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PRIORITY_STREAMS.map((stream) => (
                <IncidentCard
                  key={stream.title}
                  title={stream.title}
                  description={stream.description}
                  status={stream.status}
                  meta={[
                    {
                      icon: <GitBranch className="h-3.5 w-3.5 text-emerald-500" />,
                      label: "Sorumlu",
                      value: stream.owner,
                    },
                  ]}
                />
              ))}
            </div>
          </McpSection>

          <McpSection
            title="Senaryo Kuyruğu"
            description="Redis üzerinden saniyelik olarak güncellenen FinBot senaryo görevleri."
            footerNote="Kyverno imzalı job’lar tamamlandığında otomatik olarak backlog’dan düşer."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SCENARIO_QUEUE.map((item) => (
                <IncidentCard
                  key={item.id}
                  id={item.id}
                  title={item.topic}
                  status={item.status}
                  meta={[
                    {
                      icon: <CalendarCheck className="h-3.5 w-3.5 text-blue-500" />,
                      label: "Zaman Penceresi",
                      value: item.window,
                    },
                    {
                      icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
                      label: "Etkisi",
                      value: item.impact,
                      tone: item.impact.includes("-") ? "negative" : "positive",
                    },
                  ]}
                />
              ))}
            </div>
          </McpSection>
        </div>

        <McpSection
          title="Operasyonel Gözlemler"
          description="FinBot senaryolarının uyum ve gözlem başlıkları."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Kyverno Uyum Takibi
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                İmzalı container gereksinimi FinBot batch job’larında %100 uygulanıyor; son 24 saatte 0 ihlal.
              </p>
            </Card>
            <Card className="space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Bütçe Senkronizasyonu
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                MuBot gider matrisi ile FinBot bütçe planları Redis üzerinden 3 dk’da bir reconcile ediliyor.
              </p>
            </Card>
            <Card className="space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Senaryo Gözlemcisi
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Observability MCP’den gelen Grafana panelleri FinBot senaryolarının doğrulama adımına otomatik ekleniyor.
              </p>
            </Card>
          </div>
        </McpSection>
      </div>
    </McpLayout>
  );
}
