# EA Plan v5.8.0 - Continuous Watchdog Configuration

## Overview
The continuous watchdog system provides automated health monitoring and recovery for the EA Plan v5.8.0 production environment.

## Components

### 1. Watchdog Scripts
- **`ops/watchdog.sh`** - Linux/macOS watchdog script
- **`ops/watchdog.ps1`** - Windows PowerShell watchdog script  
- **`ops/watchdog-cron.sh`** - Cron job wrapper for Linux/macOS

### 2. Monitoring Configuration
- **Check Interval:** 5 minutes (300 seconds)
- **Max Failures:** 2 consecutive failures before action
- **Services Monitored:**
  - Ops Server: `http://localhost:8000/api/v1/health`
  - Frontend Proxy: `http://localhost:3000/api/aiops/health`

### 3. Auto-Recovery Actions
- **Ops Server Failure:** Automatic restart via `npm run start:ops`
- **Frontend Failure:** Logged for manual intervention
- **Alert Threshold:** 2 consecutive failures

## Usage

### Linux/macOS
```bash
# Start watchdog manually
npm run watchdog

# Add to crontab for continuous monitoring
crontab -e
# Add: */5 * * * * /path/to/project/ops/watchdog-cron.sh
```

### Windows
```powershell
# Start watchdog manually
npm run watchdog:win

# Or run directly
powershell -ExecutionPolicy Bypass -File ops/watchdog.ps1
```

## Logging
- **Main Log:** `logs/watchdog.log`
- **Ops Server Log:** `logs/ops-server.log`
- **Cron Log:** `logs/watchdog-cron.log`

## Alert Integration
The watchdog includes placeholder hooks for:
- **PagerDuty:** Critical failure notifications
- **Slack:** Team notifications
- **Email:** Admin alerts

## Production Deployment
1. Ensure watchdog scripts are executable
2. Configure cron job or Windows Task Scheduler
3. Set up alert integrations
4. Monitor logs for proper operation

## Status
✅ **ACTIVE** - Continuous monitoring enabled for v5.8.0 stable release
