"use client";

import type { ComponentPropsWithoutRef } from "react";
import {
  Activity,
  AlertTriangle,
  CloudLightning,
  Gauge,
  Layers,
  Radio,
  Server,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";

const STACK_ITEMS = [
  {
    title: "Grafana Dashboards",
    detail: "Jarvis KPI, FinBot Forecast, Kyverno CRD panelleri",
    status: "24 pano senkron",
  },
  {
    title: "Loki Log Pipelines",
    detail: "Kyverno admission, ArgoCD sync, MCP sorguları",
    status: "450 log/s",
  },
  {
    title: "Tempo Traces",
    detail: "FinBot senaryo zinciri, Redis cache isabetleri",
    status: "Tracing %92 örnekleme",
  },
] as const;

const INCIDENT_FEED = [
  {
    id: "OBS-311",
    title: "ArgoCD repo DNS gecikmesi",
    duration: "4m 32s",
    state: "Çözüldü",
    detail: "Repo server port-forward ile manuel sync tamamlandı.",
  },
  {
    id: "OBS-307",
    title: "Kyverno helm test pod başarısız",
    duration: "Permanent fix",
    state: "Kapatıldı",
    detail: "Helm test hook devre dışı bırakıldı, values.yaml güncellendi.",
  },
  {
    id: "OBS-298",
    title: "Prometheus scrape uyarısı",
    duration: "1m 12s",
    state: "İzleniyor",
    detail: "GKE node scaling sonrası scrape interval yeniden ayarlandı.",
  },
] as const;

export default function ObservabilityPage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-500/40 dark:text-blue-200">
              Observability MCP · Prometheus · Grafana · Loki · Tempo
            </Badge>
            <div>
              <h1 className="text-4xl font-semibold text-gray-900 dark:text-slate-100">
                Gözlemlenebilirlik ve Alarm Orkestrasyonu
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-slate-300">
                Kyverno, ArgoCD ve FinBot akışlarından gelen metrikleri tek grafikte
                birleştiriyoruz. Redis cache + Tempo entegrasyonu ile hataların kök
                nedenini dakikalar içinde izleyin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Alert Action Planı
              </Button>
              <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900">
                <Layers className="h-4 w-4" />
                Dashboard Kataloğu
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Stack Özeti</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Observability MCP, Kyverno stabilizasyon verilerini otomatik olarak işliyor.
              </p>
            </div>
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-500/40 dark:text-blue-200">
              Dev &amp; Prod
            </Badge>
          </div>
          <div className="space-y-3">
            {STACK_ITEMS.map((item) => (
              <div
                key={item.title}
                className="flex items-start justify-between rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/30 dark:bg-blue-500/10"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">{item.detail}</p>
                </div>
                <Badge variant="success">{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">İnsident Günlüğü</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                ArgoCD, Kyverno ve MCP aksiyonlarından gelen alarm akışı.
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-200">
              Son 24 saat
            </Badge>
          </div>
          <div className="space-y-3">
            {INCIDENT_FEED.map((incident) => (
              <div
                key={incident.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>{incident.id}</span>
                  <span>{incident.state}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">{incident.title}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>
                    <ClockLightningIcon className="mr-1 inline h-3.5 w-3.5 text-blue-500" />
                    {incident.duration}
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-300">Kyverno + Grafana</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{incident.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Health Check Otomasyonu</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            MCP health endpoint’leri Prometheus alertmanager ile entegre; başarısızlıklar
            FinBot backlog’una otomatik düşüyor.
          </p>
        </Card>
        <Card className="space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">ArgoCD Pipeline İzleme</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Manual `argocd app sync security` adımları trace edilerek drift raporuna ekleniyor.
          </p>
        </Card>
        <Card className="space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <CloudLightning className="h-5 w-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Redis Cache Sağlığı</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Cache hit oranı %94; FinBot, MuBot ve Observability MCP sorguları için latency
            110 ms ortalama.
          </p>
        </Card>
      </section>
    </div>
  );
}

function ClockLightningIcon(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <polyline points="10.5 3 9 6 13.5 7" />
    </svg>
  );
}

