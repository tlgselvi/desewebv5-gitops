"use client";

import { useState, useEffect } from "react";

interface ConnectionStatus {
  status: string;
  chromeAvailable: boolean;
  connections: number;
  activeConnections: number;
}

interface BrowserConnection {
  id: string;
  browserType: string;
  cdpUrl: string;
  wsEndpoint?: string;
  status: "connected" | "disconnected" | "error";
  connectedAt?: string;
}

export default function ToolsPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connections, setConnections] = useState<BrowserConnection[]>([]);
  const [cdpUrl, setCdpUrl] = useState("");
  const [connectionType, setConnectionType] = useState<"cdp" | "launch">("cdp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    fetchConnections();
  }, []);

  const fetchStatus = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
      const response = await fetch(`${apiUrl}/browser-automation/status`, {
        headers: {
          "X-Master-Control-CLI": "true",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch status");
      const data = await response.json();
      setConnectionStatus(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchConnections = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
      const response = await fetch(`${apiUrl}/browser-automation/connections`, {
        headers: {
          "X-Master-Control-CLI": "true",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch connections");
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (err: any) {
      console.error("Failed to fetch connections", err);
    }
  };

  const handleConnect = async () => {
    if (connectionType === "cdp" && !cdpUrl.trim()) {
      setError("CDP Connection URL is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
      const endpoint =
        connectionType === "cdp"
          ? `${apiUrl}/browser-automation/connect`
          : `${apiUrl}/browser-automation/launch`;

      const body =
        connectionType === "cdp"
          ? { cdpUrl, browserType: "chrome" }
          : { headless: false, args: [] };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Control-CLI": "true",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Connection failed");
      }

      await fetchConnections();
      await fetchStatus();
      setCdpUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
      const response = await fetch(
        `${apiUrl}/browser-automation/connections/${connectionId}/disconnect`,
        {
          method: "POST",
          headers: {
            "X-Master-Control-CLI": "true",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Disconnection failed");
      }

      await fetchConnections();
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Browser</p>
      </div>

      {/* Browser Automation Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            {connectionStatus?.chromeAvailable && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Browser Automation</h2>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {connectionStatus?.chromeAvailable
              ? "Ready (Chrome detected)"
              : "Chrome not detected"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Type
            </label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value as "cdp" | "launch")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cdp">CDP Connection</option>
              <option value="launch">Launch New Browser</option>
            </select>
          </div>

          {/* CDP Connection URL */}
          {connectionType === "cdp" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CDP Connection URL
              </label>
              <input
                type="text"
                value={cdpUrl}
                onChange={(e) => setCdpUrl(e.target.value)}
                placeholder="e.g., ws://127.0.0.1:9222/devtools/browser/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Connecting..." : connectionType === "cdp" ? "Connect" : "Launch Browser"}
          </button>
        </div>

        {/* Active Connections */}
        {connections.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Active Connections</h3>
            <div className="space-y-2">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {conn.browserType.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{conn.cdpUrl}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Status: {conn.status} |{" "}
                      {conn.connectedAt && new Date(conn.connectedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    disabled={loading}
                    className="ml-3 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

