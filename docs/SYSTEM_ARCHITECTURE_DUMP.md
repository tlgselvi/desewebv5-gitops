# System Architecture Dump - Dese EA Plan v6.8.1

**Generated:** 2025-11-21  
**Purpose:** Deep technical reference for accurate code generation and architecture alignment

---

## 1. 🗄️ Database Schema & Relationships

### Core Tables

#### **users**
- **Primary Key:** `id` (UUID, auto-generated)
- **Unique Index:** `email`
- **Fields:**
  - `id`: UUID (PK)
  - `email`: VARCHAR(255), NOT NULL, UNIQUE
  - `password`: TEXT, NOT NULL
  - `firstName`: VARCHAR(100), nullable
  - `lastName`: VARCHAR(100), nullable
  - `role`: VARCHAR(50), default 'user', NOT NULL
  - `isActive`: BOOLEAN, default true, NOT NULL
  - `lastLogin`: TIMESTAMP, nullable
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **seoProjects**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `ownerId` → `users.id`
- **Indexes:** `domain`, `ownerId`
- **Fields:**
  - `id`: UUID (PK)
  - `name`: VARCHAR(255), NOT NULL
  - `description`: TEXT, nullable
  - `domain`: VARCHAR(255), NOT NULL
  - `targetRegion`: VARCHAR(100), default 'Türkiye'
  - `primaryKeywords`: JSONB (string[]), NOT NULL
  - `targetDomainAuthority`: INTEGER, default 50
  - `targetCtrIncrease`: INTEGER, default 25
  - `status`: VARCHAR(50), default 'active', NOT NULL
  - `ownerId`: UUID (FK → users.id), NOT NULL
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **seoMetrics**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `projectId` → `seoProjects.id`
- **Indexes:** `projectId`, `url`, `measuredAt`
- **Fields:**
  - `id`: UUID (PK)
  - `projectId`: UUID (FK → seoProjects.id), NOT NULL
  - `url`: TEXT, NOT NULL
  - `performance`: DECIMAL(5,2), nullable
  - `accessibility`: DECIMAL(5,2), nullable
  - `bestPractices`: DECIMAL(5,2), nullable
  - `seo`: DECIMAL(5,2), nullable
  - `firstContentfulPaint`: DECIMAL(10,2), nullable
  - `largestContentfulPaint`: DECIMAL(10,2), nullable
  - `cumulativeLayoutShift`: DECIMAL(10,4), nullable
  - `firstInputDelay`: DECIMAL(10,2), nullable
  - `totalBlockingTime`: DECIMAL(10,2), nullable
  - `speedIndex`: DECIMAL(10,2), nullable
  - `timeToInteractive`: DECIMAL(10,2), nullable
  - `rawData`: JSONB, nullable
  - `measuredAt`: TIMESTAMP, default NOW()

#### **contentTemplates**
- **Primary Key:** `id` (UUID)
- **Fields:**
  - `id`: UUID (PK)
  - `name`: VARCHAR(255), NOT NULL
  - `type`: VARCHAR(50), NOT NULL ('landing_page', 'blog_post', 'service_page')
  - `template`: TEXT, NOT NULL
  - `variables`: JSONB (Record<string, unknown>), nullable
  - `eEatScore`: DECIMAL(3,2), nullable
  - `qualityThreshold`: DECIMAL(3,2), default 0.8
  - `isActive`: BOOLEAN, default true, NOT NULL
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **generatedContent**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** 
  - `projectId` → `seoProjects.id`
  - `templateId` → `contentTemplates.id`
