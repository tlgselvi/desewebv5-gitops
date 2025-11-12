import { z } from 'zod';
/**
 * Feedback entry schema for validation
 */
export declare const FeedbackSchema: z.ZodObject<{
    source: z.ZodDefault<z.ZodEnum<{
        api: "api";
        ui: "ui";
        agent: "agent";
    }>>;
    type: z.ZodDefault<z.ZodEnum<{
        bug: "bug";
        idea: "idea";
        noise: "noise";
    }>>;
    note: z.ZodString;
    severity: z.ZodDefault<z.ZodEnum<{
        low: "low";
        med: "med";
        high: "high";
    }>>;
    metric: z.ZodString;
    anomaly: z.ZodBoolean;
    verdict: z.ZodBoolean;
    comment: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Feedback = z.infer<typeof FeedbackSchema>;
//# sourceMappingURL=feedback.d.ts.map