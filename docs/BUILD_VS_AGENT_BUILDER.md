# Build Uygulaması vs Agent Builder - Farklar

## 🔍 Önemli Fark

**Build Sayfası** (`/studio/build`) ile oluşturulan uygulamalar:
- ❌ Agent Builder agent'ları **değil**
- ✅ Standalone web uygulamaları
- ✅ Frontend odaklı
- ✅ Backend entegrasyonu için API key gerekir

**Agent Builder** ile oluşturulan agent'lar:
- ✅ Backend API'lerle entegre edilebilir
- ✅ REST API desteği var
- ✅ Webhook entegrasyonu mümkün
- ✅ Agent ID ile erişilebilir

## 🎯 DESE EA Plan İçin En İyi Çözüm

### Seçenek 1: Build Uygulamasını Kullan (Mevcut)
- Frontend uygulama olarak çalışır
- API key ile backend'e bağlanabilir
- Kullanıcı arayüzü hazır

### Seçenek 2: Agent Builder Agent'ı Oluştur (Önerilen)
- Backend API'lerimizle direkt entegre
- REST API üzerinden erişilebilir
- `/api/v1/genai/chat` endpoint'i ile kullanılabilir

## 🔄 Build Uygulamasını Backend'e Entegre Etme

Eğer Build uygulamasını kullanmak istiyorsanız:

1. **API Key Alın:**
   - Build sayfasında "Get API key" butonuna tıklayın
   - API key'i kopyalayın

2. **Backend'de Kullanın:**
   ```typescript
   // Frontend'den backend API'ye istek atın
   const response = await fetch('/api/v1/genai/chat', {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${apiKey}` },
     body: JSON.stringify({ message: 'Merhaba' })
   });
   ```

## ✅ Önerilen: Agent Builder Agent'ı Oluştur

Backend entegrasyonu için Agent Builder agent'ı oluşturmanızı öneriyoruz:

1. [Agent Builder Console](https://console.cloud.google.com/vertex-ai/agent-builder?project=ea-plan-seo-project) sayfasına gidin
2. "Create Agent" butonuna tıklayın
3. Agent oluşturun
4. Agent ID'yi alın
5. `.env` dosyasına ekleyin

Bu şekilde backend API'lerinizle direkt entegre çalışır.

