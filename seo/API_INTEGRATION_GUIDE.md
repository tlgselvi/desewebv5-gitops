# API Integration Guide - EA Plan v6.8.0

**Version:** v6.8.0  
**Last Update:** 2025-01-27  
**Status:** ✅ Active

---

## Overview

This guide covers the integration of Ahrefs, Google Search Console, and Lighthouse CI APIs for SEO Authority & Rank Drift Detection.

---

## 1. Ahrefs API

### Setup

1. **Create Ahrefs Account**
   - Sign up at https://ahrefs.com/api
   - Navigate to API Dashboard
   - Generate API token

2. **Add to Environment Variables**

```bash
# .env
AHREFS_API_TOKEN=your_token_here
AHREFS_API_URL=https://apiv2.ahrefs.com
AHREFS_RATE_LIMIT=1  # requests per second
```

3. **Add to GitHub Secrets**

```bash
# Repository Settings → Secrets and variables → Actions
GH_AHREFS_API_TOKEN=your_token_here
```

### Endpoints

**Domain Rating**
```bash
GET /v2/domain-rating?target=example.com
```

**Backlinks Count**
```bash
GET /v2/backlinks/count?target=example.com
```

**Keywords Data**
```bash
GET /v2/keywords?target=example.com&limit=100
```

### Rate Limits

- **Free Tier:** 1 request/second
- **Paid Tier:** Varies by plan

### Implementation

```typescript
// src/services/seo/ahrefsApi.ts
import axios from 'axios';

const AHREFS_BASE_URL = process.env.AHREFS_API_URL;
const AHREFS_TOKEN = process.env.AHREFS_API_TOKEN;

export async function getDomainRating(domain: string): Promise<number> {
  const response = await axios.get(
    `${AHREFS_BASE_URL}/v2/domain-rating`,
    {
      params: { target: domain },
      headers: { 'Authorization': `Bearer ${AHREFS_TOKEN}` }
    }
  );
  return response.data.domain_rating;
}

export async function getBacklinksCount(domain: string): Promise<number> {
  const response = await axios.get(
    `${AHREFS_BASE_URL}/v2/backlinks/count`,
    {
      params: { target: domain },
      headers: { 'Authorization': `Bearer ${AHREFS_TOKEN}` }
    }
  );
  return response.data.count;
}
```

---

## 2. Google Search Console API

### Setup

1. **Enable GSC API**
   - Go to https://console.cloud.google.com
   - Enable Google Search Console API
   - Create OAuth 2.0 credentials

2. **Service Account**
   - Create service account
   - Download JSON key file
   - Add service account email to GSC property owners

3. **Add to Environment Variables**

```bash
# .env
GSC_PROJECT_ID=your-project-id
GSC_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GSC_PROPERTY_URL=https://example.com
```

4. **Add to GitHub Secrets**

```bash
# Repository Settings → Secrets and variables → Actions
GH_GSC_PROJECT_ID=your-project-id
GH_GSC_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GH_GSC_PRIVATE_KEY="..."
```

### Endpoints

**Search Analytics Query**
```bash
POST /webmasters/v3/sites/{siteUrl}/searchAnalytics/query
```

**Search Analytics by URL**
```bash
POST /webmasters/v3/sites/{siteUrl}/searchAnalytics/query
```

### Rate Limits

- **Quota:** 600 requests/day (default)
- **Batch:** Up to 25,000 rows per request

### Implementation

```typescript
// src/services/seo/gscApi.ts
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GSC_CLIENT_EMAIL,
    private_key: process.env.GSC_PRIVATE_KEY
  },
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});

export async function getKeywordPerformance(startDate: string, endDate: string) {
  const webmasters = google.webmasters({ version: 'v3', auth });
  
  const response = await webmasters.searchanalytics.query({
    siteUrl: process.env.GSC_PROPERTY_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: 1000
    }
  });
  
  return response.data.rows;
}
```

