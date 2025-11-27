"use client"

/**
 * Dashboard Skeleton Component
 * 
 * Provides a loading skeleton that matches the dashboard layout.
 * Improves perceived performance by showing content structure immediately.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * KPI Card skeleton
 */
function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

/**
 * Chart skeleton
 */
function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[350px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

/**
 * Transaction list item skeleton
 */
function TransactionItemSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

/**
 * Recent transactions card skeleton
 */
function TransactionsCardSkeleton() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <TransactionItemSkeleton key={i} />
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * AI Insights card skeleton
 */
function AIInsightsSkeleton() {
  return (
    <Card className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/50 dark:to-purple-950/50">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <Skeleton className="h-5 w-5 mr-2 rounded" />
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-3 w-80" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Full Dashboard Skeleton
 * Shows the complete dashboard layout with skeleton loading state
 */
export function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <Skeleton className="h-9 w-48" />
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* AI Insights */}
      <div className="grid gap-4 md:grid-cols-1">
        <AIInsightsSkeleton />
      </div>

      {/* Charts and Transactions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <ChartSkeleton className="col-span-4" />
        <TransactionsCardSkeleton />
      </div>
    </div>
  )
}

/**
 * Simple Page Skeleton
 * Generic skeleton for any page with a header and content area
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      
      {/* Content */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                  <Skeleton className="h-3 w-full max-w-[150px]" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Table Skeleton
 * Skeleton for data tables
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border animate-in fade-in duration-300">
      {/* Table Header */}
      <div className="border-b bg-muted/50 p-4">
        <div className="flex gap-4">
          {[...Array(columns)].map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      
      {/* Table Body */}
      <div className="divide-y">
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex gap-4">
              {[...Array(columns)].map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  className="h-4 flex-1" 
                  style={{ 
                    width: `${Math.random() * 40 + 60}%` 
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * IoT Dashboard Skeleton
 */
export function IoTDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
      
      {/* Table */}
      <TableSkeleton rows={6} columns={5} />
    </div>
  )
}

export default DashboardSkeleton

