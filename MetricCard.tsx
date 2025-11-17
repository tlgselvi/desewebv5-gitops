"use client";

import React from 'react';
import { LucideIcon, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  footerText?: string;
  className?: string;
}

export function MetricCard({
  icon: Icon,
  title,
  value,
  change,
  changeType = 'neutral',
  footerText,
  className,
}: MetricCardProps) {
  const ChangeIcon = {
    increase: ArrowUp,
    decrease: ArrowDown,
    neutral: Minus,
  }[changeType];

  const changeColor = {
    increase: 'text-emerald-600 dark:text-emerald-400',
    decrease: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  }[changeType];

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">{title}</h3>
        <Icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>
      <div className="mt-4">
        <p className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{value}</p>
      </div>
      <div className="mt-4 flex items-center space-x-1 text-sm">
        {change && <ChangeIcon className={cn('h-4 w-4', changeColor)} />}
        {change && <span className={cn('font-semibold', changeColor)}>{change}</span>}
        {footerText && <span className="text-gray-500 dark:text-gray-400">{footerText}</span>}
      </div>
    </div>
  );
}