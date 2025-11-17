"use client";

import React from 'react';
import { Clock, GitBranch, Layers } from 'lucide-react';
import { StatusBadge, StatusBadgeProps } from '@/components/ui/StatusBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IncidentCardProps {
  id: string;
  title: string;
  duration: string;
  resolution: string;
  systems: string[];
  status: StatusBadgeProps['status'];
}

export function IncidentCard({
  id,
  title,
  duration,
  resolution,
  systems,
  status,
}: IncidentCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
          {id}
        </span>
        <StatusBadge status={status} />
      </div>
      <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="mt-2 flex-grow text-sm text-gray-600 dark:text-gray-300">
        {resolution}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-default items-center">
                  <Clock className="mr-1.5 h-4 w-4" />
                  <span>{duration}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Olayın çözüm süresi</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-default items-center">
                  <Layers className="mr-1.5 h-4 w-4" />
                  <span>{systems.length} Sistem</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Etkilenen sistemler: {systems.join(', ')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex -space-x-2">
          {systems.slice(0, 3).map((system) => (
            <span
              key={system}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-bold text-gray-600 dark:border-gray-800 dark:bg-gray-600 dark:text-gray-200"
              title={system}
            >
              {system.substring(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}