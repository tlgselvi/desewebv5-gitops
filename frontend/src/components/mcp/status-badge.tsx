import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusToken =
  | "resolved"
  | "monitoring"
  | "closed"
  | "critical"
  | "inProgress"
  | "pending"
  | "default";

const palette: Record<StatusToken, string> = {
  resolved:
    "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  monitoring:
    "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  closed:
    "border-transparent bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  critical:
    "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  inProgress:
    "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  pending:
    "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  default:
    "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

const labelMap: Partial<Record<StatusToken, string>> = {
  resolved: "Tamamlandı",
  monitoring: "İzleniyor",
  closed: "Kapatıldı",
  critical: "Kritik",
  inProgress: "Aktif",
  pending: "Hazırlanıyor",
};

const statusTokenMap: Record<string, StatusToken> = {
  resolved: "resolved",
  tamamlandı: "resolved",
  çözüldü: "resolved",
  ok: "resolved",
  success: "resolved",
  monitoring: "monitoring",
  izleniyor: "monitoring",
  izleme: "monitoring",
  analize: "monitoring",
  "izleme modu": "monitoring",
  kapatıldı: "closed",
  kapalı: "closed",
  closed: "closed",
  offline: "closed",
  critical: "critical",
  kritik: "critical",
  alert: "critical",
  alarm: "critical",
  kırmızı: "critical",
  aktif: "inProgress",
  "çalışıyor": "inProgress",
  running: "inProgress",
  online: "inProgress",
  pending: "pending",
  beklemede: "pending",
  hazırlık: "pending",
  "hazırlanıyor": "pending",
  "analizde": "default",
};

function resolveStatus(status?: string): {
  token: StatusToken;
  label: string;
} {
  if (!status) {
    return { token: "default", label: "Durum" };
  }

  const normalized = status.trim().toLowerCase();
  const token = statusTokenMap[normalized] ?? "default";
  const label =
    labelMap[token] ??
    status
      .trim()
      .replace(/^\p{M}+/u, "")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  return { token, label };
}

export interface StatusBadgeProps {
  status?: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { token, label } = resolveStatus(status);

  return (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
        palette[token],
        className,
      )}
    >
      {label}
    </Badge>
  );
}


