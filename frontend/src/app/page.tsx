import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";

const KPI_DATA = [
  {
    title: "MCP Uptime",
    value: "99.97%",
    description: "FinBot, MuBot, Observability MCP servislerinin 30 günlük ortalaması",
    icon: <Activity className="h-5 w-5" />,
    trend: { value: 1.5, direction: "up" as const },
    variant: "primary" as const,
  },
  {
    title: "Kyverno Policy Health",
    value: "24/24",
    description: "Kyverno policy senkronizasyonu ve ArgoCD drift kontrolü",
    icon: <ShieldCheck className="h-5 w-5" />,
    trend: { value: 0.4, direction: "up" as const },
  },
  {
    title: "ArgoCD Deploy Pipeline",
    value: "12m",
    description: "Staging → Production CI/CD ortalama yürütme süresi",
    icon: <Zap className="h-5 w-5" />,
    trend: { value: 12, direction: "down" as const },
  },
  {
    title: "FinBot Forecast Accuracy",
    value: "±3.2%",
    description: "Son 4 sprint gelir/gider tahmin sapması",
    icon: <BarChart3 className="h-5 w-5" />,
    trend: { value: 2.1, direction: "up" as const },
  },
];

const MODULES = [
  {
    title: "FinBot MCP",
    excerpt:
      "Gelir/gider projeksiyonları, senaryo bazlı planlama ve Jarvis destekli finansal otomasyon.",
    link: "/aiops",
    tag: "Finansal Planlama",
  },
  {
    title: "MuBot MCP",
    excerpt:
      "Muhasebe ve ERP entegrasyonları, çok kaynaklı veri mutabakatı ve otomatik KPI takibi.",
    tag: "Operational Accounting",
  },
  {
    title: "DESE Analytics",
    excerpt:
      "Core Web Vitals, E-E-A-T skoru ve saha verilerini tek ekranda birleştiren öngörüler.",
    tag: "Analytics",
  },
  {
    title: "Observability MCP",
    excerpt:
      "Prometheus, Grafana, Loki ve Kyverno etkinliklerinden gelen metrik ve alarm orkestrasyonu.",
    link: "/aiops",
    tag: "SRE & AIOps",
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="rounded-[2.5rem] bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 md:flex-row md:items-center md:gap-16 md:px-12 md:py-16">
          <div className="w-full space-y-7 md:max-w-xl">
            <Badge variant="outline" className="border-white/40 bg-white/10 text-white/80">
              Canlı güncelleme · Kyverno stabilizasyonu tamamlandı
            </Badge>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
                GitOps ve AIOps operasyonlarınızı tek panelden yönetin.
              </h1>
              <p className="text-lg leading-relaxed text-white/80">
                Dese EA Plan v6.8.1; Kyverno, ArgoCD ve MCP fazlarını gerçek zamanlı
                senkronize ederek kurumsal planlama döngünüzü otomatikleştirir. FinBot ve
                MuBot’tan gelen veriler, Jarvis otomasyon zinciriyle birleşerek tam
                görünürlük sağlar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-white/90" asChild>
                <Link href="/">
                  Dashboard’u aç
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="secondary" size="lg" className="border-white/40 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link href="/aiops">AIOps modülüne git</Link>
              </Button>
              <Button variant="ghost" size="lg" className="text-white hover:bg-white/10" asChild>
                <Link href="/login">Rol bazlı oturum aç</Link>
              </Button>
            </div>
          </div>
          <Card className="flex-1 border-white/10 bg-white/10 shadow-lg shadow-blue-900/40 backdrop-blur">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-wide text-white/70">Aktif Olay Akışı</p>
                <h2 className="text-2xl font-semibold">Kyverno CRD güncellemesi uygulandı</h2>
                <p className="text-white/75">
                  ArgoCD senkronizasyonu ile helm test hook devre dışı bırakıldı. `kubectl apply -k`
                  CRD hatası ortadan kaldırıldı.
                </p>
              </div>
              <div className="rounded-2xl bg-blue-500/30 p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-wide text-white/60">Son olaylar</p>
                <ul className="mt-3 space-y-3 text-sm">
                  <li className="flex items-start justify-between gap-3 text-white/90">
                    <span>FinBot MCP · Redis cache refresh · 12:04</span>
                    <span className="text-emerald-200">OK</span>
                  </li>
                  <li className="flex items-start justify-between gap-3 text-white/90">
                    <span>MuBot ingestion queue · 8 yeni kayıt</span>
                    <span className="text-amber-200">İncele</span>
                  </li>
                  <li className="flex items-start justify-between gap-3 text-white/90">
                    <span>Prometheus alertmanager · 0 aktif alarm</span>
                    <span className="text-white/70">Stabil</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {KPI_DATA.map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
      </section>

      <section id="modules" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Modül Ekosistemi
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              MCP sunucuları ve analitik katmanları v6.8.1 revizyonuna göre gruplandı.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href="http://localhost:3000/api-docs" target="_blank" rel="noreferrer">
              API dokümantasyonunu aç
            </a>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {MODULES.map(({ title, excerpt, link, tag }) => (
            <Card
              key={title}
              variant="outlined"
              className="h-full space-y-4 border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
                <Badge variant="outline" className="text-xs text-blue-600">
                  {tag}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
                {excerpt}
              </p>
              <div className="flex items-center gap-3 pt-2">
                {link ? (
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800" asChild>
                    <Link href={link}>
                      Paneli aç
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400">
                    Kyverno revizyonu sonrası integrasyon güncelleniyor.
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
