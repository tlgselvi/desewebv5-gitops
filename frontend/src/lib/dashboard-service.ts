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

export type RevenueChartDataPoint = {
  date: string;
  value: number;
};

export type HomeDashboardDto = {
  kpis: DashboardKpiDto[];
  recentActivities: RecentActivityDto[];
  activeEvent: ActiveEventDto;
  revenueChart: RevenueChartDataPoint[];
  generatedAt: string;
};

/**
 * Format number as Turkish Lira currency
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Mock data for development mode bypass
 * This prevents infinite loops by avoiding API calls and token checks
 * Rich enterprise dashboard data with financial metrics and transactions
 */
const getMockDashboardData = (): HomeDashboardDto => {
  return {
    kpis: [
      {
        title: "Toplam Ciro",
        value: formatCurrency(1250000), // ₺1.250.000
        description: "Bu ay toplam gelir (Aylık %15 artış)",
        icon: "TrendingUp",
        trend: { value: 15, direction: "up" },
        variant: "primary",
      },
      {
        title: "Aktif Kullanıcı",
        value: "842",
        description: "Aktif kullanıcı sayısı (Son 30 günde %12 artış)",
        icon: "Users",
        trend: { value: 12, direction: "up" },
        variant: "success",
      },
      {
        title: "Bekleyen Tahsilat",
        value: formatCurrency(45000), // ₺45.000
        description: "Ödeme bekleyen faturalar ve tahsilatlar",
        icon: "ShoppingCart",
        trend: { value: 8, direction: "down" },
        variant: "warning",
      },
      {
        title: "Sistem Sağlığı",
        value: "99.98%",
        description: "Tüm servislerin uptime ortalaması (Son 30 gün)",
        icon: "Activity",
        trend: { value: 0.02, direction: "up" },
        variant: "success",
      },
    ],
    recentActivities: [
      {
        title: "Acme Corp - Enterprise Lisans",
        description: "₺150.000 - Tamamlandı",
        time: "14:23",
        status: "success",
      },
      {
        title: "TechStart - Danışmanlık",
        description: "₺25.000 - Bekliyor",
        time: "13:45",
        status: "warning",
      },
      {
        title: "GlobalTech - Premium Abonelik",
        description: "₺75.000 - Tamamlandı",
        time: "12:18",
        status: "success",
      },
      {
        title: "StartupHub - Temel Paket",
        description: "₺12.500 - İşleniyor",
        time: "11:32",
        status: "info",
      },
    ],
    activeEvent: {
      title: "Sistem Performansı Optimal Seviyede",
      description: "Tüm MCP servisleri normal çalışıyor. FinBot ve MuBot senkronizasyonu başarılı. Son 24 saatte 0 kritik hata.",
      level: "info",
    },
    revenueChart: [
      { date: "Ocak", value: 120000 },
      { date: "Şubat", value: 185000 },
      { date: "Mart", value: 240000 },
      { date: "Nisan", value: 310000 },
      { date: "Mayıs", value: 450000 },
      { date: "Haziran", value: 680000 },
    ],
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

