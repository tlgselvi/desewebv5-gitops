# System Architecture - DESE EA PLAN v7.0

## Overview
This project follows a **Modular Monolith** architecture designed for an Enterprise ERP & SaaS Platform. It combines a Next.js frontend with a Node.js/Express backend, using a shared PostgreSQL database managed by Drizzle ORM.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui.
- **Backend**: Node.js 20, Express.js.
- **Database**: PostgreSQL 16, Drizzle ORM.
- **Infrastructure**: Docker, Kubernetes (planned).
- **AI**: Model Context Protocol (MCP) servers for AI Agents (FinBot, MuBot).

## Directory Structure

### Backend (`src/`)
- **`modules/`**: Contains business logic separated by domain.
  - `saas`: Multi-tenancy, Users, Auth.
  - `finance`: Invoices, Accounts, Transactions (FinBot).
  - `crm`: Contacts, Deals, Pipeline.
  - `inventory`: Products, Warehouses, Stock.
  - `hr`: Employees, Payroll.
  - `iot`: Devices, Telemetry (SmartPool).
- **`db/`**: Database configuration and schemas.
  - `schema/`: Modular schema definitions (`finance.ts`, `crm.ts`, etc.).
- **`mcp/`**: MCP Server implementations for AI agents.

### Frontend (`frontend/src/`)
- **`app/dashboard/`**: Application pages structure matching business modules.
- **`components/`**: Reusable UI components.
- **`lib/api.ts`**: Centralized API client.

## Core Concepts

### 1. Modular Monolith
The codebase is structured as a monolith but with strict module boundaries. Cross-module communication happens via Service interfaces, not direct database joins where possible (though Drizzle relations are used for critical paths).

### 2. Multi-tenancy
The system uses a **Shared Database, Shared Schema** approach.
- Every transactional table must have an `organization_id` column.
- All service methods must require `organizationId` context.
- Data isolation is enforced at the Service layer.

### 3. DDD (Domain Driven Design)
- **Entities**: Defined in `src/db/schema`.
- **Services**: Business logic in `src/modules/{module}/service.ts`.
- **Controllers**: HTTP handling in `src/modules/{module}/controller.ts`.

### 4. AI & MCP
AI Agents interact with the system via the **Model Context Protocol (MCP)**.
- `src/mcp/` contains servers that expose tools to LLMs.
- Example: `finbot-server.ts` exposes `create_invoice`, `get_financial_summary`.

## Data Flow
1. **Request**: User interacts with Next.js Frontend.
2. **API Call**: Frontend calls Backend API (`/api/v1/...`).
3. **Auth**: `authMiddleware` validates JWT and extracts `organizationId`.
4. **Controller**: Validates input (Zod) and calls Service.
5. **Service**: Executes business logic, calls Drizzle ORM.
6. **Database**: PostgreSQL executes query.

## Development
- **Hybrid Mode**: Frontend runs locally (`pnpm dev`), Backend runs in Docker or locally.
- **Migrations**: Managed via `drizzle-kit`.

## Deployment
- **Docker**: `Dockerfile` for backend.
- **CI/CD**: GitHub Actions (planned).