- **Indexes:** `projectId`, `contentType`, `status`
- **Fields:**
  - `id`: UUID (PK)
  - `projectId`: UUID (FK → seoProjects.id), NOT NULL
  - `templateId`: UUID (FK → contentTemplates.id), nullable
  - `title`: VARCHAR(500), NOT NULL
  - `content`: TEXT, NOT NULL
  - `contentType`: VARCHAR(50), NOT NULL
  - `url`: TEXT, nullable
  - `keywords`: JSONB (string[]), nullable
  - `eEatScore`: DECIMAL(3,2), nullable
  - `qualityScore`: DECIMAL(3,2), nullable
  - `status`: VARCHAR(50), default 'draft', NOT NULL
  - `publishedAt`: TIMESTAMP, nullable
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **localSeoProfiles**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `projectId` → `seoProjects.id`
- **Indexes:** `projectId`, `googleBusinessId`
- **Fields:**
  - `id`: UUID (PK)
  - `projectId`: UUID (FK → seoProjects.id), NOT NULL
  - `businessName`: VARCHAR(255), NOT NULL
  - `address`: TEXT, NOT NULL
  - `phone`: VARCHAR(20), nullable
  - `email`: VARCHAR(255), nullable
  - `website`: VARCHAR(255), nullable
  - `googleBusinessId`: VARCHAR(100), nullable
  - `latitude`: DECIMAL(10,8), nullable
  - `longitude`: DECIMAL(11,8), nullable
  - `businessHours`: JSONB, nullable
  - `categories`: JSONB (string[]), nullable
  - `isActive`: BOOLEAN, default true, NOT NULL
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **localSeoReviews**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `profileId` → `localSeoProfiles.id`
- **Unique Index:** `reviewId`
- **Indexes:** `profileId`
- **Fields:**
  - `id`: UUID (PK)
  - `profileId`: UUID (FK → localSeoProfiles.id), NOT NULL
  - `reviewId`: VARCHAR(100), NOT NULL, UNIQUE
  - `author`: VARCHAR(255), NOT NULL
  - `rating`: INTEGER, NOT NULL
  - `content`: TEXT, nullable
  - `platform`: VARCHAR(50), NOT NULL
  - `reviewUrl`: TEXT, nullable
  - `isPositive`: BOOLEAN, nullable
  - `sentiment`: VARCHAR(20), nullable
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **backlinkTargets**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `projectId` → `seoProjects.id`
- **Indexes:** `projectId`, `domainRating`, `outreachStatus`
- **Fields:**
  - `id`: UUID (PK)
  - `projectId`: UUID (FK → seoProjects.id), NOT NULL
  - `domain`: VARCHAR(255), NOT NULL
  - `url`: TEXT, NOT NULL
  - `domainRating`: INTEGER, nullable
  - `spamScore`: INTEGER, nullable
  - `trafficValue`: DECIMAL(10,2), nullable
  - `contactEmail`: VARCHAR(255), nullable
  - `contactForm`: TEXT, nullable
  - `outreachStatus`: VARCHAR(50), default 'pending'
  - `notes`: TEXT, nullable
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **backlinkCampaigns**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `projectId` → `seoProjects.id`
- **Indexes:** `projectId`, `status`
- **Fields:**
  - `id`: UUID (PK)
  - `projectId`: UUID (FK → seoProjects.id), NOT NULL
  - `name`: VARCHAR(255), NOT NULL
  - `description`: TEXT, nullable
  - `targetCount`: INTEGER, default 100
  - `minDrThreshold`: INTEGER, default 50
  - `maxSpamScore`: INTEGER, default 5
  - `status`: VARCHAR(50), default 'active', NOT NULL
  - `startDate`: TIMESTAMP, nullable
  - `endDate`: TIMESTAMP, nullable
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **seoAlerts**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** 
  - `projectId` → `seoProjects.id`
  - `resolvedBy` → `users.id`
- **Indexes:** `projectId`, `type`, `severity`, `isResolved`
- **Fields:**
  - `id`: UUID (PK)
  - `projectId`: UUID (FK → seoProjects.id), NOT NULL
  - `type`: VARCHAR(50), NOT NULL ('ranking_drop', 'traffic_spike', 'penalty', 'technical_issue')
  - `severity`: VARCHAR(20), NOT NULL ('low', 'medium', 'high', 'critical')
  - `title`: VARCHAR(255), NOT NULL
  - `description`: TEXT, NOT NULL
  - `data`: JSONB, nullable
  - `isResolved`: BOOLEAN, default false, NOT NULL
  - `resolvedAt`: TIMESTAMP, nullable
  - `resolvedBy`: UUID (FK → users.id), nullable
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **seoSprints**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `projectId` → `seoProjects.id`
- **Indexes:** `projectId`, `phase`, `sprintNumber`
- **Fields:**
  - `id`: UUID (PK)
  - `projectId`: UUID (FK → seoProjects.id), NOT NULL
  - `name`: VARCHAR(255), NOT NULL
  - `phase`: VARCHAR(50), NOT NULL ('visibility', 'authority', 'top_rank')
  - `sprintNumber`: INTEGER, NOT NULL
  - `startDate`: TIMESTAMP, NOT NULL
  - `endDate`: TIMESTAMP, NOT NULL
  - `goals`: JSONB (string[]), nullable
  - `tasks`: JSONB (Array<{id: string, title: string, status: string, priority: string, assignee?: string}>), nullable
  - `status`: VARCHAR(50), default 'planning', NOT NULL
  - `createdAt`: TIMESTAMP, default NOW()
  - `updatedAt`: TIMESTAMP, default NOW()

