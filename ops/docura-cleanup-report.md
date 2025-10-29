# 🧹 Docura Image Cleanup Report

**Tarih:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## 📊 Analiz Sonuçları

### ✅ Kullanılan Image'lar (SİLMEYİN!)

Bu image'lar projede aktif olarak kullanılıyor:

1. **ghcr.io/cptsystems/finbot:latest**
   - Kullanım: `ops/deploy-finbot-mubot.sh`
   - Durum: ✅ Aktif deployment

2. **ghcr.io/cptsystems/mubot:latest**
   - Kullanım: `ops/deploy-finbot-mubot.sh`
   - Durum: ✅ Aktif deployment

3. **ghcr.io/cptsystems/frontend:latest**
   - Kullanım: `ops/deploy-frontends.sh`
   - Durum: ✅ Yeni eklenen

4. **ghcr.io/cptsystems/dese-web:latest**
   - Kullanım: `ops/deploy-frontends.sh`
   - Durum: ✅ Yeni eklenen

---

### ❌ Kullanılmayan Image'lar (SİLİNDİ!)

Bu image'lar projede kullanılmıyor ve temizlendi:

1. **ghcr.io/cptsystems/aiops-trainer:latest**
   - Durum: ✅ Silinmiş
   - Not: Sadece `reports/cluster-state.yaml`'da referans vardı, aktif deployment yoktu

2. **ghcr.io/cptseo/observer:latest**
   - Durum: ✅ Silinmiş
   - Not: ImagePullBackOff hataları vardı, kullanılmıyordu

---

## ✅ Temizleme İşlemi

**Yöntem:** GitHub CLI ile otomatik silme
**Durum:** ✅ Tamamlandı
**Sonuç:** Tüm kullanılmayan paketler başarıyla temizlendi

---

## 📋 Sonraki Adımlar

1. ✅ Kullanılan image'lar korundu
2. ✅ Kullanılmayan image'lar temizlendi
3. ✅ Proje temizlendi

**Not:** Gelecekte yeni image'lar ekledikten sonra bu raporu güncelleyin.

---

## 🔍 Kontrol Komutları

```powershell
# Tüm paketleri listele
gh api /orgs/cptsystems/packages?package_type=container

# Belirli bir paketi kontrol et
gh api /orgs/cptsystems/packages/container/finbot

# Analiz script'ini çalıştır
./ops/cleanup-docura-images.ps1
```

