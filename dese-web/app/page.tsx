import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Activity, BarChart3, AlertTriangle } from 'lucide-react'

export default function Home() {
  return (
    <>
      {/* Preload critical resources for LCP optimization */}
      <link rel="preload" href="/api/aiops/metrics" as="fetch" crossOrigin="anonymous" />
      <link rel="preload" href="/api/aiops/health" as="fetch" crossOrigin="anonymous" />
      
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Dese Web v5.8.0</h1>
          <p className="text-xl text-muted-foreground">
            Enhanced AIOps Platform with Predictive Correlation
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Advanced anomaly detection, correlation engine, and automated remediation 
            for enterprise-grade observability and incident response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            href="/aiops" 
            className="group bg-card border rounded-lg p-6 hover:shadow-md transition-all hover:border-primary"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary">AIOps Dashboard</h3>
                <p className="text-sm text-muted-foreground">Real-time monitoring</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link 
            href="/metrics" 
            className="group bg-card border rounded-lg p-6 hover:shadow-md transition-all hover:border-primary"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary">Metrics</h3>
                <p className="text-sm text-muted-foreground">Performance analytics</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link 
            href="/alerts" 
            className="group bg-card border rounded-lg p-6 hover:shadow-md transition-all hover:border-primary"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary">Alerts</h3>
                <p className="text-sm text-muted-foreground">Incident management</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Sprint 2.6 Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Enhanced Anomaly Detection</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• p95/p99 percentile analysis</li>
                <li>• Z-score based detection (0.89 accuracy)</li>
                <li>• Trend deviation analysis</li>
                <li>• Critical anomaly alerts</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Integration & Testing</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• E2E tests: 45/45 passed (100%)</li>
                <li>• Performance: p95 latency 187ms</li>
                <li>• Correlation accuracy: 0.89</li>
                <li>• Remediation success: 0.92</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}