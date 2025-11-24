"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Zap,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { getHomeDashboardData, HomeDashboardDto } from "@/lib/dashboard-service";
import { Skeleton } from "@/components/ui/skeleton";

// Map icon strings to components
const ICON_MAP: Record<string, any> = {
  Activity,
  ShieldCheck,
  Zap,
  BarChart3,
  TrendingUp,
  Sparkles,
  Users,
};

const MODULES = [
  {
    title: "FinBot MCP",
    excerpt:
      "Gelir/gider projeksiyonları, senaryo bazlı planlama ve Jarvis destekli finansal otomasyon.",
    link: "/mcp/finbot",
    tag: "Finansal Planlama",
    icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
    color: "blue",
  },
  {
    title: "MuBot MCP",
    excerpt:
      "Muhasebe ve ERP entegrasyonları, çok kaynaklı veri mutabakatı ve otomatik KPI takibi.",
    link: "/mcp/mubot",
    tag: "Operational Accounting",
    icon: <Users className="h-6 w-6 text-purple-600" />,
    color: "purple",
  },
  {
    title: "DESE Analytics",
    excerpt:
      "Core Web Vitals, E-E-A-T skoru ve saha verilerini tek ekranda birleştiren öngörüler.",
    tag: "Analytics",
    icon: <Sparkles className="h-6 w-6 text-amber-600" />,
    color: "amber",
  },
  {
    title: "Observability MCP",
    excerpt:
      "Prometheus, Grafana, Loki ve Kyverno etkinliklerinden gelen metrik ve alarm orkestrasyonu.",
    link: "/mcp/observability",
    tag: "SRE & AIOps",
    icon: <Activity className="h-6 w-6 text-emerald-600" />,
    color: "emerald",
  },
];

