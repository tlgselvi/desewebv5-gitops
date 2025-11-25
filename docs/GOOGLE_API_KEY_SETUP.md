# Google Cloud API Key Kurulum Rehberi

## 🔑 API Key Alma

### Yöntem 1: Google Cloud Console (Önerilen)

1. [API Credentials](https://console.cloud.google.com/apis/credentials?project=ea-plan-seo-project) sayfasına gidin
2. "Create Credentials" > "API Key" seçin
3. API Key oluşturulacak
4. Key'i kopyalayın
5. (Opsiyonel) Key'i kısıtlayın:
   - "Restrict key" butonuna tıklayın
   - "API restrictions" > "Restrict key" seçin
   - "Vertex AI API" ve "Discovery Engine API" seçin

### Yöntem 2: Script ile Kurulum

```powershell
.\scripts\setup-google-api-key.ps1
```

Script sizden API Key'i isteyecek, otomatik olarak `.env` dosyasına ekleyecek.

## 🧪 Test Etme

### Python ile Test

```bash
# Basit test
python scripts/genai-simple-test.py

# Tam test (tüm prompt ile)
python scripts/genai-test.py
```

### Environment Variable ile Test

```powershell
# PowerShell
$env:GOOGLE_CLOUD_API_KEY="your-api-key-here"
python scripts/genai-simple-test.py
```

```bash
# Bash/Linux
export GOOGLE_CLOUD_API_KEY="your-api-key-here"
python scripts/genai-simple-test.py
```

## 📝 .env Dosyasına Ekleme

API Key'i `.env` dosyasına ekleyin:

```bash
GOOGLE_CLOUD_API_KEY=your-api-key-here
```

## 🔒 Güvenlik

- ✅ API Key'i `.env` dosyasında saklayın
- ✅ `.env` dosyasını `.gitignore`'a ekleyin (zaten ekli)
- ✅ Production'da environment variable kullanın
- ✅ API Key'i kısıtlayın (sadece gerekli API'ler için)

## 🚀 Kullanım

### Python'da

```python
from google import genai
import os

client = genai.Client(
    vertexai=True,
    api_key=os.environ.get("GOOGLE_CLOUD_API_KEY"),
)
```

### Node.js/TypeScript'te

```typescript
// API Key ile direkt kullanım
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': process.env.GOOGLE_CLOUD_API_KEY
  },
  body: JSON.stringify({
    contents: [{
      parts: [{ text: 'Merhaba!' }]
    }]
  })
});
```

## ⚠️ Notlar

- API Key, Vertex AI API'lerine erişim sağlar
- Trial kredisi kullanılıyor (₺41,569.31)
- Rate limiting olabilir, dikkatli kullanın
- API Key'i paylaşmayın veya commit etmeyin

