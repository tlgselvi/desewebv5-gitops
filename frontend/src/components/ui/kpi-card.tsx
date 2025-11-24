"use client";

import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
    variant?: "default" | "primary" | "success" | "warning" | "error" | "destructive";
}

export function KpiCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
}: KpiCardProps) {
  const variantStyles = {
    default: "border-gray-200 bg-white hover:border-gray-300",
    primary: "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:border-blue-300",
    success: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:border-emerald-300",
    warning: "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 hover:border-amber-300",
    error: "border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 hover:border-red-300",
    destructive: "border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 hover:border-red-300",
  };

  return (
    <Card className={`${variantStyles[variant]} transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {icon && (
          <div className="rounded-lg bg-white/80 p-2.5 shadow-sm">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold tracking-tight text-gray-900">
          {value}
        </div>
        {description && (
          <p className="text-xs leading-relaxed text-gray-500">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-1.5 pt-1">
            {trend.direction === "up" ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span
              className={`text-sm font-semibold ${
                trend.direction === "up" 
                  ? "text-emerald-600" 
                  : "text-red-600"
              }`}
            >
              {trend.value}%
            </span>
            <span className="text-xs text-gray-500">
              {trend.direction === "up" ? "artış" : "azalış"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