#### **seoReports**
- **Primary Key:** `id` (UUID)
- **Foreign Keys:** 
  - `projectId` → `seoProjects.id`
  - `generatedBy` → `users.id`
- **Indexes:** `projectId`, `reportType`, `generatedAt`
- **Fields:**
  - `id`: UUID (PK)
  - `projectId`: UUID (FK → seoProjects.id), NOT NULL
  - `reportType`: VARCHAR(50), NOT NULL ('weekly', 'monthly', 'sprint', 'custom')
  - `period`: VARCHAR(50), NOT NULL
  - `startDate`: TIMESTAMP, NOT NULL
  - `endDate`: TIMESTAMP, NOT NULL
  - `data`: JSONB, NOT NULL
  - `insights`: TEXT, nullable
  - `recommendations`: TEXT, nullable
  - `generatedAt`: TIMESTAMP, default NOW()
  - `generatedBy`: UUID (FK → users.id), nullable

### Relationship Graph

```
users (1) ──< (many) seoProjects
users (1) ──< (many) seoAlerts (resolvedBy)
users (1) ──< (many) seoReports (generatedBy)

seoProjects (1) ──< (many) seoMetrics
seoProjects (1) ──< (many) generatedContent
seoProjects (1) ──< (many) localSeoProfiles
seoProjects (1) ──< (many) backlinkTargets
seoProjects (1) ──< (many) backlinkCampaigns
seoProjects (1) ──< (many) seoAlerts
seoProjects (1) ──< (many) seoSprints
seoProjects (1) ──< (many) seoReports

contentTemplates (1) ──< (many) generatedContent

localSeoProfiles (1) ──< (many) localSeoReviews
```

**Key Relationships:**
- **One-to-Many:** All relationships are one-to-many (no many-to-many tables)
- **Cascade Behavior:** Not explicitly defined in schema (defaults apply)
- **Soft Deletes:** Not implemented (using `isActive` flags where applicable)

---

## 2. 🌐 API & Service Layer Topology

### Service Module Structure

All services are **exported as object literals or classes**, not singletons. Services are stateless and can be instantiated as needed.

#### **Service Modules:**

1. **`src/services/contentGenerator.ts`**
   - **Type:** Class (`ContentGenerator`)
   - **Purpose:** AI-powered content generation using OpenAI
   - **Dependencies:** OpenAI SDK, Drizzle ORM, Prometheus metrics
   - **Key Methods:**
     - `generateContent(request: ContentGenerationRequest): Promise<GeneratedContentResponse>`
     - `generateFromTemplate(request): Promise<GeneratedContentInternal>`
     - `generateFromScratch(request): Promise<GeneratedContentInternal>`
     - `calculateEEATScore(content): Promise<EEAtscore>`

2. **`src/services/seoAnalyzer.ts`**
   - **Type:** Exported functions (assumed)
   - **Purpose:** SEO analysis and metrics processing

3. **`src/services/masterControl.ts`**
   - **Type:** Exported functions (assumed)
   - **Purpose:** Master control CLI operations

4. **`src/services/mcp/mcpDashboardService.ts`**
   - **Type:** Object literal export
   - **Purpose:** Aggregates health checks and metrics from MCP modules
   - **Key Method:**
     - `getDashboardData(moduleName: ModuleName): Promise<McpDashboardData>`
   - **Dependencies:** Prometheus client, Redis cache
   - **Modules Supported:** `"mubot" | "finbot" | "aiops" | "observability"`

5. **`src/services/monitoring/metrics.ts`**
   - **Type:** Exported functions (assumed)
   - **Purpose:** Prometheus metrics collection

6. **`src/services/monitoring/prometheusClient.ts`**
   - **Type:** Exported functions
   - **Purpose:** Prometheus query execution
   - **Key Function:** `queryInstant(query: string): Promise<number | null>`

