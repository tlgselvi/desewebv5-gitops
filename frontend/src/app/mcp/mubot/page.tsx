"use client"; // Bu satır zaten var, başında olduğundan emin olun

import McpLayout from "@/components/layout/McpLayout";
import { IncidentCard } from "@/components/mcp/incident-card";
import { HealthCheckPanel } from "@/components/mcp/health-check-panel";
import { MetricCard } from "@/components/mcp/metric-card";
import { McpSection } from "@/components/mcp/mcp-section";
import {
  ArrowUpRight,
  ClipboardList,
  Database,
  FileInput,
  PieChart,
  Repeat,
  Scale,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type ModuleName = "mubot" | "finbot" | "aiops" | "observability";

type HealthCheckDto = {
  serviceName: string;
  status: string;
  lastChecked: string;
};

type MetricChangeType = "increase" | "decrease" | "neutral";

type MetricIconKey = "FileInput" | "Database" | "Repeat" | "Scale";

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

const INGESTION_STREAMS = [
  {
    title: "Gelir Mutabakatı",
    description: "FinBot gelir kalemleri, MuBot ledger eşleştirmesi ile 5 saniyede reconcile edilir.",
    status: "Aktif",
    owner: "FinBot Orchestrator",
  },
  {
    title: "Gider Otomasyonu",
    description: "Enerji ve bakım giderleri Redis stream üzerinden MuBot muhasebe tablosuna yazılır.",
    status: "İzleniyor",
    owner: "Kyverno Automation",
  },
  {
    title: "SmartPool Sensör Akışı",
    description: "IoT sensör verileri MuBot ingestion worker tarafından temizlenip PostgreSQL’e aktarılır.",
    status: "Analizde",
    owner: "SmartPool Connector",
  },
] as const;

const RECON_JOBS = [
  {
    id: "MUB-417",
    title: "Aylık Gelir-Gider Mutabakatı",
    status: "Tamamlandı",
    frequency: "Her gece 01:00",
    impact: "+0.4% gelir doğruluğu",
  },
  {
    id: "MUB-409",
    title: "Vergi Beyanı Ön Kontrol",
    status: "Çalışıyor",
    frequency: "Saatlik",
    impact: "PostgreSQL view güncellendi",
  },
  {
    id: "MUB-398",
    title: "Alacak-verecek Denkleştirme",
    status: "Hazırlanıyor",
    frequency: "Günlük",
    impact: "FinBot ledger import bekleniyor",
  },
] as const;

export default function MuBotPage() {
  const [dashboardData, setDashboardData] = useState<McpDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const metricIconMap = useMemo(
    () => ({
      FileInput,
      Database,
      Repeat,
      Scale,
    }),
    [],
  );

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        // Not: Bu path, Next.js'in proxy ayarına göre backend'e yönlendirilir.
        const response = await fetch("/api/v1/mcp/dashboard/mubot", {
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
        console.error("MuBot dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <McpLayout
      title="MuBot MCP · Finansal Mutabakat ve Veri İşleme"
      subtitle="Gelir-gider mutabakatını, veri ingestion süreçlerini ve ledger otomasyonunu tek panelde takip edin"
      footerNote="MuBot ingestion hattı Redis stream’i ve PostgreSQL connection pool’u ile 3 saniyelik gecikme hedefini korur"
    >
      <div className="space-y-12">
        <McpSection
          variant="primary"
          kicker="MuBot MCP · Ingestion & Reconciliation"
          title="Finansal Ingestion Kontrol Merkezi"
          description="Gelir ve gider akışlarını gerçek zamanlı izleyin, reconciliation job’larını yönetin ve MuBot ingestion pipeline’larının sağlığını kontrol edin."
          actions={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="primary" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Yeni Mutabakat Akışı
              </Button>
              <Button
                variant="ghost"
                className="gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300"
              >
                <ClipboardList className="h-4 w-4" />
                Ledger Loglarını Aç
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Badge variant="success" className="justify-center">
              Redis stream · 3s TTL
            </Badge>
            <Badge variant="warning" className="justify-center">
              PostgreSQL replication gecikmesi · 180 ms
            </Badge>
            <Badge
              variant="outline"
              className="justify-center border-emerald-200 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-200"
            >
              Automation queue · 12 job
            </Badge>
            <Badge
              variant="outline"
              className="justify-center border-blue-200 text-blue-700 dark:border-blue-500/40 dark:text-blue-200"
            >
              KDV raporu · v2.4.0
            </Badge>
          </div>
        </McpSection>

        <McpSection
          variant="success"
          title="Ingestion Servis Sağlığı"
          description="MuBot ve bağlı veri kaynaklarının anlık durumu."
          icon={<Shield className="h-5 w-5 text-emerald-500" />}
          footerNote="Veri kaynağı: MuBot health endpoint, PostgreSQL connection pool, Redis stream."
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
          title="Veri İşleme Metrikleri"
          description="Muhasebe ve veri işleme hatlarının anlık performansı."
          icon={<PieChart className="h-5 w-5 text-blue-500" />}
          footerNote="Veri kaynakları: MuBot telemetrisi · PostgreSQL istatistikleri."
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-36 w-full rounded-2xl" />
                ))
              : error
              ? (
                  <p className="col-span-full text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                )
              : dashboardData?.metrics.map((item) => {
                  const IconComponent = metricIconMap[item.icon] ?? FileInput;
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
          title="Ingestion Akışları"
          description="Redis stream, Kyverno automation ve FinBot senkronizasyonundan gelen veri akışı özetleri."
          footerNote="Tüm akışlar Kyverno imzası ve MuBot doğrulama katmanı üzerinden geçirilir."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {INGESTION_STREAMS.map((stream) => (
              <IncidentCard
                key={stream.title}
                title={stream.title}
                description={stream.description}
                status={stream.status}
                meta={[
                  {
                    icon: <Repeat className="h-3.5 w-3.5 text-emerald-500" />,
                    label: "Sorumlu",
                    value: stream.owner,
                  },
                ]}
              />
            ))}
          </div>
        </McpSection>

        <McpSection
          title="Mutabakat Kuyruğu"
          description="MuBot mutabakat job’larının güncel durumları."
          footerNote="Mutabakatlar FinBot ledger importları tamamlandığında otomatik olarak kapanır."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {RECON_JOBS.map((job) => (
              <IncidentCard
                key={job.id}
                id={job.id}
                title={job.title}
                status={job.status}
                meta={[
                  {
                    icon: <Database className="h-3.5 w-3.5 text-blue-500" />,
                    label: "Sıklık",
                    value: job.frequency,
                  },
                  {
                    icon: <Scale className="h-3.5 w-3.5 text-emerald-500" />,
                    label: "Etkisi",
                    value: job.impact,
                    tone: job.impact.includes("-") ? "negative" : "positive",
                  },
                ]}
              />
            ))}
          </div>
        </McpSection>
      </div>
    </McpLayout>
  );
}
