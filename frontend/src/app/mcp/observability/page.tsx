"use client";

import McpLayout from "@/components/layout/McpLayout";
import { IncidentCard } from "@/components/mcp/incident-card";
import { HealthCheckPanel } from "@/components/mcp/health-check-panel";
import { MetricCard } from "@/components/mcp/metric-card";
import { McpSection } from "@/components/mcp/mcp-section";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CloudLightning,
  Clock,
  Gauge,
  Layers,
  LogIn,
  PieChart,
  Radio,
  Server,
  Shield,
  Sparkles,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type ModuleName = "mubot" | "finbot" | "aiops" | "observability";

type HealthCheckDto = {
  serviceName: string;
  status: string;
  lastChecked: string;
};

type MetricChangeType = "increase" | "decrease" | "neutral";

type MetricIconKey = "Server" | "LogIn" | "AlertCircle" | "Timer";

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

type StackItem = {
  title: string;
  detail: string;
  status: string;
  metricLabel: string;
  metricValue: string;
  icon: ReactNode;
};

type IncidentItem = {
  id: string;
  title: string;
  duration: string;
  state: string;
  detail: string;
  sources: string[];
};

const STACK_ITEMS: StackItem[] = [
  {
    title: "Grafana Dashboards",
    detail: "Jarvis KPI, FinBot Forecast, Kyverno CRD panelleri",
    status: "Aktif",
    metricLabel: "Senkronizasyon",
    metricValue: "24 pano senkron",
    icon: <Gauge className="h-3.5 w-3.5 text-blue-500" />,
  },
  {
    title: "Loki Log Pipelines",
    detail: "Kyverno admission, ArgoCD sync, MCP sorguları",
    status: "Aktif",
    metricLabel: "İşleme Hızı",
    metricValue: "450 log/s",
    icon: <Radio className="h-3.5 w-3.5 text-emerald-500" />,
  },
  {
    title: "Tempo Traces",
    detail: "FinBot senaryo zinciri, Redis cache isabetleri",
    status: "Analizde",
    metricLabel: "Örnekleme",
    metricValue: "%92 trace coverage",
    icon: <CloudLightning className="h-3.5 w-3.5 text-indigo-500" />,
  },
];

const INCIDENT_FEED: IncidentItem[] = [
  {
    id: "OBS-311",
    title: "ArgoCD repo DNS gecikmesi",
    duration: "4m 32s",
    state: "Çözüldü",
    detail: "Repo server port-forward ile manuel sync tamamlandı.",
    sources: ["ArgoCD", "Kyverno"],
  },
  {
    id: "OBS-307",
    title: "Kyverno helm test pod başarısız",
    duration: "Permanent fix",
    state: "Kapatıldı",
    detail: "Helm test hook devre dışı bırakıldı, values.yaml güncellendi.",
    sources: ["Kyverno", "Helm"],
  },
  {
    id: "OBS-298",
    title: "Prometheus scrape uyarısı",
    duration: "1m 12s",
    state: "İzleniyor",
    detail: "GKE node scaling sonrası scrape interval yeniden ayarlandı.",
    sources: ["Prometheus", "GKE"],
  },
];

