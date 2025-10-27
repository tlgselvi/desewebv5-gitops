import { describe, it, expect } from "vitest";
import { MetricsResponseSchema } from "../schemas/metrics";

describe("MetricsResponseSchema", () => {
  it("accepts valid data", () => {
    const data = { accuracy: 0.9, fp_rate: 0.03, correlation: 0.9, latency: 5 };
    expect(MetricsResponseSchema.parse(data)).toBeTruthy();
  });

  it("rejects invalid data", () => {
    const data = { accuracy: 1.5, fp_rate: -0.1, correlation: "high", latency: 15 };
    expect(() => MetricsResponseSchema.parse(data)).toThrow();
  });
});
