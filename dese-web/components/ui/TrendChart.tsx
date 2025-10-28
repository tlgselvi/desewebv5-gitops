'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendChartDatum {
	timestamp: string
	[key: string]: string | number
}

interface TrendChartProps {
	data: TrendChartDatum[]
	dataKey: string
	color?: string
	height?: number
	className?: string
}

export function TrendChart({ 
  data, 
  dataKey, 
  color = '#3b82f6', 
  height = 200,
  className = '' 
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="timestamp" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value) => [value as number, dataKey]}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
