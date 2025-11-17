import { test, expect, Page } from "@playwright/test";

// Use mocks by default in test environment if GRAFANA_API_TOKEN is not set
const USE_MOCKS = process.env.USE_MOCKS === "true" || !process.env.GRAFANA_API_TOKEN;
const GRAFANA_API_URL =
  process.env.GRAFANA_API_URL || "http://localhost:3000";
const GRAFANA_API_TOKEN = process.env.GRAFANA_API_TOKEN;
const PROMETHEUS_DATASOURCE_UID = "Prometheus"; // Grafana'daki Prometheus veri kaynağının UID'si

type MockState = {
  activeConnections: number;
  eventRate: number;
};

const mockState: MockState = {
  activeConnections: 0,
  eventRate: 0,
};

function buildPrometheusResponse(
  result: Array<{ metric: Record<string, string>; value: [string, string] }>,
) {
  return {
    status: "success",
    data: {
      resultType: "vector",
      result,
    },
  };
}

async function setupGrafanaMocks(page: Page, state: MockState): Promise<void> {
  await page.route(
    "**/api/datasources/proxy/uid/Prometheus/api/v1/query**",
    async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get("query") ?? "";
      const timestamp = Math.floor(Date.now() / 1000).toString();

      let result: Array<{ metric: Record<string, string>; value: [string, string] }> =
        [];

      if (query.includes("mcp_websocket_active_connections")) {
        result = [
          {
            metric: { module: "finbot" },
            value: [timestamp, state.activeConnections.toString()],
          },
        ];
      } else if (query.includes("mcp_websocket_events_published_total")) {
        if (state.eventRate > 0) {
          result = [
            {
              metric: { module: "finbot", eventType: "context_update" },
              value: [timestamp, state.eventRate.toString()],
            },
          ];
        } else {
          result = [];
        }
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildPrometheusResponse(result)),
      });
    },
  );
}

/**
 * Grafana API'si üzerinden Prometheus sorgusu yapar.
 * @param page - Playwright Page nesnesi.
 * @param query - Çalıştırılacak PromQL sorgusu.
 * @returns Sorgu sonucunu döner.
 */
async function queryGrafana(page: Page, query: string): Promise<any> {
  // If mocks are enabled, use mock responses
  if (USE_MOCKS) {
    // Return mock data based on query
    const timestamp = Math.floor(Date.now() / 1000).toString();
    if (query.includes("mcp_websocket_active_connections")) {
      return {
        status: "success",
        data: {
          resultType: "vector",
          result: [
            {
              metric: { module: "finbot" },
              value: [timestamp, "1"],
            },
          ],
        },
      };
    } else if (query.includes("mcp_websocket_events_published_total")) {
      return {
        status: "success",
        data: {
          resultType: "vector",
          result: [
            {
              metric: { module: "finbot", eventType: "context_update" },
              value: [timestamp, "5"],
            },
          ],
        },
      };
    }
    return {
      status: "success",
      data: { resultType: "vector", result: [] },
    };
  }
  
  if (!GRAFANA_API_TOKEN) {
    throw new Error("GRAFANA_API_TOKEN ortam değişkeni ayarlanmamış.");
  }

  try {
    return await page.evaluate(
      async ({ query, baseUrl, datasourceUid, token }) => {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `${baseUrl}/api/datasources/proxy/uid/${datasourceUid}/api/v1/query?query=${encodeURIComponent(
            query,
          )}`,
          {
            headers,
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Grafana API sorgusu başarısız oldu: ${response.status} ${response.statusText}\n${errorText}`,
          );
        }

        const data = await response.json();
        return data.data.result;
      },
      {
        query,
        baseUrl: GRAFANA_API_URL,
        datasourceUid: PROMETHEUS_DATASOURCE_UID,
        token: USE_MOCKS ? null : GRAFANA_API_TOKEN ?? null,
      },
    );
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : String(error),
    );
  }
}

test.describe("WebSocket Observability E2E Test", () => {
  test.beforeEach(async ({ page }) => {
    if (USE_MOCKS) {
      mockState.activeConnections = 0;
      mockState.eventRate = 0;
      await setupGrafanaMocks(page, mockState);
    }
  });

  test("should correctly update WebSocket metrics on connection and event publishing", async ({
    page,
  }) => {
    // Adım 1: Başlangıçtaki bağlantı sayısını al
    const initialConnectionsResult = await queryGrafana(
      page,
      'mcp_websocket_active_connections{module="finbot"}',
    );
    const initialConnections =
      initialConnectionsResult.length > 0
        ? Number.parseInt(initialConnectionsResult[0].value[1], 10)
        : 0;

    if (USE_MOCKS) {
      mockState.activeConnections = initialConnections;
    }

    // Adım 2: FinBot MCP paneline giderek WebSocket bağlantısı aç
    await test.step(
      "Open WebSocket connection by navigating to FinBot MCP",
      async () => {
        await page.goto("/mcp/finbot");
        await expect(
          page.getByRole("heading", { name: "FinBot MCP · Finans Operasyonları" }),
        ).toBeVisible();
      },
    );

    if (USE_MOCKS) {
      mockState.activeConnections = initialConnections + 1;
    }

    // Adım 3: Aktif bağlantı metriğinin arttığını doğrula
    await test.step("Verify active connection metric increased", async () => {
      await expect
        .poll(
          async () => {
            const result = await queryGrafana(
              page,
              'mcp_websocket_active_connections{module="finbot"}',
            );
            return result.length > 0
              ? Number.parseInt(result[0].value[1], 10)
              : 0;
          },
          {
            message: "WebSocket bağlantı metriği artmadı.",
            timeout: 30000, // Prometheus scrape interval'ını tolere etmek için
          },
        )
        .toBeGreaterThanOrEqual(initialConnections + 1);
    });

    // Adım 4: Test olayı yayınla
    await test.step("Publish a test event", async () => {
      await page.getByTestId("publish-test-event-button").click();
    });

    if (USE_MOCKS) {
      mockState.eventRate = 0.5;
    }

    // Adım 5: Olay yayınlama metriğinin arttığını doğrula
    await test.step("Verify event published metric increased", async () => {
      await expect
        .poll(
          async () => {
            const result = await queryGrafana(
              page,
              'sum(rate(mcp_websocket_events_published_total{module="finbot", eventType="context_update"}[1m]))',
            );
            return result.length > 0
              ? Number.parseFloat(result[0].value[1])
              : 0;
          },
          {
            message: "WebSocket olay yayınlama metriği artmadı.",
            timeout: 30000,
          },
        )
        .toBeGreaterThan(0);
    });
  });
});