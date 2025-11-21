import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Zap,
  TrendingUp,
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
    link: "/mcp/finbot",
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
    link: "/mcp/observability",
    tag: "SRE & AIOps",
  },
];

export default function Home() {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Section - Full Width */}
      <section className="relative -mx-4 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-500/20 sm:-mx-6 sm:rounded-3xl lg:-mx-8">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,transparent)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-center">
            {/* Left Column - Content */}
            <div className="space-y-6">
              <Badge variant="outline" className="border-white/30 bg-white/10 text-white/90 backdrop-blur-sm">
                <TrendingUp className="mr-1.5 h-3 w-3" />
                Canlı güncelleme · Kyverno stabilizasyonu tamamlandı
              </Badge>
              
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                  GitOps ve AIOps operasyonlarınızı tek panelden yönetin.
                </h1>
                <p className="text-base leading-relaxed text-white/90 sm:text-lg">
                  Dese EA Plan v6.8.1; Kyverno, ArgoCD ve MCP fazlarını gerçek zamanlı
                  senkronize ederek kurumsal planlama döngünüzü otomatikleştirir. FinBot ve
                  MuBot'tan gelen veriler, Jarvis otomasyon zinciriyle birleşerek tam
                  görünürlük sağlar.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button size="lg" className="bg-white text-blue-700 shadow-lg hover:bg-white/95 hover:shadow-xl" asChild>
                  <Link href="/">
                    Dashboard'u aç
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20" asChild>
                  <Link href="/mcp/aiops">AIOps modülüne git</Link>
                </Button>
                <Button variant="ghost" size="lg" className="text-white hover:bg-white/10" asChild>
                  <Link href="/login">Rol bazlı oturum aç</Link>
                </Button>
              </div>
            </div>

            {/* Right Column - Event Card */}
            <Card className="border-white/20 bg-white/10 shadow-xl shadow-blue-900/30 backdrop-blur-md">
              <div className="space-y-6 p-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Aktif Olay Akışı
                  </p>
                  <h2 className="text-xl font-bold sm:text-2xl">Kyverno CRD güncellemesi uygulandı</h2>
                  <p className="text-sm leading-relaxed text-white/80">
                    ArgoCD senkronizasyonu ile helm test hook devre dışı bırakıldı. <code className="rounded bg-white/20 px-1.5 py-0.5 text-xs">kubectl apply -k</code> CRD hatası ortadan kaldırıldı.
                  </p>
                </div>
                
                <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">
                    Son olaylar
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-white/90">FinBot MCP · Redis cache refresh · 12:04</span>
                      <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-400/30">OK</Badge>
                    </li>
                    <li className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-white/90">MuBot ingestion queue · 8 yeni kayıt</span>
                      <Badge className="bg-amber-500/20 text-amber-100 border-amber-400/30">İncele</Badge>
                    </li>
                    <li className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-white/90">Prometheus alertmanager · 0 aktif alarm</span>
                      <Badge className="bg-white/10 text-white/70 border-white/20">Stabil</Badge>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* KPI Cards Section */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_DATA.map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
      </section>

      {/* Modules Section */}
      <section id="modules" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Modül Ekosistemi
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              MCP sunucuları ve analitik katmanları v6.8.1 revizyonuna göre gruplandı.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="self-start sm:self-auto" asChild>
            <a href="http://localhost:3000/api-docs" target="_blank" rel="noreferrer">
              API dokümantasyonunu aç
              <ArrowRight className="ml-2 h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map(({ title, excerpt, link, tag }) => (
            <Card
              key={title}
              variant="outlined"
              className="group h-full space-y-4 border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 sm:text-xl">
                  {title}
                </h3>
                <Badge variant="outline" className="shrink-0 text-xs text-blue-600 dark:text-blue-400">
                  {tag}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
                {excerpt}
              </p>
              <div className="flex items-center gap-3 pt-2">
                {link ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800" 
                    asChild
                  >
                    <Link href={link}>
                      Paneli aç
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-slate-500">
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
