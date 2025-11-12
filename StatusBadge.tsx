import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      status: {
        resolved:
          'border-transparent bg-[#43A047] bg-opacity-20 text-[#43A047] dark:bg-opacity-30',
        monitoring:
          'border-transparent bg-[#FBC02D] bg-opacity-20 text-[#B48B00] dark:text-[#FBC02D] dark:bg-opacity-30',
        closed:
          'border-transparent bg-gray-500 bg-opacity-20 text-gray-600 dark:text-gray-400 dark:bg-opacity-30',
        critical:
          'border-transparent bg-[#E53935] bg-opacity-20 text-[#E53935] dark:bg-opacity-30',
      },
    },
    defaultVariants: {
      status: 'closed',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  status: 'resolved' | 'monitoring' | 'closed' | 'critical';
}

const statusLabels: Record<StatusBadgeProps['status'], string> = {
    resolved: 'Çözüldü',
    monitoring: 'İzleniyor',
    closed: 'Kapatıldı',
    critical: 'Kritik',
};

const statusTooltips: Record<StatusBadgeProps['status'], string> = {
    resolved: 'Sorun başarıyla giderildi ve sistemler normal çalışıyor.',
    monitoring: 'Sorun çözüldü ancak etkilenen sistemler bir süre daha gözlem altında.',
    closed: 'Olay incelendi ve kapatıldı. Herhangi bir müdahale gerekmedi veya olay geçerliliğini yitirdi.',
    critical: 'Aktif olarak müdahale gerektiren kritik bir sorun mevcut.',
};

function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={badgeVariants({ status, className })} {...props}>
            {statusLabels[status]}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusTooltips[status]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { StatusBadge, badgeVariants };