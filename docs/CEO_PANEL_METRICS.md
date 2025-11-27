# CEO Panel Metrics - DESE EA PLAN v7.0

**Version:** 7.0.0  
**Last Updated:** 2025-01-27

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Financial Metrics](#financial-metrics)
3. [System Metrics](#system-metrics)
4. [IoT Metrics](#iot-metrics)
5. [AI Predictions](#ai-predictions)
6. [API Reference](#api-reference)

---

## Overview

The CEO Dashboard (`/api/v1/ceo/summary`) provides a comprehensive overview of business performance, system health, and AI-powered insights. All metrics are organization-scoped and respect multi-tenancy.

### Endpoint

```
GET /api/v1/ceo/summary
Authorization: Bearer <token>
```

### Response Structure

```typescript
{
  finance: FinancialSummary,
  system: SystemMetrics,
  iot: IoTMetrics,
  ai: AIPredictions
}
```

---

## Financial Metrics

### Total Revenue

**Field:** `finance.totalRevenue`  
**Type:** `number`  
**Unit:** TRY (Turkish Lira)  
**Description:** Total revenue for current month

**Calculation:**
```sql
SELECT SUM(total) 
FROM invoices 
WHERE organization_id = ? 
  AND type = 'sales' 
  AND status = 'paid'
  AND EXTRACT(MONTH FROM invoice_date) = EXTRACT(MONTH FROM CURRENT_DATE)
```

### Total Expenses

**Field:** `finance.totalExpenses`  
**Type:** `number`  
**Unit:** TRY  
**Description:** Total expenses for current month

**Calculation:**
```sql
SELECT SUM(amount) 
FROM transactions 
WHERE organization_id = ? 
  AND type = 'expense'
  AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
```

### Net Profit

**Field:** `finance.netProfit`  
**Type:** `number`  
**Unit:** TRY  
**Description:** Net profit (Revenue - Expenses)

**Calculation:**
```typescript
netProfit = totalRevenue - totalExpenses
```

### Monthly Revenue Trend

**Field:** `finance.monthlyRevenue`  
**Type:** `Array<{ name: string, total: number }>`  
**Description:** Monthly revenue for last 12 months

**Example:**
```json
[
  { "name": "Ocak", "total": 150000 },
  { "name": "Şubat", "total": 165000 },
  { "name": "Mart", "total": 180000 }
]
```

### Recent Transactions

**Field:** `finance.recentTransactions`  
**Type:** `Array<Transaction>`  
**Description:** Last 10 transactions

**Transaction Structure:**
```typescript
{
  id: string;
  date: string; // ISO 8601
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
}
```

### Cash Flow

**Field:** `finance.cashFlow`  
**Type:** `number`  
**Unit:** TRY  
**Description:** Current cash flow (sum of all account balances)

**Calculation:**
```sql
SELECT SUM(balance) 
FROM accounts 
WHERE organization_id = ?
```

---

## System Metrics

### Uptime

**Field:** `system.uptime`  
**Type:** `number`  
**Unit:** Percentage (0-100)  
**Description:** System uptime percentage

**Current Implementation:** Hardcoded to `99.9` (to be replaced with real monitoring)

**Future Implementation:**
```typescript
const uptime = await prometheusService.getUptime();
```

### Active Users

**Field:** `system.activeUsers`  
**Type:** `number`  
**Description:** Number of active users in last 24 hours

**Current Implementation:** Mock value `127`

**Future Implementation:**
```sql
SELECT COUNT(DISTINCT user_id) 
FROM audit_logs 
WHERE organization_id = ? 
  AND action = 'login'
  AND created_at > NOW() - INTERVAL '24 hours'
```

### Open Tickets

**Field:** `system.openTickets`  
**Type:** `number`  
**Description:** Number of open support tickets

**Current Implementation:** Mock value `3`

**Future Implementation:**
```sql
SELECT COUNT(*) 
FROM service_requests 
WHERE organization_id = ? 
  AND status IN ('open', 'in_progress')
```

---

## IoT Metrics

### Device Count

**Field:** `iot.deviceCount`  
**Type:** `number`  
**Description:** Total number of active IoT devices

**Calculation:**
```sql
SELECT COUNT(*) 
FROM devices 
WHERE organization_id = ? 
  AND is_active = true
```

### Active Devices

**Field:** `iot.activeDevices`  
**Type:** `number`  
**Description:** Number of devices currently online

**Calculation:**
```sql
SELECT COUNT(*) 
FROM devices 
WHERE organization_id = ? 
  AND status = 'online'
  AND last_seen > NOW() - INTERVAL '5 minutes'
```

### Latest Telemetry

**Field:** `iot.latestTelemetry`  
**Type:** `Array<Telemetry>`  
**Description:** Latest telemetry data from all devices

**Telemetry Structure:**
```typescript
{
  deviceId: string;
  deviceName: string;
  timestamp: string; // ISO 8601
  temperature?: number; // °C
  ph?: number;
  orp?: number; // mV
  tds?: number; // ppm
  flowRate?: number; // L/min
}
```

### Device Alerts

**Field:** `iot.alerts`  
**Type:** `Array<Alert>`  
**Description:** Recent device alerts

**Alert Structure:**
```typescript
{
  id: string;
  deviceId: string;
  deviceName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  isResolved: boolean;
}
```

---

## AI Predictions

### Revenue Prediction

**Field:** `ai.prediction`  
**Type:** `FinancialPrediction`  
**Description:** AI-powered revenue prediction for next month

**Prediction Structure:**
```typescript
{
  predictedRevenue: number; // TRY
  confidence: number; // 0-1
  reasoning: string; // Turkish explanation
}
```

**AI Providers (in order):**
1. **Google GenAI App Builder** (primary)
2. **OpenAI GPT-4 Turbo** (fallback)
3. **Statistical method** (last resort)

**Prediction Logic:**
```typescript
// Uses historical monthly revenue data
const history = financialData.monthlyRevenue.map(month => ({
  month: month.name,
  revenue: month.total
}));

const prediction = await jarvisService.predictFinancials(history);
```

**Example Response:**
```json
{
  "predictedRevenue": 195000,
  "confidence": 0.75,
  "reasoning": "Son 3 ay verisine dayalı pozitif trend analizi. Ortalama %10 büyüme oranı gözlemlendi. Nisan ayı için 195.000 TL tahmin edilmektedir."
}
```

---

## API Reference

### Get CEO Summary

```http
GET /api/v1/ceo/summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "finance": {
    "totalRevenue": 180000,
    "totalExpenses": 120000,
    "netProfit": 60000,
    "cashFlow": 250000,
    "monthlyRevenue": [
      { "name": "Ocak", "total": 150000 },
      { "name": "Şubat", "total": 165000 },
      { "name": "Mart", "total": 180000 }
    ],
    "recentTransactions": [
      {
        "id": "tx-001",
        "date": "2025-01-27T10:00:00Z",
        "amount": 5000,
        "type": "income",
        "description": "Invoice payment",
        "category": "Sales"
      }
    ]
  },
  "system": {
    "uptime": 99.9,
    "activeUsers": 127,
    "openTickets": 3
  },
  "iot": {
    "deviceCount": 5,
    "activeDevices": 4,
    "latestTelemetry": [
      {
        "deviceId": "dev-001",
        "deviceName": "Main Pool Controller",
        "timestamp": "2025-01-27T10:00:00Z",
        "temperature": 25.5,
        "ph": 7.4,
        "orp": 700,
        "tds": 450,
        "flowRate": 12.5
      }
    ],
    "alerts": []
  },
  "ai": {
    "prediction": {
      "predictedRevenue": 195000,
      "confidence": 0.75,
      "reasoning": "Son 3 ay verisine dayalı pozitif trend analizi..."
    }
  }
}
```

### Get Home Dashboard (Alias)

```http
GET /api/v1/ceo/home
Authorization: Bearer <token>
```

**Response:** Same as `/summary`, but formatted for frontend KPI cards

```json
{
  "kpis": [
    {
      "title": "Toplam Gelir",
      "value": "180.000 ₺",
      "description": "Bu ay",
      "icon": "TrendingUp",
      "trend": { "value": 0, "direction": "neutral" },
      "variant": "primary"
    },
    {
      "title": "Toplam Gider",
      "value": "120.000 ₺",
      "description": "Bu ay",
      "icon": "TrendingDown",
      "trend": { "value": 0, "direction": "neutral" },
      "variant": "default"
    },
    {
      "title": "Net Kar",
      "value": "60.000 ₺",
      "description": "Bu ay",
      "icon": "BarChart3",
      "trend": { "value": 0, "direction": "neutral" },
      "variant": "success"
    },
    {
      "title": "Aktif Cihazlar",
      "value": "4",
      "description": "IoT",
      "icon": "Activity",
      "trend": { "value": 0, "direction": "neutral" },
      "variant": "default"
    }
  ],
  "recentActivities": [],
  "activeEvent": {
    "title": "Sistem Aktif",
    "description": "Tüm servisler çalışıyor",
    "level": "info"
  },
  "generatedAt": "2025-01-27T10:00:00Z"
}
```

---

## Metric Definitions

### Revenue

**Definition:** Income from sales of products/services  
**Source:** `invoices` table (type='sales', status='paid')  
**Calculation Period:** Current month  
**Currency:** TRY

### Expenses

**Definition:** Money spent on operations  
**Source:** `transactions` table (type='expense')  
**Calculation Period:** Current month  
**Currency:** TRY

### Net Profit

**Definition:** Revenue minus Expenses  
**Formula:** `totalRevenue - totalExpenses`  
**Currency:** TRY

### Cash Flow

**Definition:** Total available cash across all accounts  
**Source:** `accounts` table (sum of balances)  
**Currency:** TRY

### Device Status

**Online:** Device sent telemetry in last 5 minutes  
**Offline:** Device hasn't sent telemetry in last 5 minutes  
**Error:** Device sent error alert  
**Maintenance:** Device marked as maintenance mode

---

## Future Enhancements

### Planned Metrics

1. **Customer Metrics:**
   - New customers this month
   - Customer retention rate
   - Average customer value

2. **Sales Metrics:**
   - Pipeline value
   - Conversion rate
   - Average deal size

3. **Operational Metrics:**
   - Invoice processing time
   - Service request resolution time
   - Inventory turnover

4. **AI Enhancements:**
   - Expense prediction
   - Cash flow forecast
   - Risk assessment

---

## Questions?

- Check `src/routes/v1/ceo.ts` for implementation
- See `src/modules/finance/service.ts` for financial calculations
- Review `src/modules/iot/service.ts` for IoT metrics
- See `src/services/ai/jarvis.ts` for AI predictions

