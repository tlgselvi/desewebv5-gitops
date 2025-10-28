import { onCLS, onLCP, onFCP, onTTFB, onINP, type Metric } from 'web-vitals'

// Enhanced Web Vitals collection with better error handling and retry logic
function sendToAnalytics(metric: Metric) {
  const payload = {
    ...metric,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
  }

  // Send to our API endpoint with retry logic
  const sendWithRetry = async (retries = 3) => {
    try {
      const response = await fetch('/api/metrics/vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok && retries > 0) {
        throw new Error(`HTTP ${response.status}`)
      }

      if (response.ok) {
        console.log(`Web Vitals sent: ${metric.name}=${metric.value}ms`)
      }
    } catch (error) {
      console.warn(`Failed to send Web Vitals metric (${metric.name}):`, error)
      
      if (retries > 0) {
        // Exponential backoff retry
        setTimeout(() => sendWithRetry(retries - 1), Math.pow(2, 3 - retries) * 1000)
      }
    }
  }

  sendWithRetry()
}

export function registerWebVitals() {
  // Register all Core Web Vitals
  onCLS(sendToAnalytics)
  onLCP(sendToAnalytics)
  onFCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
  onINP(sendToAnalytics)
  
  console.log('Web Vitals collection initialized')
}