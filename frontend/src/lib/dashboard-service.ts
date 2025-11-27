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
 * Fetch home dashboard data from the backend
 */
export const getHomeDashboardData = async (): Promise<HomeDashboardDto> => {
  return await authenticatedGet<HomeDashboardDto>("/api/v1/ceo/home");
};

