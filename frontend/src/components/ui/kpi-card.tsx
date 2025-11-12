"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TrendProps {
  readonly value: number;
  readonly direction: "up" | "down";
}

export interface KpiCardProps {
  readonly title: string;
  readonly value: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly trend?: TrendProps;
  readonly variant?: "primary" | "neutral";
}

export function KpiCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "neutral",
}: KpiCardProps) {
  const isPositive = trend?.direction === "up";

  return (
    <Card
      variant={variant === "primary" ? "elevated" : "outlined"}
      className={cn(
        "flex h-full flex-col gap-4",
        variant === "primary" && "bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={cn(
              "text-sm font-medium text-gray-500 dark:text-slate-400",
              variant === "primary" && "text-white/70",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-slate-100",
              variant === "primary" && "text-white",
            )}
          >
            {value}
          </p>
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-300",
              variant === "primary" && "bg-white/15 text-white",
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-auto space-y-2 text-sm">
        {description && (
          <p
            className={cn(
              "text-gray-500 dark:text-slate-300",
              variant === "primary" && "text-white/80",
            )}
          >
            {description}
          </p>
        )}

        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
              isPositive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
              variant === "primary" && "bg-white/10 text-white",
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{trend.value}%</span>
            <span className="font-normal text-current">son 24 saat</span>
          </div>
        )}
      </div>
    </Card>
  );
}

