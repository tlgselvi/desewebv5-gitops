# Agent ID'yi Bulma Rehberi

## 📍 HTML Dosyasında Agent ID Yok (Normal)

HTML dosyasında Agent ID bulunmaz. Agent ID şu yerlerde olabilir:

## 🔍 Agent ID'yi Bulma Yöntemleri

### Yöntem 1: metadata.json Dosyasından (En Kolay)

1. Sol panelde **`metadata.json`** dosyasına tıklayın
2. Dosya içeriğini açın
3. Şu alanları arayın:
   - `agentId`
   - `appId`
   - `id`
   - `agent_id`

Örnek metadata.json:
```json
{
  "agentId": "1234567890123456789",
  "name": "DESE EA Plan Finansal Asistan",
  ...
}
```

### Yöntem 2: URL'den

1. Tarayıcı adres çubuğuna bakın
2. URL şu formatta olabilir:
   ```
   console.cloud.google.com/vertex-ai/studio/build/.../agents/AGENT_ID
   ```
   veya
   ```
   console.cloud.google.com/vertex-ai/studio/build/.../apps/APP_ID
   ```

### Yöntem 3: Uygulama Ayarlarından

1. Build sayfasında **"Settings"** (Ayarlar) butonuna tıklayın
2. "App ID" veya "Agent ID" bölümünü bulun

## 📝 metadata.json İçeriğini Paylaşın

Lütfen `metadata.json` dosyasının içeriğini paylaşın, Agent ID'yi çıkarıp otomatik olarak ekleyeyim!

