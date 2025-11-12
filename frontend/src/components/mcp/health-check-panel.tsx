import { cn } from "@/lib/utils";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type HealthStatusToken = "stable" | "down" | "monitoring" | "unknown";

interface ResolvedStatus {
  token: HealthStatusToken;
  label: string;
  toneClass: string;
  iconClass: string;
  tooltip: string;
}

export interface HealthCheckPanelProps {
  serviceName: string;
  status: string;
  lastChecked: string;
  className?: string;
}

const statusDictionary: Record<string, HealthStatusToken> = {
  "stabil": "stable",
  stable: "stable",
  "ok": "stable",
  "up": "stable",
  "çalışıyor": "stable",
  "kesinti var": "down",
  "kesinti": "down",
  "down": "down",
  "offline": "down",
  "hata": "down",
  "izleniyor": "monitoring",
  "i̇zleniyor": "monitoring",
  "izleme": "monitoring",
  "i̇zleme": "monitoring",
  "monitoring": "monitoring",
  "analizde": "monitoring",
};

const statusClassMap: Record<HealthStatusToken, ResolvedStatus> = {
  stable: {
    token: "stable",
    label: "Stabil",
    toneClass:
      "text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10",
    iconClass: "text-emerald-500 dark:text-emerald-300",
    tooltip: "Servis beklendiği gibi çalışıyor.",
  },
  down: {
    token: "down",
    label: "Kesinti Var",
    toneClass: "text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/10",
    iconClass: "text-rose-500 dark:text-rose-300",
    tooltip: "Serviste kesinti veya performans sorunu tespit edildi.",
  },
  monitoring: {
    token: "monitoring",
    label: "İzleniyor",
    toneClass:
      "text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10",
    iconClass: "text-amber-500 dark:text-amber-300",
    tooltip: "Servis müdahale sonrası gözlem altında, telemetri yakından izleniyor.",
  },
  unknown: {
    token: "unknown",
    label: "Bilinmiyor",
    toneClass: "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/30",
    iconClass: "text-slate-400 dark:text-slate-500",
    tooltip: "Servis durumu doğrulanamadı, son kontrol tekrar edilmeli.",
  },
};

function resolveStatus(statusRaw: string): ResolvedStatus {
  const normalized = statusRaw.trim().toLowerCase();
  const token = statusDictionary[normalized] ?? "unknown";
  const base = statusClassMap[token];

  return token === "unknown" && statusRaw.trim().length > 0
    ? {
        ...base,
        label: statusRaw.trim(),
      }
    : base;
}

export function HealthCheckPanel({
  serviceName,
  status,
  lastChecked,
  className,
}: HealthCheckPanelProps) {
  const resolved = resolveStatus(status);
  const Icon =
    resolved.token === "down"
      ? ShieldAlert
      : resolved.token === "monitoring"
      ? ShieldQuestion
      : ShieldCheck;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {serviceName}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Son kontrol: {lastChecked}
          </p>
        </div>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex cursor-default items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold sm:self-start",
                  resolved.toneClass,
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", resolved.iconClass)} />
                {resolved.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="end">
              <p className="max-w-xs text-xs font-medium text-slate-600 dark:text-slate-200">
                {resolved.tooltip}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}


