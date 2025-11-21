import { config as dotenvConfig } from "dotenv";
import { z } from "zod";
// Load environment variables
dotenvConfig();
// Configuration schema validation
const configSchema = z.object({
    // Server Configuration
    port: z.coerce.number().default(3001),
    nodeEnv: z.enum(["development", "production", "test"]).default("development"),
    apiVersion: z.string().default("v1"),
    corsOrigin: z.string().default("http://localhost:3001"),
    // Database Configuration
    database: z.object({
        url: z
            .string()
            .default("postgresql://dese:dese123@localhost:5432/dese_ea_plan_v5"),
        host: z.string().default("localhost"),
        port: z.coerce.number().default(5432),
        name: z.string().default("dese_ea_plan_v5"),
        user: z.string().default("dese"),
        password: z.string().default("dese123"),
    }),
    // Redis Configuration
    redis: z.object({
        url: z.string().default("redis://localhost:6379"),
        host: z.string().default("localhost"),
        port: z.coerce.number().default(6379),
        password: z.string().optional(),
    }),
    // Security Configuration
    security: z.object({
        jwtSecret: z
            .string()
            .default("ea-plan-master-control-v6.8.1-super-secret-jwt-key-min-32-chars"),
        jwtExpiresIn: z.string().default("24h"),
        bcryptRounds: z.coerce.number().default(12),
        rateLimitWindowMs: z.coerce.number().default(900000), // 15 minutes
        rateLimitMaxRequests: z.coerce.number().default(100),
        cookieKey: z
            .string()
            .default("ea-plan-master-control-v6.8.2-cookie-session-secret-key-min-32-chars"),
    }),
    // External APIs
    apis: z.object({
        openai: z.object({
            apiKey: z.string().optional(),
        }),
        google: z.object({
            searchConsoleApiKey: z.string().optional(),
            businessApiKey: z.string().optional(),
            mapsApiKey: z.string().optional(),
            oauth: z.object({
                clientId: z.string().optional(),
                clientSecret: z.string().optional(),
                callbackUrl: z.string().url().default("http://localhost:3000/api/v1/auth/google/callback"),
            }).optional(),
        }),
        ahrefs: z.object({
            apiKey: z.string().optional(),
        }),
        lighthouse: z.object({
            ciToken: z.string().optional(),
        }),
    }),
    // Monitoring & Observability
    monitoring: z.object({
        prometheus: z.boolean().default(true),
        grafana: z.boolean().default(true),
        loki: z.boolean().default(true),
        tempo: z.boolean().default(true),
        openTelemetry: z.boolean().default(true),
    }),
    mcpDashboard: z
        .object({
        prometheus: z
            .object({
            baseUrl: z.string().url().optional(),
            authToken: z.string().optional(),
            timeoutMs: z.coerce.number().optional(),
        })
            .default({}),
        cache: z
            .object({
            ttlSeconds: z.coerce.number().min(1).default(60),
        })
            .default({ ttlSeconds: 60 }),
        finbot: z
            .object({
            healthEndpoints: z
                .object({
                api: z.string().url().optional(),
                redis: z.string().url().optional(),
                forecast: z.string().url().optional(),
                kyverno: z.string().url().optional(),
            })
                .default({}),
            metricsQueries: z
                .object({
                cpuUsage: z.string().optional(),
                memoryUsage: z.string().optional(),
                activeSessions: z.string().optional(),
                apiLatency: z.string().optional(),
            })
                .default({}),
        })
            .default({ healthEndpoints: {}, metricsQueries: {} }),
        aiops: z
            .object({
            healthEndpoints: z
                .object({
                api: z.string().url().optional(),
                correlation: z.string().url().optional(),
                anomaly: z.string().url().optional(),
                ingestion: z.string().url().optional(),
            })
                .default({}),
            metricsQueries: z
                .object({
                modelCpu: z.string().optional(),
                modelMemory: z.string().optional(),
                anomaliesDetected: z.string().optional(),
                ingestionDelay: z.string().optional(),
            })
                .default({}),
        })
            .default({ healthEndpoints: {}, metricsQueries: {} }),
        mubot: z
            .object({
            healthEndpoints: z
                .object({
                api: z.string().url().optional(),
                postgres: z.string().url().optional(),
                ingestion: z.string().url().optional(),
                reconciliation: z.string().url().optional(),
            })
                .default({}),
            metricsQueries: z
                .object({
                recordsProcessed: z.string().optional(),
                dbWriteLatency: z.string().optional(),
                reconciliationRate: z.string().optional(),
                dataQualityScore: z.string().optional(),
            })
                .default({}),
        })
            .default({ healthEndpoints: {}, metricsQueries: {} }),
        observability: z
            .object({
            healthEndpoints: z
                .object({
                prometheus: z.string().url().optional(),
                grafana: z.string().url().optional(),
                loki: z.string().url().optional(),
                tempo: z.string().url().optional(),
            })
                .default({}),
            metricsQueries: z
                .object({
                activeTargets: z.string().optional(),
                totalTargets: z.string().optional(),
                logIngestion: z.string().optional(),
                activeAlerts: z.string().optional(),
                queryLatency: z.string().optional(),
            })
                .default({}),
        })
            .default({ healthEndpoints: {}, metricsQueries: {} }),
    })
        .default({
        prometheus: {},
        cache: { ttlSeconds: 60 },
        finbot: { healthEndpoints: {}, metricsQueries: {} },
        aiops: { healthEndpoints: {}, metricsQueries: {} },
        mubot: { healthEndpoints: {}, metricsQueries: {} },
        observability: { healthEndpoints: {}, metricsQueries: {} },
    }),
    // Kubernetes & GitOps
    kubernetes: z.object({
        kubeconfigPath: z.string().default("~/.kube/config"),
        argocdServer: z.string().optional(),
        argocdToken: z.string().optional(),
        helmRepoUrl: z.string().optional(),
    }),
    // Security & Compliance
    compliance: z.object({
        opa: z.boolean().default(true),
        kyverno: z.boolean().default(true),
        networkPolicy: z.boolean().default(true),
        externalSecrets: z.boolean().default(true),
        cosign: z.boolean().default(true),
        trivy: z.boolean().default(true),
        syft: z.boolean().default(true),
    }),
    // SEO Configuration
    seo: z.object({
        primaryKeywords: z
            .array(z.string())
            .default(["en iyi havuz firması", "havuz kime yaptırılır"]),
        targetRegion: z.string().default("Türkiye"),
        targetDomainAuthority: z.coerce.number().default(50),
        targetCtrIncrease: z.coerce.number().default(25),
    }),
    // Content Generation
    content: z.object({
        eEatEnabled: z.boolean().default(true),
        qualityThreshold: z.coerce.number().min(0).max(1).default(0.8),
        landingPageTemplates: z.coerce.number().default(5),
    }),
    // Link Building
    linkBuilding: z.object({
        minDrThreshold: z.coerce.number().default(50),
        maxSpamScore: z.coerce.number().default(5),
        backlinkTargets: z.coerce.number().default(100),
    }),
    // Sprint Management
    sprint: z.object({
        durationDays: z.coerce.number().default(14),
        totalSprints: z.coerce.number().default(3),
        visibilitySprint: z.coerce.number().default(1),
        authoritySprint: z.coerce.number().default(2),
        topRankSprint: z.coerce.number().default(3),
    }),
    // Logging
    logging: z.object({
        level: z.enum(["error", "warn", "info", "debug"]).default("info"),
        format: z.enum(["json", "simple"]).default("json"),
        filePath: z.string().default("./logs/app.log"),
        maxSize: z.string().default("10m"),
        maxFiles: z.coerce.number().default(5),
    }),
    // File Upload
    upload: z.object({
        maxFileSize: z.coerce.number().default(10485760), // 10MB
        allowedFileTypes: z
            .array(z.string())
            .default(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
        uploadPath: z.string().default("./uploads"),
    }),
    // Email Configuration
    email: z.object({
        smtpHost: z.string().default("smtp.gmail.com"),
        smtpPort: z.coerce.number().default(587),
        smtpUser: z.string().optional(),
        smtpPass: z.string().optional(),
        fromEmail: z.string().default("noreply@dese.ai"),
        fromName: z.string().default("Dese EA Plan v5"),
    }),
    // SMS Configuration (Twilio)
    sms: z.object({
        accountSid: z.string().optional(),
        authToken: z.string().optional(),
        phoneNumber: z.string().optional(),
    }),
    // Payment Configuration (Stripe)
    payment: z.object({
        stripeSecretKey: z.string().optional(),
        stripePublishableKey: z.string().optional(),
        stripeWebhookSecret: z.string().optional(),
    }),
});
// Parse and validate configuration
const rawConfig = {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    apiVersion: process.env.API_VERSION,
    corsOrigin: process.env.CORS_ORIGIN,
    database: {
        url: process.env.DATABASE_URL,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    },
    redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    },
    security: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN,
        bcryptRounds: process.env.BCRYPT_ROUNDS,
        rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
        rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
        cookieKey: process.env.COOKIE_KEY,
    },
    apis: {
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
        },
        google: {
            searchConsoleApiKey: process.env.GOOGLE_SEARCH_CONSOLE_API_KEY,
            businessApiKey: process.env.GOOGLE_BUSINESS_API_KEY,
            mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
            oauth: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/v1/auth/google/callback",
            },
        },
        ahrefs: {
            apiKey: process.env.AHREFS_API_KEY,
        },
        lighthouse: {
            ciToken: process.env.LIGHTHOUSE_CI_TOKEN,
        },
    },
    monitoring: {
        prometheus: process.env.PROMETHEUS_ENABLED === "true",
        grafana: process.env.GRAFANA_ENABLED === "true",
        loki: process.env.LOKI_ENABLED === "true",
        tempo: process.env.TEMPO_ENABLED === "true",
        openTelemetry: process.env.OPENTELEMETRY_ENABLED === "true",
    },
    mcpDashboard: {
        prometheus: {
            baseUrl: process.env.MCP_PROMETHEUS_BASE_URL,
            authToken: process.env.MCP_PROMETHEUS_AUTH_TOKEN,
            timeoutMs: process.env.MCP_PROMETHEUS_TIMEOUT_MS,
        },
        cache: {
            ttlSeconds: process.env.MCP_CACHE_TTL_SECONDS,
        },
        finbot: {
            healthEndpoints: {
                api: process.env.MCP_FINBOT_API_HEALTH_URL,
                redis: process.env.MCP_FINBOT_REDIS_HEALTH_URL,
                forecast: process.env.MCP_FINBOT_FORECAST_HEALTH_URL,
                kyverno: process.env.MCP_FINBOT_KYVERNO_HEALTH_URL,
            },
            metricsQueries: {
                cpuUsage: process.env.MCP_FINBOT_PROM_QUERY_CPU_USAGE,
                memoryUsage: process.env.MCP_FINBOT_PROM_QUERY_MEMORY_USAGE,
                activeSessions: process.env.MCP_FINBOT_PROM_QUERY_ACTIVE_SESSIONS,
                apiLatency: process.env.MCP_FINBOT_PROM_QUERY_API_LATENCY,
            },
        },
        aiops: {
            healthEndpoints: {
                api: process.env.MCP_AIOPS_API_HEALTH_URL,
                correlation: process.env.MCP_AIOPS_CORRELATION_HEALTH_URL,
                anomaly: process.env.MCP_AIOPS_ANOMALY_HEALTH_URL,
                ingestion: process.env.MCP_AIOPS_INGESTION_HEALTH_URL,
            },
            metricsQueries: {
                modelCpu: process.env.MCP_AIOPS_PROM_QUERY_MODEL_CPU,
                modelMemory: process.env.MCP_AIOPS_PROM_QUERY_MODEL_MEMORY,
                anomaliesDetected: process.env.MCP_AIOPS_PROM_QUERY_ANOMALIES,
                ingestionDelay: process.env.MCP_AIOPS_PROM_QUERY_INGESTION_DELAY,
            },
        },
        mubot: {
            healthEndpoints: {
                api: process.env.MCP_MUBOT_API_HEALTH_URL,
                postgres: process.env.MCP_MUBOT_POSTGRES_HEALTH_URL,
                ingestion: process.env.MCP_MUBOT_INGESTION_HEALTH_URL,
                reconciliation: process.env.MCP_MUBOT_RECONCILIATION_HEALTH_URL,
            },
            metricsQueries: {
                recordsProcessed: process.env.MCP_MUBOT_PROM_QUERY_RECORDS_PROCESSED,
                dbWriteLatency: process.env.MCP_MUBOT_PROM_QUERY_DB_LATENCY,
                reconciliationRate: process.env.MCP_MUBOT_PROM_QUERY_RECON_RATE,
                dataQualityScore: process.env.MCP_MUBOT_PROM_QUERY_DATA_QUALITY,
            },
        },
        observability: {
            healthEndpoints: {
                prometheus: process.env.MCP_OBSERVABILITY_PROMETHEUS_HEALTH_URL,
                grafana: process.env.MCP_OBSERVABILITY_GRAFANA_HEALTH_URL,
                loki: process.env.MCP_OBSERVABILITY_LOKI_HEALTH_URL,
                tempo: process.env.MCP_OBSERVABILITY_TEMPO_HEALTH_URL,
            },
            metricsQueries: {
                activeTargets: process.env.MCP_OBSERVABILITY_PROM_QUERY_ACTIVE_TARGETS,
                totalTargets: process.env.MCP_OBSERVABILITY_PROM_QUERY_TOTAL_TARGETS,
                logIngestion: process.env.MCP_OBSERVABILITY_PROM_QUERY_LOG_INGESTION,
                activeAlerts: process.env.MCP_OBSERVABILITY_PROM_QUERY_ACTIVE_ALERTS,
                queryLatency: process.env.MCP_OBSERVABILITY_PROM_QUERY_QUERY_LATENCY,
            },
        },
    },
    kubernetes: {
        kubeconfigPath: process.env.KUBECONFIG_PATH,
        argocdServer: process.env.ARGOCD_SERVER,
        argocdToken: process.env.ARGOCD_TOKEN,
        helmRepoUrl: process.env.HELM_REPO_URL,
    },
    compliance: {
        opa: process.env.OPA_ENABLED === "true",
        kyverno: process.env.KYVERNO_ENABLED === "true",
        networkPolicy: process.env.NETWORK_POLICY_ENABLED === "true",
        externalSecrets: process.env.EXTERNAL_SECRETS_ENABLED === "true",
        cosign: process.env.COSIGN_ENABLED === "true",
        trivy: process.env.TRIVY_ENABLED === "true",
        syft: process.env.SYFT_ENABLED === "true",
    },
    seo: {
        primaryKeywords: process.env.PRIMARY_KEYWORDS?.split(",") || [
            "en iyi havuz firması",
            "havuz kime yaptırılır",
        ],
        targetRegion: process.env.TARGET_REGION || "Türkiye",
        targetDomainAuthority: process.env.TARGET_DOMAIN_AUTHORITY,
        targetCtrIncrease: process.env.TARGET_CTR_INCREASE,
    },
    content: {
        eEatEnabled: process.env.E_E_A_T_ENABLED === "true",
        qualityThreshold: process.env.CONTENT_QUALITY_THRESHOLD,
        landingPageTemplates: process.env.LANDING_PAGE_TEMPLATES,
    },
    linkBuilding: {
        minDrThreshold: process.env.MIN_DR_THRESHOLD,
        maxSpamScore: process.env.MAX_SPAM_SCORE,
        backlinkTargets: process.env.BACKLINK_TARGETS,
    },
    sprint: {
        durationDays: process.env.SPRINT_DURATION_DAYS,
        totalSprints: process.env.TOTAL_SPRINTS,
        visibilitySprint: process.env.VISIBILITY_SPRINT,
        authoritySprint: process.env.AUTHORITY_SPRINT,
        topRankSprint: process.env.TOP_RANK_SPRINT,
    },
    logging: {
        level: process.env.LOG_LEVEL,
        format: process.env.LOG_FORMAT,
        filePath: process.env.LOG_FILE_PATH,
        maxSize: process.env.LOG_MAX_SIZE,
        maxFiles: process.env.LOG_MAX_FILES,
    },
    upload: {
        maxFileSize: process.env.MAX_FILE_SIZE,
        allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(",") || [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        ],
        uploadPath: process.env.UPLOAD_PATH,
    },
    email: {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
        fromEmail: process.env.FROM_EMAIL,
        fromName: process.env.FROM_NAME,
    },
    sms: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    payment: {
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
};
// Validate configuration
const config = configSchema.parse(rawConfig);
export { config };
//# sourceMappingURL=index.js.map