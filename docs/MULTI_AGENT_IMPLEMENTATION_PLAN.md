# 🤖 Multi-Agent AI Architecture - Implementasyon Planı

**Tarih:** 27 Ocak 2025  
**Durum:** Planlama Aşaması

---

## 🎯 Hedef

Her bot için ayrı AI agent servisi oluşturmak ve JARVIS'i master coordinator olarak yapılandırmak.

---

## 📋 Implementasyon Adımları

### 1. Her Bot İçin AI Agent Servisi Oluştur

#### 1.1 FinBot AI Agent
**Dosya:** `src/services/ai/agents/finbot-agent.ts`

**Özellikler:**
- Finansal işlemler için AI desteği
- Google GenAI App Builder kullanır
- Finansal tahminleme
- Nakit akışı analizi
- Bütçe planlama

**Metodlar:**
```typescript
class FinBotAgent {
  async analyzeFinancials(data: FinancialData): Promise<AnalysisResult>
  async predictRevenue(period: string): Promise<Prediction>
  async generateBudgetPlan(): Promise<BudgetPlan>
  async answerQuestion(question: string): Promise<string>
}
```

#### 1.2 MuBot AI Agent
**Dosya:** `src/services/ai/agents/mubot-agent.ts`

**Özellikler:**
- Muhasebe kayıtları için AI desteği
- Google GenAI App Builder kullanır
- Muhasebe kuralları bilgisi
- Rapor oluşturma
- Yevmiye defteri analizi

**Metodlar:**
```typescript
class MuBotAgent {
  async createLedgerEntry(transaction: Transaction): Promise<LedgerEntry>
  async generateReport(type: string): Promise<Report>
  async answerAccountingQuestion(question: string): Promise<string>
  async validateTransaction(transaction: Transaction): Promise<ValidationResult>
}
```

#### 1.3 SalesBot AI Agent
**Dosya:** `src/services/ai/agents/salesbot-agent.ts`

**Özellikler:**
- Lead yönetimi için AI desteği
- OpenAI GPT-4 Turbo kullanır (lead scoring için)
- Satış tahminleme
- Müşteri ilişkileri

**Metodlar:**
```typescript
class SalesBotAgent {
  async scoreLead(lead: Lead): Promise<LeadScore>
  async predictSales(period: string): Promise<SalesPrediction>
  async generateProposal(deal: Deal): Promise<Proposal>
  async answerSalesQuestion(question: string): Promise<string>
}
```

#### 1.4 StockBot AI Agent
**Dosya:** `src/services/ai/agents/stockbot-agent.ts`

**Özellikler:**
- Stok yönetimi için AI desteği
- OpenAI GPT-4 Turbo kullanır (tahminleme için)
- Stok optimizasyonu
- Tedarik planlama

**Metodlar:**
```typescript
class StockBotAgent {
  async optimizeStock(products: Product[]): Promise<OptimizationResult>
  async predictDemand(productId: string): Promise<DemandPrediction>
  async generatePurchaseOrder(items: Item[]): Promise<PurchaseOrder>
  async answerStockQuestion(question: string): Promise<string>
}
```

#### 1.5 HRBot AI Agent
**Dosya:** `src/services/ai/agents/hrbot-agent.ts`

**Özellikler:**
- İK süreçleri için AI desteği
- OpenAI GPT-4 Turbo kullanır
- Bordro hesaplama
- Performans takibi

**Metodlar:**
```typescript
class HRBotAgent {
  async calculatePayroll(employees: Employee[]): Promise<Payroll>
  async analyzePerformance(employeeId: string): Promise<PerformanceAnalysis>
  async answerHRQuestion(question: string): Promise<string>
}
```

#### 1.6 IoT Bot AI Agent
**Dosya:** `src/services/ai/agents/iotbot-agent.ts`

**Özellikler:**
- IoT cihaz yönetimi için AI desteği
- OpenAI GPT-4 Turbo kullanır (anomali tespiti için)
- Sensör verisi analizi
- Alarm yönetimi

**Metodlar:**
```typescript
class IoTBotAgent {
  async analyzeSensorData(data: SensorData[]): Promise<AnalysisResult>
  async detectAnomaly(data: SensorData): Promise<AnomalyResult>
  async generateAlarm(condition: AlarmCondition): Promise<Alarm>
  async answerIoTQuestion(question: string): Promise<string>
}
```

---

### 2. Bot'lar Arası Mesajlaşma Protokolü

