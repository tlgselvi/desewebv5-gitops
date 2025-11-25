# Agent Builder Region Seçimi

## ✅ Önerilen Region: us-central1 (Iowa)

**Neden us-central1?**
- ✅ En güncel özelliklere sahip
- ✅ En düşük latency (Türkiye için)
- ✅ En iyi performans
- ✅ Tüm Vertex AI özellikleri mevcut
- ✅ Proje ayarlarımızla uyumlu

## 📍 Region Bilgileri

### us-central1 (Iowa, USA)
- **Latency:** Türkiye'den ~150-200ms
- **Özellikler:** Tüm Vertex AI özellikleri
- **Maliyet:** Standart fiyatlandırma
- **Önerilen:** ✅ Evet

### Alternatif Region'lar

#### europe-west3 (Frankfurt, Germany)
- **Latency:** Türkiye'den ~50-80ms (daha yakın)
- **Özellikler:** Çoğu özellik mevcut
- **Maliyet:** Standart fiyatlandırma
- **Önerilen:** ⚠️ Bazı özellikler eksik olabilir

#### asia-southeast1 (Singapore)
- **Latency:** Türkiye'den ~200-250ms
- **Özellikler:** Çoğu özellik mevcut
- **Maliyet:** Standart fiyatlandırma
- **Önerilen:** ❌ Türkiye için uygun değil

## 🎯 DESE EA Plan İçin Öneri

**us-central1 (Iowa)** seçin çünkü:
1. Proje ayarlarımızda zaten `us-central1` kullanıyoruz
2. Tüm özellikler mevcut
3. En güncel API'ler
4. Trial kredisi ile uyumlu

## ⚙️ Proje Ayarları

`.env` dosyasında:
```bash
GCP_LOCATION=us-central1
```

Bu ayar ile uyumlu olmalı.

## 🔄 Region Değiştirme

Eğer farklı bir region seçerseniz, `.env` dosyasını da güncellemeniz gerekir:

```bash
GCP_LOCATION=your-selected-region
```

