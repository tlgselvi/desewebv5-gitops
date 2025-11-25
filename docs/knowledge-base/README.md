# Knowledge Base Dokümantasyonu

Bu klasör, GenAI App Builder Agent'ınız için Knowledge Base (RAG) dokümantasyonunu içerir.

## 📁 Dosya Yapısı

- `finance-terms.md` - Finansal terimler sözlüğü
- `accounting-rules.md` - Muhasebe kuralları ve iş süreçleri
- `faq.md` - Sık sorulan sorular
- `business-processes.md` - İş süreçleri ve iş akışları

## 🚀 Knowledge Base'e Yükleme

### Yöntem 1: Agent Builder Console (Önerilen)

1. [Agent Builder Console](https://console.cloud.google.com/vertex-ai/agent-builder?project=ea-plan-seo-project) sayfasına gidin
2. Agent'ınızı seçin
3. "Data Stores" sekmesine gidin
4. "Create Data Store" veya mevcut Data Store'u seçin
5. "Add Data" butonuna tıklayın
6. Bu klasördeki dosyaları yükleyin

### Yöntem 2: Cloud Storage

1. Dosyaları Cloud Storage bucket'ına yükleyin
2. Agent Builder'da Data Store oluştururken Cloud Storage'ı veri kaynağı olarak seçin

### Yöntem 3: Website

1. Bu dokümantasyonu bir website'de yayınlayın
2. Agent Builder'da Data Store oluştururken Website'i veri kaynağı olarak seçin

## 📝 Dokümantasyon Güncelleme

Knowledge Base'i güncellemek için:

1. Bu klasördeki dosyaları düzenleyin
2. Değişiklikleri commit edin
3. Agent Builder'da Data Store'u güncelleyin
4. Yeni dosyaları yükleyin veya mevcut dosyaları güncelleyin

## ✅ Best Practices

- **Kısa ve Öz:** Her doküman net ve anlaşılır olmalı
- **Örnekler:** Örneklerle destekleyin
- **Güncel:** Dokümantasyonu düzenli olarak güncelleyin
- **Kategorize:** İlgili bilgileri gruplandırın
- **FAQ:** Sık sorulan soruları ekleyin

## 🔄 Otomatik Güncelleme

Knowledge Base'i otomatik güncellemek için CI/CD pipeline'ı kullanabilirsiniz:

```yaml
# .github/workflows/update-knowledge-base.yml
name: Update Knowledge Base
on:
  push:
    paths:
      - 'docs/knowledge-base/**'
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Upload to Cloud Storage
        run: |
          gsutil -m cp docs/knowledge-base/* gs://your-bucket/knowledge-base/
```

## 📊 İstatistikler

Knowledge Base'inizin performansını izlemek için:

- Agent Builder Console > Analytics
- Kullanıcı soruları ve yanıtları
- En çok kullanılan dokümanlar
- İyileştirme önerileri

