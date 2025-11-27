"use client";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white/70 text-xs text-gray-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-gray-700 dark:text-slate-200">
            Dese Web Platform · EA Plan Infrastructure
          </p>
          <p>
            v7.1.0 · Enterprise SaaS Platform · ©2025
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-gray-400 dark:text-slate-500">
          <span>Kyverno · ArgoCD · Prometheus · Grafana</span>
          <span>Google Cloud · GKE · Redis · PostgreSQL</span>
        </div>
      </div>
    </footer>
  );
}
