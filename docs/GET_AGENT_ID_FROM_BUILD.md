# Build Sayfasından Agent ID Alma Rehberi

## 📍 Uygulamanız Başarıyla Oluşturuldu!

Görüntüde "DESE EA Plan Finansal Asistan" uygulamanız hazır. Şimdi Agent ID'yi bulmamız gerekiyor.

## 🔍 Agent ID'yi Bulma Yöntemleri

### Yöntem 1: URL'den (En Kolay)

1. Tarayıcınızın **adres çubuğuna** bakın
2. URL şu formatta olabilir:
   ```
   console.cloud.google.com/vertex-ai/studio/build/.../agents/AGENT_ID_HERE
   ```
   veya
   ```
   console.cloud.google.com/vertex-ai/studio/build/.../apps/APP_ID_HERE
   ```
3. URL'deki `agents/` veya `apps/` sonrasındaki sayıyı kopyalayın

### Yöntem 2: Uygulama Ayarlarından

1. Build sayfasında **"Settings"** (Ayarlar) butonuna tıklayın
2. "App ID" veya "Agent ID" bölümünü bulun
3. ID'yi kopyalayın

### Yöntem 3: Metadata Dosyasından

1. Sol panelde `metadata.json` dosyasına tıklayın
2. İçeriğinde `agentId` veya `appId` alanını bulun
3. Değeri kopyalayın

## 📝 Agent ID'yi Projeye Ekleme

Agent ID'yi bulduktan sonra:

### Otomatik Ekleme (Önerilen)

```powershell
# URL veya Agent ID'yi girin
.\scripts\get-agent-id-from-url.ps1
```

Script sizden URL veya Agent ID'yi isteyecek, otomatik olarak `.env` dosyasına ekleyecek.

### Manuel Ekleme

```powershell
.\scripts\add-genai-agent-id.ps1 -AgentId "YOUR_AGENT_ID_HERE"
```

## ✅ Doğrulama

Agent ID eklendikten sonra:

```bash
# .env dosyasını kontrol edin
cat .env | grep GENAI_AGENT_ID

# Veya PowerShell'de
Get-Content .env | Select-String "GENAI_AGENT_ID"
```

## 🚀 Sonraki Adımlar

1. ✅ Agent ID'yi `.env` dosyasına ekleyin
2. ✅ Paketleri kurun: `pnpm install`
3. ✅ Uygulamayı başlatın: `pnpm dev`
4. ✅ Test edin: `curl http://localhost:3000/health`
5. ✅ GenAI endpoint'ini test edin: `POST /api/v1/genai/chat`

## 💡 İpucu

Eğer URL'yi paylaşırsanız, ben Agent ID'yi çıkarıp otomatik olarak ekleyebilirim!

