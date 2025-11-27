# JARVIS Prompt Library - DESE EA PLAN v7.0

**Version:** 7.0.0  
**Last Updated:** 2025-01-27

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Financial Analysis Prompts](#financial-analysis-prompts)
3. [Log Analysis Prompts](#log-analysis-prompts)
4. [Lead Scoring Prompts](#lead-scoring-prompts)
5. [User Question Prompts](#user-question-prompts)
6. [Custom Prompt Templates](#custom-prompt-templates)
7. [Best Practices](#best-practices)

---

## Overview

JARVIS (Just A Rather Very Intelligent System) is the master AI coordinator for DESE EA PLAN v7.0. It uses **Google GenAI App Builder** (primary) and **OpenAI GPT-4** (fallback) to provide AI-powered insights across all modules.

### AI Providers

1. **Primary:** Google GenAI App Builder (Vertex AI)
2. **Fallback:** OpenAI GPT-4 Turbo
3. **Statistical:** Simple trend analysis (last resort)

### Service Location

- **File:** `src/services/ai/jarvis.ts`
- **API Endpoints:** `src/routes/v1/jarvis.ts`
- **CEO Dashboard:** `src/routes/v1/ceo.ts`

---

## Financial Analysis Prompts

### Revenue Prediction

**Use Case:** Predict next month's revenue based on historical data

**Prompt Template:**
```
You are JARVIS, a Financial Analyst. Analyze the historical revenue data and predict next month's revenue.

Historical Data:
{history}

Statistics:
- Average Revenue: {avgRevenue}
- Trend: {trend}
- Data Points: {dataPoints}

Provide a realistic prediction based on the trend and historical patterns.
Output JSON format:
{
  "predictedRevenue": number,
  "confidence": number (0-1),
  "reasoning": "string (in Turkish)"
}
```

**Example Usage:**
```typescript
const history = [
  { month: "Ocak", revenue: 150000 },
  { month: "Şubat", revenue: 165000 },
  { month: "Mart", revenue: 180000 }
];

const prediction = await jarvisService.predictFinancials(history);
```

**Expected Response:**
```json
{
  "predictedRevenue": 195000,
  "confidence": 0.75,
  "reasoning": "Son 3 ay verisine dayalı pozitif trend analizi. Ortalama %10 büyüme oranı gözlemlendi. Nisan ayı için 195.000 TL tahmin edilmektedir."
}
```

### Financial Insights

**Use Case:** Generate financial insights from transaction data

**Prompt Template:**
```
You are JARVIS, a Financial Analyst. Analyze the following financial data and provide insights.

Financial Data:
{financialData}

Task: {task} (e.g., "predict_revenue", "analyze_expenses", "cash_flow_forecast")

Provide detailed analysis in Turkish, including:
1. Key findings
2. Trends and patterns
3. Recommendations
4. Risk factors
```

---

## Log Analysis Prompts

### Root Cause Analysis

**Use Case:** Analyze error logs to find root cause

**Prompt Template:**
```
You are JARVIS, an AIOps expert. Analyze the following logs and identify the root cause of the error.
Provide a solution and estimate the severity.

Logs:
{logs}

Output JSON format:
{
  "rootCause": "string",
  "solution": "string",
  "severity": "low" | "medium" | "high" | "critical"
}
```

**Example Usage:**
```typescript
const logs = [
  "ERROR: Database connection failed",
  "ERROR: Connection timeout after 30s",
  "WARN: Retrying connection..."
];

const analysis = await jarvisService.analyzeLogs(logs);
```

**Expected Response:**
```json
{
  "rootCause": "Database connection timeout - network issue or database overload",
  "solution": "1. Check database server status\n2. Verify network connectivity\n3. Increase connection timeout\n4. Check database connection pool settings",
  "severity": "high"
}
```

---

## Lead Scoring Prompts

### Lead Qualification

**Use Case:** Score a lead based on profile and activity

**Prompt Template:**
```
You are JARVIS, a Sales Expert. Score this lead from 0 to 100 based on conversion probability.

Lead Data:
{leadData}

Consider:
- Industry match
- Company size
- Budget indicators
- Engagement level
- Decision maker presence

Output JSON format:
{
  "score": number (0-100),
  "category": "cold" | "warm" | "hot",
  "explanation": "string"
}
```

**Example Usage:**
```typescript
const leadData = {
  company: "ABC Corp",
  industry: "Technology",
  employees: 500,
  budget: 50000,
  engagement: "high",
  decisionMaker: true
};

const score = await jarvisService.scoreLead(leadData);
```

**Expected Response:**
```json
{
  "score": 85,
  "category": "hot",
  "explanation": "Strong industry match, good company size, confirmed budget, high engagement, and decision maker identified. High conversion probability."
}
```

---

## User Question Prompts

### General Questions

**Use Case:** Answer user questions using agent coordination

**Prompt Template:**
```
Sen JARVIS'sin. Master coordinator AI agent'sın. Kullanıcının sorusunu cevapla.

Soru: {question}
{context ? `Bağlam: ${JSON.stringify(context, null, 2)}` : ''}

Türkçe olarak detaylı ve anlaşılır bir şekilde cevap ver.
```

**Agent Routing:**

JARVIS automatically routes questions to specialized agents:

- **FinBot:** Gelir, gider, bütçe, nakit
- **MuBot:** Muhasebe, yevmiye, rapor
- **SalesBot:** Satış, lead, müşteri, deal, CRM
- **StockBot:** Stok, envanter, sipariş, ürün
- **HRBot:** Bordro, çalışan, performans, SGK, İK
- **IoTBot:** IoT, sensör, cihaz, alarm, havuz
- **SEOBot:** SEO, içerik, keyword, arama
- **ServiceBot:** Servis, saha, teknisyen, randevu, iş emri
- **AIOpsBot:** Sistem, arıza, hata, düzelt, anomali, sağlık
- **ProcurementBot:** Satın alma, procurement, RFQ, tedarikçi

**Example Usage:**
```typescript
const answer = await jarvisService.answerUserQuestion(
  "Bu ay gelir ne kadar?",
  { organizationId: "org-123" }
);
```

---

## Custom Prompt Templates

### Daily Summary

**Use Case:** Generate daily business summary

**Prompt Template:**
```
You are JARVIS, a Business Intelligence Analyst. Generate a daily summary for {date}.

Financial Data:
{financialData}

Sales Data:
{salesData}

Operations Data:
{operationsData}

Provide:
1. Key metrics summary
2. Notable events
3. Recommendations
4. Alerts

Format in Turkish, be concise and actionable.
```

### Trend Analysis

**Use Case:** Analyze trends across multiple metrics

**Prompt Template:**
```
You are JARVIS, a Data Analyst. Analyze the following trends:

Metrics:
{metrics}

Time Period: {period}

Identify:
1. Upward trends
2. Downward trends
3. Anomalies
4. Correlations
5. Predictions

Output in Turkish with actionable insights.
```

### Risk Assessment

**Use Case:** Assess business risks

**Prompt Template:**
```
You are JARVIS, a Risk Management Expert. Assess the following business situation:

Context:
{context}

Data:
{data}

Identify:
1. Risk factors
2. Risk level (low/medium/high/critical)
3. Mitigation strategies
4. Monitoring recommendations

Output in Turkish.
```

---

## Best Practices

### 1. **Structured Output**

Always request JSON format for programmatic use:

```typescript
const prompt = `
...
Output JSON format:
{
  "field1": "type",
  "field2": number
}
`;
```

### 2. **Context Inclusion**

Always include relevant context:

```typescript
const prompt = `
Question: ${question}
Context: ${JSON.stringify(context, null, 2)}
`;
```

### 3. **Language Specification**

Always specify language (Turkish for this project):

```typescript
const prompt = `
...
Türkçe olarak detaylı ve anlaşılır bir şekilde cevap ver.
`;
```

### 4. **Error Handling**

Implement fallback mechanisms:

```typescript
try {
  // Try GenAI first
  const response = await genAIAppBuilderService.chat([...]);
} catch (genAIError) {
  // Fallback to OpenAI
  try {
    const response = await openaiClient.chat.completions.create(...);
  } catch (openAIError) {
    // Fallback to statistical method
    return statisticalPrediction(data);
  }
}
```

### 5. **Temperature Settings**

Use appropriate temperature for different tasks:

- **Financial predictions:** `temperature: 0.3` (more consistent)
- **Creative content:** `temperature: 0.7` (more creative)
- **Analysis:** `temperature: 0.5` (balanced)

### 6. **Token Limits**

Be mindful of token limits:

- **GenAI App Builder:** ~32k tokens
- **OpenAI GPT-4 Turbo:** ~128k tokens

For large datasets, summarize before sending:

```typescript
const summary = {
  avgRevenue: calculateAverage(revenues),
  trend: calculateTrend(revenues),
  dataPoints: revenues.length
};
```

### 7. **Response Parsing**

Always parse JSON responses safely:

```typescript
const jsonMatch = response.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    logger.error('Failed to parse JSON response', { parseError });
    return fallbackResponse;
  }
}
```

---

## Example Implementations

### Financial Prediction with Fallback

```typescript
async predictFinancials(history: any[]): Promise<FinancialPrediction> {
  // 1. Try GenAI App Builder
  if (this.useGenAI) {
    try {
      const insights = await genAIAppBuilderService.generateFinancialInsights({
        history,
        task: 'predict_revenue',
      });
      return parsePrediction(insights);
    } catch (error) {
      logger.warn('GenAI failed, trying OpenAI');
    }
  }

  // 2. Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: buildPrompt(history) }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      logger.warn('OpenAI failed, using statistical fallback');
    }
  }

  // 3. Statistical fallback
  return statisticalPrediction(history);
}
```

---

## API Reference

### JARVIS Endpoints

- `POST /api/v1/jarvis/analyze-logs` - Analyze error logs
- `POST /api/v1/jarvis/predict-financials` - Predict revenue
- `POST /api/v1/jarvis/score-lead` - Score a lead
- `POST /api/v1/jarvis/answer` - Answer user question
- `GET /api/v1/jarvis/agents/status` - Get agent status

### CEO Dashboard

- `GET /api/v1/ceo/summary` - Get CEO dashboard with AI predictions

---

## Questions?

- Check `src/services/ai/jarvis.ts` for implementation
- See `src/services/ai/genai-app-builder.ts` for GenAI integration
- Review `src/routes/v1/ceo.ts` for CEO dashboard integration

