import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  trend?: 'up' | 'down' | 'stable'
  status?: 'success' | 'warning' | 'error'
  subtitle?: string
  className?: string
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  status, 
  subtitle,
  className = '' 
}: MetricCardProps) {
  const statusColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
  }

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus
  }

  const TrendIcon = trend ? trendIcons[trend] : null

  return (
    <div className={`bg-card border rounded-lg p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${status ? statusColors[status] : ''}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <Icon size={24} className={status ? statusColors[status] : 'text-muted-foreground'} />
      </div>
      {trend && TrendIcon && (
        <div className={`mt-2 text-sm ${trendColors[trend]} flex items-center gap-1`}>
          <TrendIcon size={16} />
          <span>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} vs last hour
          </span>
        </div>
      )}
    </div>
  )
}