7. **`src/services/storage/redisClient.ts`**
   - **Type:** Singleton Redis client export
   - **Export:** `export { redis }` (ioredis instance)
   - **Purpose:** Redis connection and operations
   - **Additional:** `FeedbackStore` object with methods for feedback persistence

8. **`src/services/aiops/telemetryAgent.ts`**
   - **Type:** Class (`TelemetryAgent`)
   - **Purpose:** Collects metrics from Prometheus and detects drift
   - **Key Methods:**
     - `collectMetrics(): Promise<PrometheusQueryResponse>`
     - `detectDrift(actual, predicted, threshold): boolean`
     - `calculateAverageLatency(data): number`

9. **`src/services/aiops/anomalyDetector.ts`**
   - **Type:** Exported functions/class (assumed)
   - **Purpose:** Anomaly detection using ML models

10. **`src/services/aiops/anomalyScorer.ts`**
    - **Type:** Exported functions/class (assumed)
    - **Purpose:** Anomaly scoring algorithms

11. **`src/services/aiops/anomalyAlertService.ts`**
    - **Type:** Exported functions/class (assumed)
    - **Purpose:** Alert generation and management

12. **`src/services/aiops/autoRemediator.ts`**
    - **Type:** Exported functions/class (assumed)
    - **Purpose:** Automated remediation actions

### Route Structure

Routes are organized as **Express Router modules** exported from `src/routes/`.

#### **Route Registration Order (CRITICAL):**

Routes are registered in `src/routes/index.ts` in **most-specific to most-general** order:

1. `/health` (no prefix) - Health check endpoint
2. `/` (root) - JWKS endpoint
3. `/metrics/aiops` - Specific metrics endpoint
4. `/metrics` - General metrics endpoint
5. `/api/v1/mcp/dashboard` - MCP dashboard endpoint
6. `/api/v1/projects` - Projects endpoint
7. `/api/v1/seo` - SEO endpoint
8. `/api/v1/content` - Content endpoint
9. `/api/v1/analytics` - Analytics endpoint
10. `/api/v1` - v1Router (contains `/auth` and `/aiops`)
11. `/api/v1` - Feedback routes
12. `/api/v1` - Auto-remediation routes
13. `/api/v1` - Root API info endpoint (catch-all for `/api/v1`)

#### **Route Modules:**

- `src/routes/health.ts` - Health check routes
- `src/routes/jwks.ts` - JWKS endpoint for JWT validation
- `src/routes/metrics.ts` - Prometheus metrics endpoint
- `src/routes/projects.ts` - SEO project management
- `src/routes/seo.ts` - SEO operations
- `src/routes/content.ts` - Content generation
- `src/routes/analytics.ts` - Analytics data
- `src/routes/feedback.ts` - Feedback collection
- `src/routes/autoRemediation.ts` - Auto-remediation triggers
- `src/routes/mcpDashboard.ts` - MCP dashboard aggregation
- `src/routes/aiops.ts` - AIOps operations
- `src/routes/anomaly.ts` - Anomaly detection
- `src/routes/masterControl.ts` - Master control CLI
- `src/routes/v1/auth.ts` - Authentication (mock login)
- `src/routes/v1/aiops.ts` - AIOps v1 API
- `src/routes/v1/index.ts` - v1 router aggregator

### Authentication & Authorization

