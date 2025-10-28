import { z } from 'zod';

/**
 * Feedback entry schema for validation
 */
export const FeedbackSchema = z.object({
  source: z.enum(['ui', 'api', 'agent']).default('ui'),
  type: z.enum(['bug', 'idea', 'noise']).default('bug'),
  note: z.string().min(1).max(500),
  severity: z.enum(['low', 'med', 'high']).default('low'),
  metric: z.string().min(1),
  anomaly: z.boolean(),
  verdict: z.boolean(),
  comment: z.string().optional(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