export default function Home() {
  const [data, setData] = useState<HomeDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await getHomeDashboardData();
        setData(dashboardData);
      } catch (err) {
        console.error("Dashboard data fetch failed, using fallback", err);
        // Fallback data if API fails or auth is missing
        setData({
          kpis: [
            {
              title: "MCP Uptime",
              value: "99.97%",
              description: "FinBot, MuBot, Observability MCP servislerinin 30 günlük ortalaması",
              icon: "Activity",
              trend: { value: 1.5, direction: "up" },
              variant: "primary",
            },
            {
              title: "Kyverno Policy Health",
              value: "24/24",
              description: "Kyverno policy senkronizasyonu ve ArgoCD drift kontrolü",
              icon: "ShieldCheck",
              trend: { value: 0.4, direction: "up" },
            },
            {
              title: "ArgoCD Deploy Pipeline",
              value: "12m",
              description: "Staging → Production CI/CD ortalama yürütme süresi",
              icon: "Zap",
              trend: { value: 12, direction: "down" },
            },
            {
              title: "FinBot Forecast Accuracy",
              value: "±3.2%",
              description: "Son 4 sprint gelir/gider tahmin sapması",
              icon: "BarChart3",
              trend: { value: 2.1, direction: "up" },
            },
          ],
          recentActivities: [
             {
               title: "FinBot MCP",
               description: "Redis cache refresh",
               time: "12:04",
               status: "success",
             },
             {
               title: "MuBot ingestion queue",
               description: "8 yeni kayıt",
               time: "11:52",
               status: "warning",
             },
             {
               title: "Prometheus alertmanager",
               description: "0 aktif alarm",
               time: "11:30",
               status: "info",
             },
          ],
          activeEvent: {
            title: "Kyverno CRD güncellemesi uygulandı",
            description: "ArgoCD senkronizasyonu ile helm test hook devre dışı bırakıldı. CRD hatası ortadan kaldırıldı.",
            level: "info"
          },
          generatedAt: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-16 shadow-2xl shadow-blue-500/25 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <Sparkles className="mr-2 h-3 w-3" />
                  v6.8.1 - Kyverno Stabilizasyonu
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                  GitOps ve AIOps operasyonlarınızı tek panelden yönetin
                </h1>
                <p className="text-lg leading-relaxed text-blue-50 sm:text-xl">
                  Dese EA Plan; Kyverno, ArgoCD ve MCP fazlarını gerçek zamanlı senkronize ederek kurumsal planlama döngünüzü otomatikleştirir. FinBot ve MuBot'tan gelen veriler, Jarvis otomasyon zinciriyle birleşerek tam görünürlük sağlar.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-blue-700 shadow-xl hover:bg-blue-50 hover:shadow-2xl transition-all duration-200 h-12 px-6" 
                  asChild
                >
                  <Link href="/">
                    Dashboard'u Aç
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 h-12 px-6" 
                  asChild
                >
                  <Link href="/mcp/aiops">AIOps Modülü</Link>
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                {loading ? (
                  <>
                     <div className="text-center space-y-2"><Skeleton className="h-8 w-24 mx-auto bg-white/20" /><Skeleton className="h-4 w-16 mx-auto bg-white/10" /></div>
                     <div className="text-center space-y-2"><Skeleton className="h-8 w-24 mx-auto bg-white/20" /><Skeleton className="h-4 w-16 mx-auto bg-white/10" /></div>
                     <div className="text-center space-y-2"><Skeleton className="h-8 w-24 mx-auto bg-white/20" /><Skeleton className="h-4 w-16 mx-auto bg-white/10" /></div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{data?.kpis[0]?.value || "99.9%"}</div>
                      <div className="text-xs text-blue-200">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{data?.kpis[1]?.value || "24/24"}</div>
                      <div className="text-xs text-blue-200">Policies</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{data?.kpis[2]?.value || "12m"}</div>
                      <div className="text-xs text-blue-200">Deploy Time</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Activity Card */}
            <Card className="border-white/20 bg-white/10 shadow-2xl shadow-blue-900/30 backdrop-blur-md">
              <div className="space-y-6 p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full animate-pulse ${data?.activeEvent?.level === 'critical' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                      Aktif Olay Akışı
                    </p>
                  </div>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-3/4 bg-white/20" />
                      <Skeleton className="h-16 w-full bg-white/10" />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-white">
                        {data?.activeEvent?.title || "Sistem Normal"}
                      </h2>
                      <p className="text-sm leading-relaxed text-white/80">
                        {data?.activeEvent?.description || "Tüm sistemler optimal parametrelerde çalışıyor."}
                      </p>
                    </>
                  )}
                </div>
                
                <div className="space-y-3 rounded-xl border border-white/20 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Son Aktiviteler
                  </p>
                  <div className="space-y-3">
                    {loading ? (
                       <>
                         <Skeleton className="h-10 w-full bg-white/10" />
                         <Skeleton className="h-10 w-full bg-white/10" />
                         <Skeleton className="h-10 w-full bg-white/10" />
                       </>
                    ) : (
                      data?.recentActivities.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white/90">{activity.title}</div>
                            <div className="text-xs text-white/60">{activity.description}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-white/50">{activity.time}</span>
                            {activity.status === "success" && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            )}
                            {activity.status === "warning" && (
                              <Clock className="h-4 w-4 text-amber-400" />
                            )}
                            {activity.status === "info" && (
                              <Activity className="h-4 w-4 text-blue-400" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* KPI Cards Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Performans Metrikleri</h2>
          <p className="mt-1 text-sm text-gray-600">
            Sistem sağlığı ve operasyonel metriklerin gerçek zamanlı görünümü
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
               <Skeleton key={i} className="h-32 rounded-xl" />
             ))
          ) : (
            data?.kpis.map((item) => {
              const IconComponent = ICON_MAP[item.icon] || Activity;
              return (
                <KpiCard 
                  key={item.title} 
                  {...item} 
                  icon={<IconComponent className="h-5 w-5" />} 
                />
              );
            })
          )}
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Modül Ekosistemi
            </h2>
            <p className="mt-2 text-base text-gray-600">
              MCP sunucuları ve analitik katmanları v6.8.1 revizyonuna göre gruplandı
            </p>
          </div>
          <Button variant="outline" size="sm" className="self-start sm:self-auto" asChild>
            <a href="http://localhost:3000/api-docs" target="_blank" rel="noreferrer">
              API Dokümantasyonu
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {MODULES.map(({ title, excerpt, link, tag, icon, color }) => (
            <Card
              key={title}
              variant="outlined"
              className="group relative h-full space-y-4 border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gray-50 p-3">
                    {icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {title}
                    </h3>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {tag}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                {excerpt}
              </p>
              <div className="flex items-center gap-3 pt-2">
                {link ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:bg-blue-50" 
                    asChild
                  >
                    <Link href={link}>
                      Paneli Aç
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400">
                    Yakında kullanıma açılacak
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
