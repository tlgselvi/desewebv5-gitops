import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SectionVariant = "default" | "primary" | "success" | "warning" | "critical";

const variantStyles: Record<SectionVariant, string> = {
  default:
    "border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/90",
  primary:
    "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white dark:border-blue-500/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
  success:
    "border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white dark:border-emerald-500/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
  warning:
    "border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white dark:border-amber-500/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
  critical:
    "border-rose-100 bg-gradient-to-br from-rose-50 via-white to-white dark:border-rose-500/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
};

const kickerStyles: Record<SectionVariant, string> = {
  default: "text-slate-500 dark:text-slate-400",
  primary: "text-blue-600 dark:text-blue-300",
  success: "text-emerald-600 dark:text-emerald-300",
  warning: "text-amber-600 dark:text-amber-300",
  critical: "text-rose-600 dark:text-rose-300",
};

export interface McpSectionProps {
  variant?: SectionVariant;
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  footerNote?: string;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function McpSection({
  variant = "default",
  kicker,
  title,
  description,
  actions,
  footerNote,
  icon,
  className,
  children,
}: McpSectionProps) {
  const hasChildren = Boolean(children);

  return (
    <section
      className={cn(
        "rounded-3xl border shadow-sm transition-shadow hover:shadow-md",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          {kicker ? (
            <span
              className={cn(
                "text-sm font-semibold uppercase tracking-wide",
                kickerStyles[variant],
              )}
            >
              {kicker}
            </span>
          ) : null}
          <div className="flex items-center gap-3">
            {icon ? <span className="text-slate-500 dark:text-slate-300">{icon}</span> : null}
            <h2 className="text-2xl font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {title}
            </h2>
          </div>
          {description ? (
            <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-col items-start gap-3 lg:items-end">
            {actions}
          </div>
        ) : null}
      </div>

      {hasChildren ? (
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="space-y-6">{children}</div>
        </div>
      ) : null}

      {footerNote ? (
        <div className="border-t border-white/60 px-6 py-5 text-xs text-slate-500 dark:border-slate-800/60 dark:text-slate-400 sm:px-8">
          {footerNote}
        </div>
      ) : null}
    </section>
  );
}


