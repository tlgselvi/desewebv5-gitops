# Agent Builder Alternatif Kurulum Yöntemleri

## 🔍 Sorun: "URL not found" Hatası

Agent Builder sayfası açılmıyorsa, aşağıdaki alternatif yöntemleri deneyin:

## ✅ Yöntem 1: Vertex AI Console'dan Erişim

1. [Vertex AI Console](https://console.cloud.google.com/vertex-ai?project=ea-plan-seo-project) sayfasına gidin
2. Sol menüden "Agent Builder" veya "Conversational AI" seçeneğini bulun
3. "Create Agent" butonuna tıklayın

## ✅ Yöntem 2: Discovery Engine Üzerinden

Agent Builder, Discovery Engine API'sini kullanır. Doğrudan Discovery Engine üzerinden erişebilirsiniz:

1. [Discovery Engine Console](https://console.cloud.google.com/gen-app-builder/data-stores?project=ea-plan-seo-project) sayfasına gidin
2. "Create Data Store" butonuna tıklayın
3. Data Store oluşturduktan sonra Agent oluşturabilirsiniz

## ✅ Yöntem 3: Vertex AI Studio'dan Başlama

1. [Vertex AI Studio](https://console.cloud.google.com/vertex-ai/studio?project=ea-plan-seo-project) sayfasına gidin
2. "Agent Builder" sekmesine gidin
3. "Create Agent" butonuna tıklayın

## ✅ Yöntem 4: REST API ile Agent Oluşturma

Eğer Console erişimi çalışmıyorsa, REST API kullanarak agent oluşturabilirsiniz:

```bash
# Access token al
gcloud auth application-default print-access-token

# Agent oluştur (REST API)
curl -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/ea-plan-seo-project/locations/us-central1/agents" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "dese-finbot-agent",
    "defaultLanguageCode": "tr",
    "timeZone": "Europe/Istanbul"
  }'
```

## ✅ Yöntem 5: gcloud CLI ile (Eğer destekleniyorsa)

```bash
# Agent oluştur
gcloud ai agents create \
  --display-name="dese-finbot-agent" \
  --default-language-code="tr" \
  --time-zone="Europe/Istanbul" \
  --project=ea-plan-seo-project \
  --region=us-central1
```

## 🔧 Sorun Giderme

### API'lerin Aktif Olduğundan Emin Olun

```bash
# Tüm gerekli API'leri kontrol et
gcloud services list --enabled --project=ea-plan-seo-project | grep -E "aiplatform|discoveryengine|documentai"
```

### Gerekli API'leri Aktifleştirin

```bash
# Vertex AI API
gcloud services enable aiplatform.googleapis.com --project=ea-plan-seo-project

# Discovery Engine API
gcloud services enable discoveryengine.googleapis.com --project=ea-plan-seo-project

# Document AI API
gcloud services enable documentai.googleapis.com --project=ea-plan-seo-project
```

### IAM İzinlerini Kontrol Edin

Service account'unuzun gerekli izinlere sahip olduğundan emin olun:

```bash
# Vertex AI User rolü
gcloud projects add-iam-policy-binding ea-plan-seo-project \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@ea-plan-seo-project.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Discovery Engine Admin rolü
gcloud projects add-iam-policy-binding ea-plan-seo-project \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@ea-plan-seo-project.iam.gserviceaccount.com" \
  --role="roles/discoveryengine.admin"
```

## 🎯 Önerilen Yaklaşım

1. **Önce Vertex AI Console'dan deneyin** - En güvenilir yöntem
2. **Discovery Engine üzerinden deneyin** - Alternatif erişim
3. **REST API kullanın** - En esnek yöntem

## 📝 Notlar

- Agent Builder, Discovery Engine API'sini kullanır
- Bazı bölgelerde Agent Builder henüz kullanılamayabilir
- `us-central1` bölgesi genellikle en güncel özelliklere sahiptir
- Trial kredisi aktif olduğundan emin olun

## 🔗 Faydalı Linkler

- [Vertex AI Console](https://console.cloud.google.com/vertex-ai?project=ea-plan-seo-project)
- [Discovery Engine Console](https://console.cloud.google.com/gen-app-builder/data-stores?project=ea-plan-seo-project)
- [Vertex AI Studio](https://console.cloud.google.com/vertex-ai/studio?project=ea-plan-seo-project)
- [Agent Builder Documentation](https://cloud.google.com/generative-ai-app-builder/docs)