---

## 3. Lighthouse CI

### Setup

1. **Install Lighthouse CI**

```bash
npm install -g @lhci/cli
```

2. **Configuration**

```json
// seo/lighthouse/lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["https://example.com"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.8}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

3. **Add to Environment Variables**

```bash
# .env
LIGHTHOUSE_CI_URL=https://example.com
LIGHTHOUSE_CI_BRANCH=main
```

### Implementation

```typescript
// src/services/seo/lighthouseCI.ts
import { spawn } from 'child_process';

export async function runLighthouse(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const lighthouse = spawn('lhci', ['collect', '--url', url]);
    
    let output = '';
    
    lighthouse.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    lighthouse.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error(`Lighthouse exited with code ${code}`));
      }
    });
  });
}
```

---

## 4. Prometheus Metrics Export

### Metrics

```promql
# SEO Authority Metrics
seo_domain_authority_score{d域名="example.com"} 42
seo_backlinks_count{domain="example.com"} 1234
seo_referring_domains_count{domain="example.com"} 567

# Keyword Rankings
seo_keyword_rank{keyword="seo tool", position="3"} 1
seo_keyword_rank{keyword="seo audit", position="7"} 1

# Rank Drift
seo_rank_drift_count{keyword="seo tool", drift_type="drop"} 2
seo_rank_improvement_count{keyword="seo audit", drift_type="gain"} 1

# Core Web Vitals
seo_lighthouse_lcp{page="/"} 2.1
seo_lighthouse_fid{page="/"} 10
seo_lighthouse_cls{page="/"} 0.05

# API Usage
seo_api_requests_remaining{api="ahrefs"} 450
seo_api_requests_remaining{api="gsc"} 300
```

### Implementation

```typescript
// src/services/seo/metricsExporter.ts
import { Counter, Gauge, Registry } from 'prom-client';

const register = new Registry();

const domainAuthority = new Gauge({
  name: 'seo_domain_authority_score',
  help: 'Domain Authority score from Ahrefs',
  labelNames: ['domain'],
  registers: [register]
});

const keywordRank = new Gauge({
  name: 'seo_keyword_rank',
  help: 'Keyword ranking position',
  labelNames: ['keyword'],
  registers: [register]
});

export function updateMetrics(domain: string, da: number, keywords: Array<{keyword: string, position: number}>) {
  domainAuthority.set({ domain }, da);
  
  keywords.forEach(({ keyword, position }) => {
    keywordRank.set({ keyword }, position);
  });
}

export function getMetrics() {
  return register.metrics();
}
```

---

## 5. GitHub Actions Integration

### Workflow

```yaml
# .github/workflows/seo-monitor.yml
name: SEO Monitoring

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  seo-monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Lighthouse CI
        run: npm run lighthouse:ci
      
      - name: Fetch Ahrefs Data
        env:
          AHREFS_API_TOKEN: ${{ secrets.AHREFS_API_TOKEN }}
        run: npm run seo:fetch-ahrefs
      
      - name: Fetch GSC Data
        env:
          GSC_PROJECT_ID: ${{ secrets.GSC_PROJECT_ID }}
          GSC_CLIENT_EMAIL: ${{ secrets.GSC_CLIENT_EMAIL }}
          GSC_PRIVATE_KEY: ${{ secrets.GSC_PRIVATE_KEY }}
        run: npm run seo:fetch-gsc
      
      - name: Export Metrics
        run: npm run seo:export-metrics
```

---

## Next Steps

1. ✅ Create API directories
2. ⏳ Setup Ahrefs API credentials
3. ⏳ Setup Google Search Console API credentials
4. ⏳ Configure Lighthouse CI
5. ⏳ Implement Prometheus metrics exporter
6. ⏳ Create Grafana dashboard
7. ⏳ Deploy to production

---

**Setup Date:** 2025-10-27
**Status:** Ready for implementation
