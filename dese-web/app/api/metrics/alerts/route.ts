import { NextRequest, NextResponse } from 'next/server'

// In-memory store for alerts (in production, use Redis or database)
const alertsStore: Array<{
  id: string
  type: string
  severity: string
  drift: number
  metrics: any
  timestamp: string
  suggestions: string[]
  status: 'active' | 'acknowledged' | 'resolved'
}> = []

export async function POST(request: NextRequest) {
  try {
    const alert = await request.json()
    
    // Validate the alert data
    const { type, severity, drift, metrics, timestamp, suggestions } = alert
    
    if (!type || !severity || typeof drift !== 'number') {
      return NextResponse.json(
        { error: 'Invalid alert data' },
        { status: 400 }
      )
    }
    
    // Create alert record
    const alertRecord = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      drift,
      metrics,
      timestamp: timestamp || new Date().toISOString(),
      suggestions: suggestions || [],
      status: 'active' as const
    }
    
    // Store the alert
    alertsStore.push(alertRecord)
    
    // Keep only last 100 alerts to prevent memory issues
    if (alertsStore.length > 100) {
      alertsStore.splice(0, alertsStore.length - 100)
    }
    
    // Log for debugging (in production, send to monitoring system)
    console.log(`🚨 AIOps Alert: ${type} (${severity})`, {
      drift: `${drift.toFixed(1)}%`,
      timestamp: alertRecord.timestamp,
      suggestions: suggestions?.length || 0
    })
    
    // In a real implementation, you would:
    // 1. Send to PagerDuty/Slack/email
    // 2. Store in time-series database
    // 3. Trigger automated remediation
    // 4. Update Grafana dashboards
    
    return NextResponse.json({ 
      success: true, 
      alertId: alertRecord.id,
      message: 'Alert processed successfully'
    })
    
  } catch (error) {
    console.error('AIOps Alert API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return recent alerts for debugging
  const recent = alertsStore.slice(-10)
  
  return NextResponse.json({
    alerts: recent,
    total: alertsStore.length,
    active: alertsStore.filter(a => a.status === 'active').length
  })
}
