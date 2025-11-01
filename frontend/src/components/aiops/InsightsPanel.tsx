"use client";
import { useState, useEffect } from "react";
import { apiMethods, getErrorMessage } from "@/api/client";

interface FeedbackEntry {
  timestamp: number;
  metric: string;
  anomaly: boolean;
  verdict: boolean;
  comment: string;
}

interface FeedbackResponse {
  success: boolean;
  count: number;
  feedback: FeedbackEntry[];
}

export default function InsightsPanel() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await apiMethods.get<FeedbackResponse>("/aiops/feedback");
        if (data.success) {
          setFeedback(data.feedback);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <h2 className="font-bold text-lg mb-2">AIOps Insights</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <h2 className="font-bold text-lg mb-2">AIOps Insights</h2>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">AIOps Insights</h2>
        {feedback.length > 0 && (
          <span className="text-sm text-gray-500">
            {feedback.length} {feedback.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {feedback.length === 0 ? (
        <p className="text-gray-500">No feedback yet.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {feedback
            .slice()
            .reverse()
            .map((f, i) => (
              <div
                key={i}
                className="p-3 border-b last:border-b-0 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">
                      {f.metric}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded ${
                          f.verdict
                            ? "bg-green-200 text-green-800"
                            : "bg-red-200 text-red-800"
                        }`}
                      >
                        {f.verdict ? "✅ True" : "❌ False"}
                      </span>
                      {f.anomaly && (
                        <span className="px-2 py-1 rounded bg-orange-200 text-orange-800">
                          ⚠️ Anomaly
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(f.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {f.comment && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    "{f.comment}"
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