- **Middleware:** `src/middleware/auth.ts`
- **JWT Library:** `jsonwebtoken`
- **Token Format:** Bearer token in `Authorization` header
- **Middleware Functions:**
  - `authenticate`: Validates JWT token, attaches `user` to `req`
  - `authorize(permissions: string[])`: Checks user permissions
  - `optionalAuth`: Optional authentication (doesn't fail if no token)

**Request Extension:**
```typescript
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}
```

---

## 3. 🤖 MCP & External Integration Points

### MCP Server Architecture

MCP (Model Context Protocol) servers are **separate Express applications** running on dedicated ports, created using `createMcpServer()` factory function.

#### **MCP Server Factory: `src/lib/mcp-server.ts`**

**Function:** `createMcpServer(config: McpServerConfig): McpServerInstance`

**Configuration:**
```typescript
type McpServerConfig = {
  moduleId: string;
  port: number;
  registerRoutes: (context: RegisterRoutesContext) => void;
};
```

**Features:**
- Express app with base path `/${moduleId}`
- Rate limiting (100 requests per 15 minutes)
- Optional authentication middleware
- Compression, CORS, Helmet security
- Built-in `/health` endpoint
- WebSocket support via HTTP server

#### **MCP Servers:**

1. **FinBot MCP** (`src/mcp/finbot-server.ts`)
   - **Port:** 5555 (env: `FINBOT_MCP_PORT`)
   - **Base Path:** `/finbot`
   - **Endpoints:**
     - `POST /finbot/query` - MCP query endpoint
   - **Communication:** HTTP REST calls to main backend
   - **Cache:** Redis (key: `mcp:finbot:query:${JSON.stringify(body)}`)
   - **WebSocket:** Initialized via `initializeMCPWebSocket()`

2. **MuBot MCP** (`src/mcp/mubot-server.ts`)
   - **Port:** 5556 (env: `MUBOT_MCP_PORT`)
   - **Base Path:** `/mubot`
   - **Purpose:** Accounting and ERP integration

3. **DESE MCP** (`src/mcp/dese-server.ts`)
   - **Port:** 5557 (env: `DESE_MCP_PORT`)
   - **Base Path:** `/dese`
   - **Purpose:** DESE Analytics module

4. **Observability MCP** (`src/mcp/observability-server.ts`)
   - **Port:** 5558 (env: `OBSERVABILITY_MCP_PORT`)
   - **Base Path:** `/observability`
   - **Purpose:** Prometheus, Grafana, Loki integration

### MCP Communication Patterns

#### **Main Backend → MCP Servers:**
- **Protocol:** HTTP REST
- **Method:** `fetch()` calls from main backend services
- **Example:** `mcpDashboardService` fetches health endpoints from each MCP server
- **Base URL:** Environment variable `BACKEND_URL` or `http://localhost:${config.port}`

#### **MCP Servers → Main Backend:**
- **Protocol:** HTTP REST
- **Method:** `fetch()` calls from MCP server routes
- **Example:** FinBot MCP queries `/api/v1/analytics/dashboard` and `/metrics`
- **Authentication:** Passes through `Authorization` header from client request

#### **WebSocket Gateway:**
- **Location:** `src/mcp/gateway.ts` (main backend) and `src/mcp/websocket-server.ts` (MCP-specific)
- **Path:** `/ws` (main backend)
- **Authentication:** JWT token via `auth` message type
- **Features:**
  - Topic-based pub/sub
  - Client authentication
  - Message types: `auth`, `subscribe`, `unsubscribe`, `ping`
  - Broadcast to topic subscribers

#### **Context Aggregation:**
- **Service:** `src/mcp/context-aggregator.ts`
- **Purpose:** Aggregates context from multiple MCP servers
- **Usage:** Used by MCP servers to provide unified context

### External API Integrations

**Configuration:** `src/config/index.ts` → `config.apis`

- **OpenAI:** API key for content generation
- **Google APIs:**
  - Search Console API
  - Business API
  - Maps API
- **Ahrefs:** API key for backlink analysis
- **Lighthouse:** CI token for performance testing

---

## 4. 🎨 Frontend State & Data Fetching

### State Management

#### **Zustand Store: `frontend/src/store/useStore.ts`**

**Structure:**
```typescript
interface State {
  user: { name: string; role: string } | null;
  metrics: Record<string, number>;
  aiops: Record<string, number>;
  setUser: (user: { name: string; role: string }) => void;
}
```

**Usage:** Minimal global state for user and metrics (not heavily used)

#### **React Query: `@tanstack/react-query`**

**Setup:** `frontend/src/app/providers.tsx`
- QueryClient created per app instance
- Wrapped in `QueryClientProvider`
- **Note:** React Query is configured but actual `useQuery`/`useMutation` hooks are not extensively used in current codebase

### Data Fetching Patterns

#### **API Client: `frontend/src/api/client.ts`**

**Library:** Axios
**Configuration:**
```typescript
baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1"
timeout: 5000
```

#### **Authenticated Fetch: `frontend/src/lib/api.ts`**

**Functions:**
- `authenticatedFetch(url, options): Promise<Response>`
  - Automatically adds `Authorization: Bearer ${token}` header
  - Handles 401 errors (clears token, throws error)
  - Uses `getToken()` from `frontend/src/lib/auth.ts`

- `authenticatedGet<T>(url): Promise<T>`
  - Convenience wrapper for GET requests

- `authenticatedPost<T>(url, body): Promise<T>`
  - Convenience wrapper for POST requests

#### **Authentication: `frontend/src/lib/auth.ts`**

**Functions:**
- `login(username, password): Promise<JWT>`
  - POST to `/auth/login`
  - Stores token in `localStorage.setItem("token", ...)`
  - Returns decoded JWT

- `logout(): void`
  - Removes token from localStorage

- `getToken(): string | null`
  - Retrieves token from localStorage

- `getUserRole(): string | null`
  - Decodes JWT and extracts role

**Library:** `jose` for JWT decoding

### Standard Data Fetching Pattern

**Current Pattern (Recommended):**
```typescript
// In React components
const response = await authenticatedGet<DataType>('/api/v1/endpoint');
// or
const response = await authenticatedPost<DataType>('/api/v1/endpoint', body);
```

**Future Pattern (React Query):**
```typescript
// Not yet implemented, but infrastructure exists
const { data, isLoading } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => authenticatedGet<DataType>(`/api/v1/resource/${id}`)
});
```

### Frontend Architecture

- **Framework:** Next.js 16.0.3 (App Router)
- **Routing:** File-based routing in `frontend/src/app/`
- **Layouts:**
  - `layout.tsx` - Root layout
  - `client-layout.tsx` - Client-side layout wrapper (includes navigation, footer)
- **Components:** 
  - `frontend/src/components/ui/` - Reusable UI components (shadcn-style)
  - `frontend/src/components/layout/` - Layout components
  - `frontend/src/components/mcp/` - MCP-specific components
- **Styling:** Tailwind CSS 4.1.16
- **Theme:** `next-themes` for dark mode

---

## 5. 🔧 Core TypeScript Types

### Database Types (Drizzle ORM)

All database types are inferred from schema:
```typescript
import { users, seoProjects, seoMetrics, ... } from '@/db/schema.js';

type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;
```

### Service Types

#### **MCP Dashboard:**
```typescript
type ModuleName = "mubot" | "finbot" | "aiops" | "observability";

type MetricChangeType = "increase" | "decrease" | "neutral";

type MetricIconKey = 
  | "FileInput" | "Database" | "Repeat" | "Scale" 
  | "Cpu" | "MemoryStick" | "AlertTriangle" | "Network"
  | "Server" | "LogIn" | "AlertCircle" | "Timer"
  | "Users" | "Clock";

interface DashboardHealthCheck {
  serviceName: string;
  status: string;
  lastChecked: string;
}

interface DashboardMetric {
  icon: MetricIconKey;
  title: string;
  value: string;
  change?: string;
  changeType?: MetricChangeType;
  footerText?: string;
}

interface McpDashboardData {
  module: ModuleName;
  generatedAt: string;
  healthChecks: DashboardHealthCheck[];
  metrics: DashboardMetric[];
}
```

#### **Content Generation:**
```typescript
type ContentGenerationRequest = {
  projectId: string; // UUID
  contentType: 'landing_page' | 'blog_post' | 'service_page' | 'product_page';
  templateId?: string; // UUID
  keywords: string[];
  targetAudience?: string;
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  wordCount: number; // 100-5000
  includeImages: boolean;
  eEatCompliance: boolean;
};

type EEAtscore = {
  expertise: number;
  experience: number;
  authoritativeness: number;
  trustworthiness: number;
  overall: number;
};
```

#### **WebSocket:**
```typescript
type GatewayInboundMessage =
  | { type: "auth"; token: string }
  | { type: "subscribe"; topic: string }
  | { type: "unsubscribe"; topic: string }
  | { type: "ping" };

type GatewayOutboundMessage = {
  type: string;
} & Record<string, unknown>;
```

#### **Telemetry:**
```typescript
interface TelemetryData {
  timestamp: number;
  avgLatency: number;
  drift: boolean;
  metrics: Record<string, number>;
}
```

#### **Feedback:**
```typescript
interface FeedbackEntry {
  timestamp: number;
  metric: string;
  anomaly: boolean;
  verdict: boolean;
  comment: string;
}
```

### Request/Response Types

#### **Authentication:**
```typescript
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}
```

---

## 6. 🔐 Security & Middleware

### Middleware Chain (Order Matters)

1. **Helmet** - Security headers
2. **CSP Headers** - Content Security Policy
3. **Input Sanitization** - XSS prevention
4. **Request Size Limiter** - 10MB limit
5. **Audit Middleware** - Request logging
6. **CORS** - Cross-origin configuration
7. **Compression** - Response compression
8. **Rate Limiting** - 100 requests per 15 minutes (disabled in test)
9. **Body Parsing** - JSON/URL-encoded (10MB limit)
10. **Request Logger** - HTTP request logging
11. **Prometheus Middleware** - Metrics collection
12. **Routes** - API routes
13. **Error Handler** - Final error handling

### Security Configuration

- **JWT Secret:** Environment variable or default (32+ chars required)
- **JWT Expiry:** 24h default
- **Bcrypt Rounds:** 12
- **Rate Limit:** 100 requests per 15 minutes
- **CORS:** Configurable origins, credentials enabled

---

## 7. 📦 Key Dependencies

### Backend
- `express@5.1.0` - Web framework
- `drizzle-orm@0.44.7` - ORM
- `postgres@3.4.7` - PostgreSQL client
- `ioredis@5.8.2` - Redis client
- `jsonwebtoken@9.0.2` - JWT handling
- `ws@8.18.3` - WebSocket server
- `winston@3.18.3` - Logging
- `prom-client@15.1.3` - Prometheus metrics
- `zod@4.1.12` - Schema validation
- `openai@6.8.1` - OpenAI SDK

### Frontend
- `next@16.0.3` - React framework
- `react@19.2.0` - UI library
- `@tanstack/react-query@5.90.5` - Data fetching
- `axios@1.12.2` - HTTP client
- `zustand@5.0.8` - State management
- `tailwindcss@4.1.16` - CSS framework
- `jose@6.1.0` - JWT decoding
- `lucide-react@0.553.0` - Icons

---

## 8. 🚀 Deployment & Infrastructure

### Docker
- **Main App:** `Dockerfile` (monorepo build)
- **Frontend:** `frontend/Dockerfile` (Next.js standalone)
- **Compose:** `docker-compose.yml` with services:
  - `app` (port 3000)
  - `db` (PostgreSQL 15, port 5432)
  - `redis` (Redis 7-alpine, port 6379)
  - `finbot` (port 5555)
  - `mubot` (port 5556)
  - `dese` (port 5557)
  - `observability` (port 5558)

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `NODE_ENV` - Environment (development/production/test)

**Optional:**
- `PORT` - Server port (default: 3001)
- `FINBOT_MCP_PORT` - FinBot MCP port (default: 5555)
- `MUBOT_MCP_PORT` - MuBot MCP port (default: 5556)
- `DESE_MCP_PORT` - DESE MCP port (default: 5557)
- `OBSERVABILITY_MCP_PORT` - Observability MCP port (default: 5558)
- `OPENAI_API_KEY` - OpenAI API key
- `NEXT_PUBLIC_API_URL` - Frontend API base URL

---

## 9. ⚠️ Critical Architecture Notes

1. **Route Order is Critical:** Routes must be registered from most-specific to most-general to prevent route conflicts.

2. **No Singleton Services:** Services are stateless and can be instantiated multiple times. Use dependency injection patterns.

3. **MCP Servers are Separate Processes:** Each MCP server runs as a separate Express app on a dedicated port. They communicate with the main backend via HTTP REST.

4. **Redis Caching:** MCP dashboard data is cached in Redis with TTL (default 60 seconds). Cache keys follow pattern: `mcp:dashboard:${moduleName}`.

5. **WebSocket Authentication:** WebSocket connections require JWT authentication via `auth` message before subscribing to topics.

6. **Database Migrations:** Use Drizzle Kit (`pnpm db:generate`, `pnpm db:migrate`). Schema is defined in `src/db/schema.ts`.

7. **Path Aliases:** Both frontend and backend use `@/*` path alias. Backend: `@/` → `src/`, Frontend: `@/` → `frontend/src/`.

8. **Error Handling:** All async route handlers must use `asyncHandler` wrapper to catch errors and pass to error middleware.

9. **Logging:** Use `logger` from `@/utils/logger.js`. Never use `console.*` directly.

10. **Type Safety:** Strict TypeScript mode enabled. No `any` types allowed. Use Zod for runtime validation.

---

**End of System Architecture Dump**

