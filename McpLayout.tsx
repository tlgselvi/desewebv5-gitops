import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle, Info, LucideIcon } from 'lucide-react';

const sectionVariants = cva('rounded-xl border bg-card text-card-foreground shadow-sm', {
  variants: {
    variant: {
      critical: 'border-red-500/50 bg-red-500/5 dark:bg-red-500/10',
      info: 'border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10',
      success: 'border-green-500/50 bg-green-500/5 dark:bg-green-500/10',
      default: 'border-border',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const iconMap: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  check: CheckCircle,
  info: Info,
};

interface McpSectionProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof sectionVariants> {
  title: string;
  icon: 'alert' | 'check' | 'info';
  footerNote?: string;
  children: React.ReactNode;
}

export function McpSection({ title, icon, variant, footerNote, children, className }: McpSectionProps) {
  const Icon = iconMap[icon];
  return (
    <section className={sectionVariants({ variant, className })}>
      <div className="flex items-center space-x-3 border-b p-4 dark:border-gray-700">
        <Icon
          className={`h-6 w-6 ${
            variant === 'critical'
              ? 'text-red-500'
              : variant === 'info'
              ? 'text-blue-500'
              : variant === 'success'
              ? 'text-green-500'
              : 'text-primary'
          }`}
        />
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <div className="p-6">
        {children}
      </div>
      {footerNote && (
        <div className="border-t bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
          {footerNote}
        </div>
      )}
    </section>
  );
}

export function McpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8 lg:py-10 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl space-y-8">{children}</div>
    </div>
  );
}

/*
ÖRNEK KULLANIM: pages/mcp-dashboard.tsx

import { McpLayout, McpSection } from '@/components/mcp/McpLayout';
import { IncidentCard } from '@/components/mcp/IncidentCard';
import { HealthCheckPanel } from '@/components/mcp/HealthCheckPanel'; // Yeni import
import { MetricCard } from '@/components/mcp/MetricCard'; // Yeni import

export default function McpDashboardPage() {
  return (
    <McpLayout>
      <McpSection
        title="İnsident Günlüğü"
        icon="alert"
        variant="critical"
        footerNote="ArgoCD, Kyverno ve MCP aksiyonlarından gelen alarm akışı."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <IncidentCard id="OBS-311" title="ArgoCD repo DNS gecikmesi" ... />
        </div>
      </McpSection>

      <McpSection
        title="Sistem Sağlığı"
        icon="check"
        variant="success"
        footerNote="Tüm kritik servislerin anlık durumu."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HealthCheckPanel serviceName="Backend API" status="Stabil" lastCheck="Az önce" />
          <HealthCheckPanel serviceName="Redis Cache" status="Stabil" lastCheck="Az önce" />
          <HealthCheckPanel serviceName="PostgreSQL DB" status="Stabil" lastCheck="Az önce" />
          <HealthCheckPanel serviceName="FinBot MCP" status="Kesinti Var" lastCheck="3 dk önce" />
        </div>
      </McpSection>

      <McpSection
        title="Sistemsel İzleme"
        icon="info"
        variant="info"
        footerNote="Altyapı ve uygulama metriklerinin anlık durumu."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Cpu} title="CPU Kullanımı" value="72%" change="+3.2%" changeType="increase" footerText="son 1 saate göre" />
          <MetricCard icon={MemoryStick} title="Bellek Kullanımı" value="58.4 GB" change="-1.1%" changeType="decrease" footerText="düne göre" />
          <MetricCard icon={Users} title="Aktif Oturumlar" value="1,245" change="+122" changeType="increase" footerText="bugün" />
          <MetricCard icon={Clock} title="API Gecikmesi (p95)" value="112ms" change="+8ms" changeType="increase" footerText="son 15 dakikaya göre" />
        </div>
      </McpSection>
    </McpLayout>
  );
}
*/