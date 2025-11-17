"use client";

import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

type ChangeType = "increase" | "decrease" | "neutral";

const changeIconMap: Record<ChangeType, LucideIcon> = {
  increase: ArrowUp,
  decrease: ArrowDown,
  neutral: Minus,
};

const changeToneMap: Record<ChangeType, string> = {
  increase: "text-emerald-600 dark:text-emerald-400",
  decrease: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-500 dark:text-slate-400",
};

export interface MetricCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  change?: string;
  changeType?: ChangeType;
  footerText?: string;
  className?: string;
}

export function MetricCard({
  icon: Icon,
  title,
  value,
  change,
  changeType = "neutral",
  footerText,
  className,
}: MetricCardProps) {
  const ChangeIcon = changeIconMap[changeType];
  const changeTone = changeToneMap[changeType];

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/85 md:p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {title}
        </h3>
        <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden />
      </div>

      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          {value}
        </p>
      </div>

      {(change || footerText) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {change ? (
            <>
              <ChangeIcon className={cn("h-4 w-4", changeTone)} aria-hidden />
              <span className={cn("font-semibold", changeTone)}>{change}</span>
            </>
          ) : null}
          {footerText ? (
            <span className="text-slate-500 dark:text-slate-400">{footerText}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}


