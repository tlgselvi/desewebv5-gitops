import { ArrowUpRight, Clock, Cpu, Radar, ShieldCheck } from "lucide-react";
import AlertDashboard from "@/components/aiops/AlertDashboard";
import DriftPanel from "@/components/aiops/DriftPanel";
import InsightsPanel from "@/components/aiops/InsightsPanel";
import ReplayTimeline from "@/components/aiops/ReplayTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";

export default function AIOpsPage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-500/40 dark:text-blue-200">
              Kyverno Stabilizasyonu · v6.8.1
            </Badge>
            <div>
              <h1 className="text-4xl font-semibold text-gray-900 dark:text-slate-100">
                Jarvis AIOps Kontrol Merkezi
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-slate-300">
                Kyverno politikaları, ArgoCD senkronizasyonu ve Prometheus alarm zincirini tek ekranda takip edin. İşletim sürprizlerini azaltmak için drift ve otomasyon sinyallerini gerçek zamanlı olarak yönetin.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Drift Analizini Aç
              </Button>
              <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900">
                <Clock className="h-4 w-4" />
                Son Otomasyon Raporu
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <InsightsPanel />
        <ReplayTimeline />
      </section>

      <section>
        <AlertDashboard />
      </section>
    </div>
  );
}