export default function ObservabilityPage() {
  const [dashboardData, setDashboardData] = useState<McpDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const metricIconMap = useMemo(
    () => ({
      Server,
      LogIn,
      AlertCircle,
      Timer,
    }),
    [],
  );

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/mcp/dashboard/observability", {
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
        console.error("Observability dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return (
    <McpLayout
      title="Observability MCP · Prometheus · Grafana · Loki · Tempo"
      subtitle="Kyverno, ArgoCD ve FinBot akışlarından gelen metrikleri tek grafikte topla"
      footerNote="Observability telemetri verileri 15 saniyelik scrape interval’iyle yenilenir"
    >
      <div className="space-y-12">
        <McpSection
          variant="primary"
          kicker="Observability MCP · Prometheus · Grafana · Loki · Tempo"
          title="Gözlemlenebilirlik ve Alarm Orkestrasyonu"
          description="Kyverno, ArgoCD ve FinBot akışlarından gelen metrikleri tek grafikte birleştiriyoruz. Redis cache + Tempo entegrasyonu ile hataların kök nedenini dakikalar içinde izleyin."
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="primary" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Alert Action Planı
              </Button>
              <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900 dark:text-blue-300">
                <Layers className="h-4 w-4" />
                Dashboard Kataloğu
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Badge variant="success" className="justify-center">
              Prometheus · scrape 15s
            </Badge>
            <Badge variant="warning" className="justify-center">
              Grafana sync · manuel onay gerekli
            </Badge>
            <Badge
              variant="outline"
              className="justify-center border-emerald-200 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-200"
            >
              Loki ingestion %98 başarı
            </Badge>
            <Badge
              variant="outline"
              className="justify-center border-blue-200 text-blue-700 dark:border-blue-500/40 dark:text-blue-200"
            >
              Tempo trace sampling %92
            </Badge>
          </div>
        </McpSection>

        <McpSection
          variant="success"
          title="İzleme Altyapısı Sağlığı"
          description="Observability yığınını oluşturan servislerin anlık durumu."
          icon={<Shield className="h-5 w-5 text-emerald-500" />}
          footerNote="Veri kaynağı: Prometheus self-scrape, Grafana health, Loki ve Tempo API'leri."
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
          title="Genel Metrikler"
          description="Sistem genelindeki anlık izleme verileri."
          icon={<PieChart className="h-5 w-5 text-blue-500" />}
          footerNote="Veri kaynakları: Prometheus Federation · Loki API · Tempo API."
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
                  const IconComponent = metricIconMap[item.icon] ?? Server;
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
          title="Gözlem Metriği Özeti"
          description="Prometheus, Grafana ve Loki üzerinden gelen temel KPI değerleri."
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              title="Kyverno Alert Response"
              value="02:14"
              description="Ortalama müdahale süresi · son 7 gün"
              icon={<AlertTriangle className="h-6 w-6" />}
              trend={{ value: 12, direction: "down" }}
              variant="primary"
            />
            <KpiCard
              title="Grafana Dashboard SLA"
              value="99.7%"
              description="FinBot + AIOps panelleri"
              icon={<Gauge className="h-6 w-6" />}
              trend={{ value: 0.6, direction: "up" }}
            />
            <KpiCard
              title="Log İşleme Hızı"
              value="8.4K/s"
              description="Loki + Kyverno admission kayıtları"
              icon={<Radio className="h-6 w-6" />}
              trend={{ value: 4.5, direction: "up" }}
            />
          </div>
        </McpSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <McpSection
            title="Stack Özeti"
            description="Observability MCP, Kyverno stabilizasyon verilerini otomatik olarak işler ve alarm zincirlerini senkron tutar."
            footerNote="Dev ve prod ortamları aynı gözlem katmanını paylaşır."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {STACK_ITEMS.map((item) => (
                <IncidentCard
                  key={item.title}
                  title={item.title}
                  description={item.detail}
                  status={item.status}
                  meta={[
                    {
                      icon: item.icon,
                      label: item.metricLabel,
                      value: item.metricValue,
                      tone: item.status === "Analizde" ? "default" : "positive",
                    },
                  ]}
                />
              ))}
            </div>
          </McpSection>
          <McpSection
            title="İnsident Günlüğü"
            description="ArgoCD, Kyverno ve MCP aksiyonlarından gelen alarm akışı."
            footerNote="Alarm kapanışları Jarvis otomasyon zinciri tarafından doğrulanır."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {INCIDENT_FEED.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  id={incident.id}
                  title={incident.title}
                  description={incident.detail}
                  status={incident.state}
                  meta={[
                    {
                      icon: <Clock className="h-3.5 w-3.5 text-blue-500" />,
                      label: "Yanıt Süresi",
                      value: incident.duration,
                    },
                  ]}
                  tags={incident.sources}
                />
              ))}
            </div>
          </McpSection>
        </div>

        <McpSection
          title="Operasyonel Öne Çıkanlar"
          description="Self-healing ve pipeline izleme başlıklarında öne çıkan notlar."
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Health Check Otomasyonu
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                MCP health endpoint’leri Prometheus alertmanager ile entegre; başarısızlıklar
                FinBot backlog’una otomatik düşüyor.
              </p>
            </Card>
            <Card className="space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  ArgoCD Pipeline İzleme
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Manual `argocd app sync security` adımları trace edilerek drift raporuna ekleniyor.
              </p>
            </Card>
            <Card className="space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <CloudLightning className="h-5 w-5 text-orange-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  Redis Cache Sağlığı
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Cache hit oranı %94; FinBot, MuBot ve Observability MCP sorguları için latency 110 ms ortalama.
              </p>
            </Card>
          </div>
        </McpSection>
      </div>
    </McpLayout>
  );
}
