# Vertex AI Studio Build Sayfası Kullanım Rehberi

## 📍 Sayfa: Build (Preview)

URL: `https://console.cloud.google.com/vertex-ai/studio/build?project=ea-plan-seo-project`

## 🚀 Adım Adım Kullanım

### Adım 1: Yeni Build Başlatma

**Seçenek A: Sol Menüden**
1. Sol menüde **"New build (preview)"** butonuna tıklayın
2. Mavi buton, üzerinde bina ikonu var

**Seçenek B: Alt Kısımdan**
1. Sayfanın alt kısmında **"Define your app here"** input alanını bulun
2. Buraya direkt prompt yazabilirsiniz

### Adım 2: Prompt'u Girme

1. `PROMPT_PRODUCTION_AGENT.txt` dosyasını açın
2. Tüm içeriği kopyalayın (Ctrl+A, Ctrl+C)
3. Build sayfasındaki input alanına yapıştırın (Ctrl+V)

### Adım 3: Uygulamayı Oluşturma

1. Prompt'u yapıştırdıktan sonra
2. **"Build"** veya **"Create"** butonuna tıklayın
3. Sistem uygulamayı oluşturmaya başlayacak (birkaç dakika sürebilir)

### Adım 4: Agent ID'yi Alma

Uygulama oluşturulduktan sonra:

**Yöntem 1: URL'den**
- URL'de `.../agents/AGENT_ID_HERE` şeklinde görünecek
- Agent ID'yi kopyalayın

**Yöntem 2: Uygulama Detaylarından**
- Uygulama sayfasında "Settings" veya "Details" bölümüne gidin
- Agent ID'yi bulun ve kopyalayın

### Adım 5: Agent ID'yi Projeye Ekleme

Agent ID'yi aldıktan sonra:

```powershell
.\scripts\add-genai-agent-id.ps1 -AgentId "YOUR_AGENT_ID_HERE"
```

Veya manuel olarak `.env` dosyasına ekleyin:
```bash
GENAI_AGENT_ID=your-agent-id-here
```

## 🎯 Örnek Kullanım Senaryoları

Build sayfasında oluşturduğunuz uygulamayı test etmek için:

1. **Chat Interface:** Uygulama oluşturulduktan sonra chat arayüzü açılacak
2. **Test Soruları:**
   - "Bu ay gelirim ne kadar?"
   - "Gelecek ay tahmini ne?"
   - "İşlem nasıl kaydedilir?"
   - "Rapor oluştur"

## ⚠️ Sorun Giderme

### Sayfa Açılmıyor
- Google hesabınızla giriş yaptığınızdan emin olun
- Proje seçiminin doğru olduğunu kontrol edin (EA Plan SEO Project)

### Build Başlamıyor
- Prompt'un tam olarak yapıştırıldığından emin olun
- Sayfayı yenileyin (F5)
- Farklı bir tarayıcı deneyin

### Agent ID Bulunamıyor
- Uygulama tamamen oluşturulana kadar bekleyin
- Browser console'da hata var mı kontrol edin (F12)

## 📝 Notlar

- Build işlemi birkaç dakika sürebilir
- İlk build'de daha uzun sürebilir
- Trial kredisi kullanılıyor, maliyetleri takip edin
- Oluşturulan uygulama otomatik olarak kaydedilir

## 🔗 İlgili Dosyalar

- Prompt: `PROMPT_PRODUCTION_AGENT.txt`
- Agent ID Ekleme Scripti: `scripts/add-genai-agent-id.ps1`
- Knowledge Base: `docs/knowledge-base/`

