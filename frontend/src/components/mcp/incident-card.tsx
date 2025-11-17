"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { StatusBadge } from "./status-badge";

type Tone = "default" | "positive" | "negative";

interface IncidentCardMeta {
  label?: string;
  value: string;
  icon?: ReactNode;
  tone?: Tone;
}

export interface IncidentCardProps {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  tags?: string[];
  meta?: IncidentCardMeta[];
  className?: string;
}

const toneClassMap: Record<Tone, string> = {
  default: "text-slate-600 dark:text-slate-300",
  positive: "text-emerald-600 dark:text-emerald-300",
  negative: "text-rose-600 dark:text-rose-300",
};

export function IncidentCard({
  id,
  title,
  description,
  status,
  tags,
  meta,
  className,
}: IncidentCardProps) {
  const hasHeader = Boolean(id || status);
  const hasMeta = Boolean(meta && meta.length > 0);
  const hasTags = Boolean(tags && tags.length > 0);

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {id ? <span className="font-mono">{id}</span> : <span />}
          {status ? <StatusBadge status={status} /> : null}
        </div>
      )}

      <h3 className="mt-3 text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {title}
      </h3>

      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {description}
        </p>
      ) : null}

      {hasMeta ? (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-4 text-xs sm:text-sm">
          {meta!.map((item, index) => (
            <div key={`${item.label ?? item.value}-${index}`} className="flex items-start gap-2">
              {item.icon ? (
                <span className="mt-0.5 text-slate-400 dark:text-slate-500">
                  {item.icon}
                </span>
              ) : null}
              <div className="space-y-1">
                {item.label ? (
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {item.label}
                  </dt>
                ) : null}
                <dd
                  className={cn(
                    "text-sm font-medium",
                    toneClassMap[item.tone ?? "default"],
                  )}
                >
                  {item.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      ) : null}

      {hasTags ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags!.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-slate-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300"
            >
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}


