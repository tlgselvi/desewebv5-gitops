import { authenticatedGet } from "./api";
import { ReactNode } from "react";

// Dashboard Metrics DTOs
export type MetricTrend = {
  value: number;
  direction: "up" | "down" | "neutral";
};

export type DashboardKpiDto = {
  title: string;
  value: string;
  description: string;
  icon: string; // Icon name as string to be mapped in component
  trend: MetricTrend;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
};

export type RecentActivityDto = {
  title: string;
  description: string;
  time: string;
  status: "success" | "warning" | "info" | "error";
};

export type ActiveEventDto = {
  title: string;
  description: string;
  level: "info" | "warning" | "critical";
};

export type HomeDashboardDto = {
  kpis: DashboardKpiDto[];
  recentActivities: RecentActivityDto[];
  activeEvent: ActiveEventDto;
  generatedAt: string;
};

/**
 * Mock data for development mode bypass
 * This prevents infinite loops by avoiding API calls and token checks
 */
const getMockDashboardData = (): HomeDashboardDto => {
  return {
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
      level: "info",
    },
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Fetch home dashboard data from the backend
 * 
 * DEVELOPMENT BYPASS: In development mode, returns mock data immediately
 * without making any API calls or token checks to prevent infinite loops.
 */
export const getHomeDashboardData = async (): Promise<HomeDashboardDto> => {
  // Bypass API call in development mode to prevent infinite loops
  if (process.env.NODE_ENV === "development") {
    // Return mock data immediately without any API calls or token checks
    return getMockDashboardData();
  }

  // Production mode: Make actual API call
  return await authenticatedGet<HomeDashboardDto>("/api/v1/ceo/home");
};

