import { z } from "zod";

export const AIOpsResponseSchema = z.object({
  drift_rate: z.number().min(0).max(1),
  alert_count: z.number().min(0),
  feedback_events: z.number().min(0),
});
