import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

// Simple in-memory store for Web Vitals (in production, use Redis or database)
const webVitalsStore: Array<{
  metric: string
  value: number
  timestamp: number
  url: string
  userAgent: string
}> = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the Web Vitals data
    const { name, value, id, rating, timestamp, url, userAgent } = body
    
    if (!name || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid Web Vitals data' },
        { status: 400 }
      )
    }
    
    // Store the metric
    webVitalsStore.push({
      metric: name,
      value,
      timestamp: timestamp || Date.now(),
      url: url || 'unknown',
      userAgent: userAgent || 'unknown',
    })
    
    // Keep only last 1000 entries to prevent memory issues
    if (webVitalsStore.length > 1000) {
      webVitalsStore.splice(0, webVitalsStore.length - 1000)
    }
    
    // Log for debugging (in production, send to your observability platform)
    logger.info(`Web Vitals: ${name}`, {
      metric: name,
      value,
      rating,
      timestamp,
      url,
    })
    
    // In a real implementation, you would:
    // 1. Send to OpenTelemetry collector
    // 2. Push to Prometheus metrics
    // 3. Store in time-series database
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    logger.error('Web Vitals API error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return recent Web Vitals data for debugging
  const recent = webVitalsStore.slice(-10)
  
  return NextResponse.json({
    metrics: recent,
    total: webVitalsStore.length,
  })
}
