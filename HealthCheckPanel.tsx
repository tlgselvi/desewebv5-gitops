import React from 'react';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { cn } from '@/lib/utils'; // shadcn/ui'dan gelen yardımcı fonksiyon
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HealthCheckPanelProps {
  serviceName: string;
  status: 'Stabil' | 'Kesinti Var';
  lastCheck: string;
  className?: string;
}

export function HealthCheckPanel({
  serviceName,
  status,
  lastCheck,
  className,
}: HealthCheckPanelProps) {
  const isStable = status === 'Stabil';

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm',
        isStable ? 'border-green-200 dark:border-green-800/50' : 'border-red-200 dark:border-red-800/50',
        className
      )}
    >
      <div className="flex items-center space-x-4">
        {isStable ? (
          <ShieldCheck className="h-8 w-8 text-green-500" />
        ) : (
          <ShieldAlert className="h-8 w-8 text-red-500" />
        )}
        <div>
          <p className="font-semibold text-card-foreground">{serviceName}</p>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className={cn('text-sm cursor-default', isStable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{status}</p>
              </TooltipTrigger>
              <TooltipContent>
                {isStable ? 'Servis beklendiği gibi çalışıyor.' : 'Serviste bir kesinti veya performans sorunu tespit edildi.'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{lastCheck}</span>
      </div>
    </div>
  );
}