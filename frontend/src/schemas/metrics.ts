import { z } from "zod";

export const MetricsResponseSchema = z.object({
  accuracy: z.number().min(0).max(1),
  fp_rate: z.number().min(0).max(0.1),
  correlation: z.number().min(0).max(1),
  latency: z.number().min(0).max(10),
});
