/**
 * Chart Wrapper Component
 * Provides a unified interface for chart libraries (Recharts, Chart.js)
 */

"use client";

import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { Loading } from '@/components/ui/loading';

// Lazy load chart components to reduce bundle size
const RechartsLine = lazy(() => 
  import('recharts').then(module => ({
    default: ({ data, ...props }: any) => (
      <module.LineChart data={data} {...props}>
        <module.CartesianGrid strokeDasharray="3 3" />
        <module.XAxis dataKey="name" />
        <module.YAxis />
        <module.Tooltip />
        <module.Legend />
        <module.Line type="monotone" dataKey="value" stroke="#8884d8" />
      </module.LineChart>
    )
  }))
);

const RechartsBar = lazy(() => 
  import('recharts').then(module => ({
    default: ({ data, ...props }: any) => (
      <module.BarChart data={data} {...props}>
        <module.CartesianGrid strokeDasharray="3 3" />
        <module.XAxis dataKey="name" />
        <module.YAxis />
        <module.Tooltip />
        <module.Legend />
        <module.Bar dataKey="value" fill="#8884d8" />
      </module.BarChart>
    )
  }))
);

export interface ChartWrapperProps {
  type: 'line' | 'bar' | 'area' | 'pie';
  data: Array<Record<string, unknown>>;
  width?: number;
  height?: number;
  className?: string;
}

export function ChartWrapper({ type, data, width = 500, height = 300, className }: ChartWrapperProps) {
  let ChartComponent: ComponentType<any> | null = null;

  switch (type) {
    case 'line':
      ChartComponent = RechartsLine;
      break;
    case 'bar':
      ChartComponent = RechartsBar;
      break;
    default:
      ChartComponent = RechartsLine;
  }

  return (
    <div className={className} role="img" aria-label={`${type} chart`}>
      <Suspense fallback={<Loading variant="spinner" />}>
        {ChartComponent && (
          <ChartComponent data={data} width={width} height={height} />
        )}
      </Suspense>
    </div>
  );
}

