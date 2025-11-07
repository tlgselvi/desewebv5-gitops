import { z } from "zod";
declare const prometheusConfigSchema: z.ZodObject<{
    url: z.ZodDefault<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    pushGatewayUrl: z.ZodOptional<z.ZodString>;
    scrapeInterval: z.ZodDefault<z.ZodString>;
    timeout: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const PROM_URL: string;
export declare const prometheusConfig: {
    url: string;
    enabled: boolean;
    pushGatewayUrl: string | undefined;
    scrapeInterval: string;
    timeout: number;
};
export type PrometheusConfig = z.infer<typeof prometheusConfigSchema>;
export {};
//# sourceMappingURL=prometheus.d.ts.map