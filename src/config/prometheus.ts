import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

// Load environment variables
dotenvConfig();

// Prometheus configuration schema
const prometheusConfigSchema = z.object({
  url: z.string().default("http://prometheus:9090"),
  enabled: z.boolean().default(true),
  pushGatewayUrl: z.string().optional(),
  scrapeInterval: z.string().default("15s"),
  timeout: z.coerce.number().default(10000),
});

// Parse and validate Prometheus configuration
const rawPrometheusConfig = {
  url: process.env.PROMETHEUS_URL || process.env.PROM_URL,
  enabled: process.env.PROMETHEUS_ENABLED !== "false",
  pushGatewayUrl: process.env.PROMETHEUS_PUSHGATEWAY_URL,
  scrapeInterval: process.env.PROMETHEUS_SCRAPE_INTERVAL,
  timeout: process.env.PROMETHEUS_TIMEOUT,
};

const parsedConfig = prometheusConfigSchema.parse(rawPrometheusConfig);

// Export Prometheus URL (PROM_URL)
export const PROM_URL = parsedConfig.url;

// Export full Prometheus configuration
export const prometheusConfig = {
  url: PROM_URL,
  enabled: parsedConfig.enabled,
  pushGatewayUrl: parsedConfig.pushGatewayUrl,
  scrapeInterval: parsedConfig.scrapeInterval,
  timeout: parsedConfig.timeout,
};

// Type exports
export type PrometheusConfig = z.infer<typeof prometheusConfigSchema>;

