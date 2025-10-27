import DriftPanel from "@/components/aiops/DriftPanel";
import InsightsPanel from "@/components/aiops/InsightsPanel";
import ReplayTimeline from "@/components/aiops/ReplayTimeline";

export default function AIOpsPage() {
  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AIOps Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time system drift monitoring and anomaly detection
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DriftPanel />

          <div className="p-4 rounded bg-white border-2 border-gray-200">
            <h2 className="font-bold text-lg mb-2">System Health</h2>
            <p className="text-gray-600">Coming soon</p>
          </div>

          <div className="p-4 rounded bg-white border-2 border-gray-200">
            <h2 className="font-bold text-lg mb-2">Performance Metrics</h2>
            <p className="text-gray-600">Coming soon</p>
          </div>
        </div>

        {/* Insights Panel */}
        <div className="mt-6">
          <InsightsPanel />
        </div>

        {/* Replay Timeline */}
        <div className="mt-6">
          <ReplayTimeline />
        </div>
      </div>
    </main>
  );
}
