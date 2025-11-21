# Changelog - Dese EA Plan v6.8.1

All notable changes to the project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Fixed - 2025-11-21

#### System Stabilization & Infrastructure Fixes

**Infrastructure:**
- Fixed pnpm and corepack issues on Windows environment
- Resolved broken pnpm shortcuts in `C:\Program Files\nodejs\`
- Configured corepack for proper pnpm management

**UI Engine:**
- Migrated `frontend/src/app/globals.css` to Tailwind CSS v4 syntax
- Changed from v3 directives (`@tailwind base;`, etc.) to v4 import (`@import "tailwindcss";`)
- Updated PostCSS configuration to use `@tailwindcss/postcss` plugin

**Networking:**
- Configured Frontend (Port 3001) to communicate with Backend (Port 3000)
- Created `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1`
- Updated API client to handle absolute URLs and resolve paths correctly

**API Client:**
- Enhanced `frontend/src/lib/api.ts` with URL resolution logic
- Added `getBaseUrl()` function to read from environment variables
- Added `resolveUrl()` function to prevent duplicate `/api/v1` in URLs
- Updated `frontend/src/api/client.ts` to use environment variable with proper fallback

**Documentation:**
- Created comprehensive `docs/SYSTEM_ARCHITECTURE_DUMP.md` with full system architecture details
- Added troubleshooting section for local development setup
- Documented port configuration and environment variable requirements

### Changed
- Frontend now requires `.env.local` file for local development
- API client defaults to `http://localhost:3000/api/v1` if environment variable is not set
- Tailwind CSS v4 is now the active CSS engine (breaking change from v3)

### Technical Details

**Files Modified:**
- `frontend/src/app/globals.css` - Tailwind v4 migration
- `frontend/src/lib/api.ts` - URL resolution and backend connection
- `frontend/src/api/client.ts` - Environment variable configuration
- `frontend/.env.local` - Local development configuration (gitignored)

**Files Created:**
- `docs/SYSTEM_ARCHITECTURE_DUMP.md` - Complete system architecture reference
- `docs/CHANGELOG.md` - This file

---

## [6.8.1] - 2025-11-21

### Added
- Express server stabilization and E2E test fixes
- Route order correction in `src/routes/index.ts`
- Duplicate `/health` endpoint removal
- Centralized authenticated API client and mock API endpoints
- CI/CD pipeline hardening with Docker `--pull always`
- Robust health check waiting mechanism
- Comprehensive artifact uploads for debugging

### Fixed
- Resolved persistent `ERR_CONNECTION_RESET` errors in E2E tests
- Corrected route registration order (most-specific to most-general)
- Removed duplicate route definitions causing server instability

---

## [6.8.0] - Previous Release

### Added
- Initial production-ready release
- MCP server implementations (FinBot, MuBot, DESE, Observability)
- WebSocket gateway for real-time communication
- Drizzle ORM database schema
- Next.js 16 frontend with App Router
- Tailwind CSS styling
- Prometheus metrics integration
- Redis caching layer
- JWT authentication system

---

**Note:** For detailed technical information, see `docs/SYSTEM_ARCHITECTURE_DUMP.md`.