**Dosya:** `src/services/ai/agent-communication.ts`

**Özellikler:**
- Redis Streams kullanarak mesajlaşma
- Event-driven communication
- Message routing
- Response handling

**Interface:**
```typescript
interface AgentMessage {
  from: 'finbot' | 'mubot' | 'salesbot' | 'stockbot' | 'hrbot' | 'iotbot' | 'jarvis';
  to: 'finbot' | 'mubot' | 'salesbot' | 'stockbot' | 'hrbot' | 'iotbot' | 'jarvis' | 'all';
  type: 'query' | 'notification' | 'request' | 'response';
  data: Record<string, unknown>;
  timestamp: string;
  correlationId: string;
}

class AgentCommunication {
  async sendMessage(message: AgentMessage): Promise<void>
  async receiveMessages(agentId: string): Promise<AgentMessage[]>
  async waitForResponse(correlationId: string, timeout: number): Promise<AgentMessage>
}
```

**Redis Streams:**
```typescript
const streams = {
  finbot: 'ai:finbot:messages',
  mubot: 'ai:mubot:messages',
  salesbot: 'ai:salesbot:messages',
  stockbot: 'ai:stockbot:messages',
  hrbot: 'ai:hrbot:messages',
  iotbot: 'ai:iotbot:messages',
  jarvis: 'ai:jarvis:messages' // Master stream
};
```

---

### 3. JARVIS Master Coordinator Güncellemesi

**Dosya:** `src/services/ai/jarvis.ts` (güncelle)

**Yeni Özellikler:**
- Tüm agent'ları yönetme
- Agent koordinasyonu
- Kullanıcıya bilgi verme
- Günlük özet oluşturma
- Uyarı ve öneri sistemi

**Yeni Metodlar:**
```typescript
class JarvisService {
  // Agent yönetimi
  async getAgentStatus(agentId: string): Promise<AgentStatus>
  async getAllAgentsStatus(): Promise<Record<string, AgentStatus>>
  async coordinateAgents(task: Task): Promise<CoordinationResult>
  
  // Kullanıcıya bilgi verme
  async generateDailySummary(): Promise<DailySummary>
  async generateAlerts(): Promise<Alert[]>
  async generateRecommendations(): Promise<Recommendation[]>
  
  // Agent'lar arası koordinasyon
  async routeMessage(message: AgentMessage): Promise<void>
  async aggregateResults(agentResults: AgentResult[]): Promise<AggregatedResult>
}
```

---

### 4. Kullanıcıya Bilgi Verme API'leri

**Dosya:** `src/routes/v1/jarvis.ts` (yeni)

**Endpoints:**
```typescript
// Günlük özet
GET /api/v1/jarvis/daily-summary

// Agent durumları
GET /api/v1/jarvis/agent-status
GET /api/v1/jarvis/agent-status/:agentId

// Öneriler
GET /api/v1/jarvis/recommendations

// Uyarılar
GET /api/v1/jarvis/alerts

// Kullanıcıdan JARVIS'e soru
POST /api/v1/jarvis/ask
{
  "question": "Bu ay gelirim ne kadar?",
  "context": {}
}
```

---

### 5. Agent Status Dashboard

**Dosya:** `frontend/src/components/ai/AgentStatusDashboard.tsx` (yeni)

**Özellikler:**
- Her agent'ın durumunu göster
- Son aktivite zamanı
- Mesaj sayısı
- Hata oranı
- Yanıt süresi

---

## 🚀 Implementasyon Sırası

1. **Adım 1:** FinBot AI Agent oluştur (en önemli)
2. **Adım 2:** MuBot AI Agent oluştur
3. **Adım 3:** Bot'lar arası mesajlaşma protokolü
4. **Adım 4:** JARVIS master coordinator güncellemesi
5. **Adım 5:** Kullanıcıya bilgi verme API'leri
6. **Adım 6:** Diğer agent'lar (SalesBot, StockBot, HRBot, IoT Bot)
7. **Adım 7:** Agent Status Dashboard

---

## 📝 Notlar

- Her agent kendi domain'inde uzman olacak
- JARVIS tüm agent'ları koordine edecek
- Bot'lar birbirine bilgi verecek
- JARVIS kullanıcıya (sen) bilgi verecek
- Event-driven architecture kullanılacak

---

**Sonraki Adım:** FinBot AI Agent'ı oluşturmaya başla

