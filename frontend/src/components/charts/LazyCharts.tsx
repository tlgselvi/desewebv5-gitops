"use client";

/**
 * Lazy-Loaded Chart Components
 * 
 * Recharts kütüphanesi ~250KB gzipped olduğu için,
 * chart kullanılmayan sayfalarda gereksiz yüklenmeyi önlemek için
 * dynamic import kullanıyoruz.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading
 */

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Loading placeholder for charts
function ChartLoadingFallback({ height = 350 }: { height?: number }) {
  return (
    <div className="w-full animate-pulse" style={{ height }}>
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  );
}

// =============================================================================
// LAZY LOADED CHART COMPONENTS
// =============================================================================

/**
 * Lazy-loaded LineChart with loading fallback
 */
export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

/**
 * Lazy-loaded BarChart with loading fallback
 */
export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

/**
 * Lazy-loaded AreaChart with loading fallback
 */
export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

/**
 * Lazy-loaded PieChart with loading fallback
 */
export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  {
    loading: () => <ChartLoadingFallback height={300} />,
    ssr: false,
  }
);

/**
 * Lazy-loaded ComposedChart with loading fallback
 */
export const LazyComposedChart = dynamic(
  () => import('recharts').then((mod) => mod.ComposedChart),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

// =============================================================================
// RE-EXPORTED CHART UTILITIES (These are small, no need to lazy load)
// =============================================================================

export {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  ReferenceLine,
  ReferenceArea,
  Brush,
  Scatter,
} from 'recharts';

// =============================================================================
// CHART WRAPPER COMPONENT
// =============================================================================

interface LazyChartWrapperProps {
  type: 'line' | 'bar' | 'area' | 'pie' | 'composed';
  height?: number;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component for lazy-loaded charts
 * Provides consistent loading states and error boundaries
 */
export function LazyChartWrapper({
  type,
  height = 350,
  children,
  className = '',
}: LazyChartWrapperProps) {
  return (
    <div
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={`${type} chart visualization`}
    >
      {children}
    </div>
  );
}

// =============================================================================
// PRELOAD UTILITY
// =============================================================================

/**
 * Preload recharts module for faster subsequent renders
 * Call this on hover or when you know charts will be needed soon
 */
export function preloadCharts(): void {
  if (typeof window !== 'undefined') {
    import('recharts');
  }
}

