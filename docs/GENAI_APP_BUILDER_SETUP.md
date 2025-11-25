# 🚀 Google GenAI App Builder Entegrasyon Rehberi

## 📋 Genel Bakış

Bu dokümantasyon, DESE EA Plan projesine Google Cloud GenAI App Builder (Vertex AI Agent Builder) entegrasyonunu açıklar. GenAI App Builder, conversational AI, document AI ve intelligent search özellikleri sağlar.

**Trial Kredisi:** ₺41,569.31 (Ekim 2026'ya kadar geçerli)  
**Proje ID:** `ea-plan-seo-project`

## 🎯 Kullanım Senaryoları

### 1. Conversational AI (Chatbot)
- **FinBot:** Finansal danışmanlık ve tahminler
- **MuBot:** Muhasebe ve kayıt yönetimi
- **JARVIS:** AIOps ve sistem analizi

### 2. Document AI
- Dokümantasyon analizi
- Veri çıkarma (entities, dates, amounts)
- Otomatik özetleme

### 3. Intelligent Search
- Knowledge base arama
- Müşteri verilerinde arama
- İçerik keşfi

## 📦 Kurulum

### 1. Gerekli Paketler

Paketler zaten `package.json`'a eklenmiştir:

```json
{
  "@google-cloud/aiplatform": "^3.11.0",
  "@google-cloud/documentai": "^8.0.0"
}
```

Kurulum:
```bash
pnpm install
```

### 2. GCP Credentials Yapılandırması

Mevcut `gcp-credentials.json` dosyası kullanılacaktır. Eğer yoksa:

1. Google Cloud Console'a gidin
2. IAM & Admin > Service Accounts
3. Yeni service account oluşturun veya mevcut olanı kullanın
4. "Vertex AI User" rolünü verin
5. JSON key indirin ve `gcp-credentials.json` olarak kaydedin

### 3. Environment Variables

`.env` dosyanıza şu değişkenleri ekleyin:

```bash
# GCP Configuration
GCP_PROJECT_ID=ea-plan-seo-project
GCP_LOCATION=us-central1

# GenAI App Builder
GENAI_APP_BUILDER_ENABLED=true
GENAI_AGENT_ID=your-agent-id
GENAI_DATA_STORE_ID=your-data-store-id
GENAI_SEARCH_ENGINE_ID=your-search-engine-id

# Google Application Credentials (Docker için)
GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-credentials.json
```

### 4. GCP API'lerini Aktifleştirme

**Yöntem 1: Script Kullanarak (Önerilen)**

Windows PowerShell:
```powershell
.\scripts\gcp-enable-vertex-ai-api.ps1
```

Linux/Mac:
```bash
chmod +x scripts/gcp-enable-vertex-ai-api.sh
./scripts/gcp-enable-vertex-ai-api.sh
```

**Yöntem 2: Manuel (gcloud CLI)**

```bash
# Vertex AI API
gcloud services enable aiplatform.googleapis.com --project=ea-plan-seo-project

# Document AI API
gcloud services enable documentai.googleapis.com --project=ea-plan-seo-project

# Discovery Engine API (Search için)
gcloud services enable discoveryengine.googleapis.com --project=ea-plan-seo-project
```

**Yöntem 3: Google Cloud Console**

1. [Google Cloud Console > APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. "Vertex AI API" arayın
3. "Enable" butonuna tıklayın
4. Aynı işlemi "Document AI API" ve "Discovery Engine API" için tekrarlayın

**Not:** API'lerin aktifleştirilmesi birkaç dakika sürebilir. Aktifleştirme tamamlandıktan sonra Vertex AI Studio sayfasını yenileyin.

## 🔧 GenAI App Builder Console'da Agent Oluşturma

### 1. Agent Oluşturma

1. [Google Cloud Console](https://console.cloud.google.com/) > Vertex AI > Agent Builder
2. "Create Agent" butonuna tıklayın
3. Agent adını girin (örn: "dese-finbot-agent")
4. Data Store seçin veya yeni oluşturun
5. Agent ID'yi kopyalayın ve `GENAI_AGENT_ID` olarak `.env`'e ekleyin

### 2. Data Store Oluşturma (Knowledge Base)

1. Agent Builder > Data Stores
2. "Create Data Store" butonuna tıklayın
3. Veri kaynağını seçin:
   - Website
   - Cloud Storage
   - BigQuery
   - Manual upload
4. Data Store ID'yi kopyalayın ve `GENAI_DATA_STORE_ID` olarak `.env`'e ekleyin

### 3. Search Engine Oluşturma (Opsiyonel)

1. Discovery Engine > Search Engines
2. "Create Search Engine" butonuna tıklayın
3. Search Engine ID'yi kopyalayın ve `GENAI_SEARCH_ENGINE_ID` olarak `.env`'e ekleyin

## 💻 Kullanım

### GenAI App Builder Service

```typescript
import { genAIAppBuilderService } from '@/services/ai/genai-app-builder.js';

// Chat (Conversational AI)
const response = await genAIAppBuilderService.chat([
  { role: 'user', content: 'Finansal durumumu analiz et' }
]);

// Document Analysis
const analysis = await genAIAppBuilderService.analyzeDocument(
  documentContent,
  'application/pdf'
);

// Search
const results = await genAIAppBuilderService.search('havuz bakımı', 10);

// Financial Insights (FinBot için)
const insights = await genAIAppBuilderService.generateFinancialInsights({
  revenue: 100000,
  expenses: 80000,
  // ...
});

// Accounting Insights (MuBot için)
const accountingInsights = await genAIAppBuilderService.generateAccountingInsights({
  transactions: [...],
  // ...
});
```

### JARVIS Service (Hybrid: OpenAI + GenAI)

JARVIS servisi otomatik olarak GenAI App Builder'ı kullanır (eğer etkinse), aksi halde OpenAI'ye düşer:

```typescript
import { jarvisService } from '@/services/ai/jarvis.js';

// Log Analysis (GenAI kullanır)
const analysis = await jarvisService.analyzeLogs(logs);

// Financial Prediction (GenAI kullanır)
const prediction = await jarvisService.predictFinancials(history);
```

## 🔌 API Endpoints

### Health Check

```bash
GET /api/v1/health
```

Response'da `genai` durumu görünecektir:

```json
{
  "status": "healthy",
  "services": {
    "genai": {
      "enabled": true,
      "projectId": "ea-plan-seo-project",
      "location": "us-central1"
    }
  }
}
```

### GenAI Status Endpoint (Yeni)

```typescript
// src/routes/v1/genai.ts (oluşturulacak)
GET /api/v1/genai/status
```

## 📊 Maliyet Yönetimi

### Trial Kredisi Kullanımı

- **Toplam Kredi:** ₺41,569.31
- **Geçerlilik:** Ekim 2026'ya kadar
- **Kullanım İzleme:** [Google Cloud Console > Billing](https://console.cloud.google.com/billing)

### Maliyet Optimizasyonu

1. **Caching:** GenAI yanıtlarını Redis'te cache'leyin
2. **Rate Limiting:** API çağrılarını sınırlandırın
3. **Batch Processing:** Toplu işlemler için batch API kullanın
4. **Model Seçimi:** Daha küçük modelleri (gemini-1.5-flash) kullanın

### Kredi Kullanım İzleme

```bash
# GCP CLI ile kredi kullanımını kontrol edin
gcloud billing accounts list
gcloud billing projects describe ea-plan-seo-project
```

## 🧪 Test

### Unit Test

```bash
pnpm test src/services/ai/genai-app-builder.test.ts
```

### Integration Test

```bash
# GenAI App Builder servisini test et
pnpm test:integration -- genai
```

### Manual Test

```typescript
// Test script
import { genAIAppBuilderService } from './src/services/ai/genai-app-builder.js';

const status = genAIAppBuilderService.getStatus();
console.log('GenAI Status:', status);

if (status.enabled) {
  const response = await genAIAppBuilderService.chat([
    { role: 'user', content: 'Merhaba, test mesajı' }
  ]);
  console.log('Response:', response);
}
```

## 🐛 Troubleshooting

### "GenAI App Builder is not enabled"

**Çözüm:**
1. `.env` dosyasında `GENAI_APP_BUILDER_ENABLED=true` olduğundan emin olun
2. `GCP_PROJECT_ID` doğru ayarlanmış mı kontrol edin
3. `gcp-credentials.json` dosyasının mevcut olduğundan emin olun

### "Agent ID not configured"

**Çözüm:**
1. GenAI App Builder Console'da agent oluşturun
2. Agent ID'yi kopyalayın
3. `.env` dosyasına `GENAI_AGENT_ID=your-agent-id` ekleyin

### Authentication Errors

**Çözüm:**
1. Service account'un "Vertex AI User" rolüne sahip olduğundan emin olun
2. `GOOGLE_APPLICATION_CREDENTIALS` environment variable'ını kontrol edin
3. Docker kullanıyorsanız, credentials dosyasının container'a mount edildiğinden emin olun

### API Not Enabled

**Çözüm:**
```bash
gcloud services enable aiplatform.googleapis.com --project=ea-plan-seo-project
gcloud services enable documentai.googleapis.com --project=ea-plan-seo-project
```

## 📚 Kaynaklar

- [Vertex AI Agent Builder Documentation](https://cloud.google.com/generative-ai-app-builder/docs)
- [Vertex AI Node.js SDK](https://cloud.google.com/nodejs/docs/reference/aiplatform/latest)
- [GenAI App Builder Pricing](https://cloud.google.com/generative-ai-app-builder/pricing)
- [Trial Credits Terms](https://cloud.google.com/free/docs/gcp-free-tier)

## 🔄 Sonraki Adımlar

1. ✅ GenAI App Builder servisi oluşturuldu
2. ✅ JARVIS servisi entegre edildi
3. ⏳ FinBot ve MuBot için conversational AI agent'ları
4. ⏳ Document AI entegrasyonu
5. ⏳ Knowledge Base yapılandırması
6. ⏳ Search Engine entegrasyonu

## 📝 Notlar

- GenAI App Builder, OpenAI'ye alternatif olarak kullanılabilir
- Hybrid yaklaşım: GenAI etkinse kullanılır, değilse OpenAI'ye düşer
- Trial kredisi bitmeden önce production kullanım için billing account ayarlayın
- Tüm AI işlemleri audit log'a kaydedilir (KVKK/GDPR uyumluluğu için)

