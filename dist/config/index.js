import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
// Load environment variables
dotenvConfig();
// Configuration schema validation
const configSchema = z.object({
    // Server Configuration
    port: z.coerce.number().default(3000),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    apiVersion: z.string().default('v1'),
    corsOrigin: z.string().default('http://localhost:3000'),
    // Database Configuration
    database: z.object({
        url: z.string().min(1, 'DATABASE_URL is required'),
        host: z.string().default('localhost'),
        port: z.coerce.number().default(5432),
        name: z.string().default('dese_ea_plan_v5'),
        user: z.string().default('username'),
        password: z.string().default('password'),
    }),
    // Redis Configuration
    redis: z.object({
        url: z.string().default('redis://localhost:6379'),
        host: z.string().default('localhost'),
        port: z.coerce.number().default(6379),
        password: z.string().optional(),
    }),
    // Security Configuration
    security: z.object({
        jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
        jwtExpiresIn: z.string().default('24h'),
        bcryptRounds: z.coerce.number().default(12),
        rateLimitWindowMs: z.coerce.number().default(900000), // 15 minutes
        rateLimitMaxRequests: z.coerce.number().default(100),
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
    // Kubernetes & GitOps
    kubernetes: z.object({
        kubeconfigPath: z.string().default('~/.kube/config'),
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
        primaryKeywords: z.array(z.string()).default(['en iyi havuz firması', 'havuz kime yaptırılır']),
        targetRegion: z.string().default('Türkiye'),
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
        level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
        format: z.enum(['json', 'simple']).default('json'),
        filePath: z.string().default('./logs/app.log'),
        maxSize: z.string().default('10m'),
        maxFiles: z.coerce.number().default(5),
    }),
    // File Upload
    upload: z.object({
        maxFileSize: z.coerce.number().default(10485760), // 10MB
        allowedFileTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
        uploadPath: z.string().default('./uploads'),
    }),
    // Email Configuration
    email: z.object({
        smtpHost: z.string().default('smtp.gmail.com'),
        smtpPort: z.coerce.number().default(587),
        smtpUser: z.string().optional(),
        smtpPass: z.string().optional(),
        fromEmail: z.string().default('noreply@dese.ai'),
        fromName: z.string().default('Dese EA Plan v5'),
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
    },
    apis: {
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
        },
        google: {
            searchConsoleApiKey: process.env.GOOGLE_SEARCH_CONSOLE_API_KEY,
            businessApiKey: process.env.GOOGLE_BUSINESS_API_KEY,
            mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
        ahrefs: {
            apiKey: process.env.AHREFS_API_KEY,
        },
        lighthouse: {
            ciToken: process.env.LIGHTHOUSE_CI_TOKEN,
        },
    },
    monitoring: {
        prometheus: process.env.PROMETHEUS_ENABLED === 'true',
        grafana: process.env.GRAFANA_ENABLED === 'true',
        loki: process.env.LOKI_ENABLED === 'true',
        tempo: process.env.TEMPO_ENABLED === 'true',
        openTelemetry: process.env.OPENTELEMETRY_ENABLED === 'true',
    },
    kubernetes: {
        kubeconfigPath: process.env.KUBECONFIG_PATH,
        argocdServer: process.env.ARGOCD_SERVER,
        argocdToken: process.env.ARGOCD_TOKEN,
        helmRepoUrl: process.env.HELM_REPO_URL,
    },
    compliance: {
        opa: process.env.OPA_ENABLED === 'true',
        kyverno: process.env.KYVERNO_ENABLED === 'true',
        networkPolicy: process.env.NETWORK_POLICY_ENABLED === 'true',
        externalSecrets: process.env.EXTERNAL_SECRETS_ENABLED === 'true',
        cosign: process.env.COSIGN_ENABLED === 'true',
        trivy: process.env.TRIVY_ENABLED === 'true',
        syft: process.env.SYFT_ENABLED === 'true',
    },
    seo: {
        primaryKeywords: process.env.PRIMARY_KEYWORDS?.split(',') || ['en iyi havuz firması', 'havuz kime yaptırılır'],
        targetRegion: process.env.TARGET_REGION || 'Türkiye',
        targetDomainAuthority: process.env.TARGET_DOMAIN_AUTHORITY,
        targetCtrIncrease: process.env.TARGET_CTR_INCREASE,
    },
    content: {
        eEatEnabled: process.env.E_E_A_T_ENABLED === 'true',
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
        allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
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