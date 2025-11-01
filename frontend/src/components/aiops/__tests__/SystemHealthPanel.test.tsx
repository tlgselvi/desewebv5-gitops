import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SystemHealthPanel from "../SystemHealthPanel";

describe("SystemHealthPanel", () => {
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

    render(<SystemHealthPanel />);
    expect(screen.getByText("System Health")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    render(<SystemHealthPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it("renders healthy system data", async () => {
    const mockHealthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: 3600,
      version: "5.0.0",
      environment: "production",
      database: "connected",
      memory: {
        used: 512,
        total: 1024,
      },
      services: {
        database: true,
        redis: true,
        openai: true,
        lighthouse: true,
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockHealthData,
    } as Response);

    render(<SystemHealthPanel />);

    await waitFor(() => {
      expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
    });

    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("Redis")).toBeInTheDocument();
  });

  it("renders unhealthy system data", async () => {
    const mockHealthData = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: 3600,
      version: "5.0.0",
      environment: "production",
      database: "disconnected",
      memory: {
        used: 512,
        total: 1024,
      },
      services: {
        database: false,
        redis: false,
        openai: true,
        lighthouse: true,
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockHealthData,
    } as Response);

    render(<SystemHealthPanel />);

    await waitFor(() => {
      expect(screen.getByText("System Issues Detected")).toBeInTheDocument();
    });
  });
});

