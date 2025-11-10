"use client";

import {
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  ClipboardList,
  Coins,
  GitBranch,
  PieChart,
  Shield,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";

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

export default function FinBotPage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-8 shadow-sm dark:border-emerald-500/40 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-200">
              FinBot MCP · Finans Operasyonları
            </Badge>
            <div>
              <h1 className="text-4xl font-semibold text-gray-900 dark:text-slate-100">
                Finansal Planlama ve Senaryo Kontrolü
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-slate-300">
                Gelir projeksiyonları, bütçe planlama ve risk simülasyonlarını tek
                panoda konsolide ediyoruz. Kyverno stabilizasyonu sonrası FinBot’un
                veri akışı Redis cache üzerinden 5 saniyede güncelleniyor.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Yeni Finans Senaryosu
              </Button>
              <Button variant="ghost" className="gap-2 text-emerald-700 hover:text-emerald-900">
                <GitBranch className="h-4 w-4" />
                Akış Grafiğini Aç
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Öncelikli Veri Akışları</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                FinBot senaryoları Kyverno politikalarıyla senkron halde.
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-200">
              Gerçek zamanlı
            </Badge>
          </div>
          <div className="space-y-4">
            {PRIORITY_STREAMS.map((stream) => (
              <div
                key={stream.title}
                className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{stream.title}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{stream.owner}</p>
                  </div>
                  <Badge variant="success">{stream.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{stream.description}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Senaryo Kuyruğu</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                MCP sorguları, Redis üzerinden saniyelik olarak güncelleniyor.
              </p>
            </div>
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-500/40 dark:text-blue-200">
              3 aktif
            </Badge>
          </div>
          <div className="space-y-3">
            {SCENARIO_QUEUE.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>{item.id}</span>
                  <span>{item.status}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">{item.topic}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>
                    <CalendarCheck className="mr-1 inline h-3.5 w-3.5 text-blue-500" />
                    {item.window}
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-300">{item.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Kyverno Uyum Takibi</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            İmzalı container gereksinimi FinBot batch job’larında %100 uygulanıyor; son 24
            saatte 0 ihlal.
          </p>
        </Card>
        <Card className="space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Bütçe Senkronizasyonu</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            MuBot gider matrisi ile FinBot bütçe planları Redis üzerinden 3 dk’da bir
            reconcile ediliyor.
          </p>
        </Card>
        <Card className="space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Senaryo Gözlemcisi</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Observability MCP’den gelen Grafana panelleri FinBot senaryolarının doğrulama
            adımına otomatik ekleniyor.
          </p>
        </Card>
      </section>
    </div>
  );
}

