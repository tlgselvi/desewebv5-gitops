import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import PerformanceMetricsPanel from "../PerformanceMetricsPanel";

describe("PerformanceMetricsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise(() => {
          // Never resolve to keep loading
        })
    );

    render(<PerformanceMetricsPanel />);
    expect(screen.getByText("Performance Metrics")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    render(<PerformanceMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it("parses and renders Prometheus metrics", async () => {
    const mockMetricsText = `
# HELP http_requests_total Total number of HTTP requests
http_requests_total{method="GET",route="/api/v1/health",status_code="200"} 150
http_requests_total{method="POST",route="/api/v1/feedback",status_code="201"} 25

# HELP http_requests_in_progress Number of HTTP requests currently in progress
http_requests_in_progress{method="GET",route="/api/v1/health"} 2

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
http_request_duration_seconds{method="GET",route="/api/v1/health",status_code="200"} 0.05

# HELP database_connections_active Number of active database connections
database_connections_active 10

# HELP process_resident_memory_bytes Resident memory size in bytes
process_resident_memory_bytes 268435456

# HELP seo_analysis_total Total number of SEO analyses performed
seo_analysis_total{project_id="1",analysis_type="full"} 50

# HELP content_generation_total Total number of content generations
content_generation_total{project_id="1",content_type="article"} 30

# HELP seo_alerts_total Total number of SEO alerts generated
seo_alerts_total{project_id="1",alert_type="critical",severity="high"} 5
`;

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => mockMetricsText,
    } as Response);

    render(<PerformanceMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Real-time Monitoring")).toBeInTheDocument();
    });

    // Check that metrics are displayed
    expect(screen.getByText(/Total Requests:/)).toBeInTheDocument();
    expect(screen.getByText(/Active Connections:/)).toBeInTheDocument();
  });

  it("handles empty metrics gracefully", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);

    render(<PerformanceMetricsPanel />);

    await waitFor(() => {
      expect(screen.getByText("No data available")).toBeInTheDocument();
    });
  });
});

