# WSL2 Optimizasyon Raporu

> **Tarih:** 2025-11-05  
> **İşlem:** WSL2 ve Docker kaynak optimizasyonu

---

## 📊 Mevcut Durum Analizi

### Sistem Kaynakları
- **Toplam RAM:** 31.85 GB
- **Kullanılan RAM:** 20.49 GB (64.3%)
- **Boş RAM:** 11.36 GB
- **CPU:** Intel Core i7-9750H
  - Fiziksel Çekirdek: 6
  - Logical Processor: 12

### WSL2 Mevcut Durumu
- **RAM Limiti:** ~15.5 GB (otomatik ayarlanmış)
- **Kullanılan RAM:** 4.1 GB
- **Boş RAM:** 11.1 GB
- **Processor:** 12 (tüm logical processor'lar)
- **Swap:** 4 GB

### Docker Container Kullanımı
- Toplam container: 228 adet
- Aktif container: 148 adet
- Memory kullanımı: Düşük (container başına ~20-100 MB)

---

## ✅ Optimizasyon Kararı

### Neden Optimizasyon Mantıklı?

1. **RAM Kullanımı:**
   - WSL şu anda 15.5 GB limit kullanıyor
   - Sadece 4.1 GB gerçekte kullanılıyor
   - **9.4 GB RAM gereksiz yere rezerve edilmiş**
   - Chrome ve diğer uygulamalar için RAM kalmıyor

2. **CPU Kullanımı:**
   - 12 processor WSL'e verilmiş
   - Chrome ve diğer uygulamalar CPU bekliyor
   - Docker için 4 processor yeterli

3. **Performans:**
   - Swap=0 → Disk I/O azalır, performans artar
   - Memory limiti düşürülürse → Windows'a daha fazla RAM kalır
   - CPU limiti düşürülürse → Chrome ve diğer uygulamalar hızlanır

---

## 🔧 Uygulanan Konfigürasyon

### .wslconfig Dosyası
**Konum:** `C:\Users\<USERNAME>\.wslconfig`

```ini
[wsl2]
# WSL2 Memory Limit: 6GB (Docker için yeterli, Chrome için daha fazla RAM bırakır)
memory=6GB

# WSL2 Processor Limit: 4 core (Chrome ve diğer uygulamalar için CPU bırakır)
processors=4

# Swap: 0 (Performans için swap kapalı, ama riskli olabilir)
# Not: Yoğun kullanımda OOM hatası alırsanız swap=2GB yapabilirsiniz
swap=0

# Localhost forwarding: true (Docker port mapping için gerekli)
localhostForwarding=true
```

---

## 📈 Beklenen İyileştirmeler

### RAM Kullanımı
- **Öncesi:** WSL 15.5 GB limit, Windows'a az RAM
- **Sonrası:** WSL 6 GB limit, Windows'a ~9 GB daha fazla RAM
- **Kazanç:** Chrome ve diğer uygulamalar için ~9 GB daha fazla RAM

### CPU Kullanımı
- **Öncesi:** WSL 12 processor, Chrome CPU bekliyor
- **Sonrası:** WSL 4 processor, Chrome için 8 processor
- **Kazanç:** Chrome ve diğer uygulamalar daha hızlı çalışır

### Performans
- **Swap=0:** Disk I/O azalır, daha hızlı
- **Memory limiti:** Windows daha iyi memory management yapar
- **CPU limiti:** Context switching azalır

---

## ⚠️ Uyarılar ve Öneriler

### Swap=0 Risk
- **Risk:** Yoğun Docker kullanımında Out of Memory (OOM) hatası alınabilir
- **Çözüm:** Eğer OOM hatası alırsanız `swap=2GB` yapın

### İyileştirilmiş Konfigürasyon (Önerilen)
Eğer swap=0 sorun çıkarırsa:
```ini
[wsl2]
memory=8GB        # 6GB yerine 8GB (daha güvenli)
processors=4
swap=2GB          # 0 yerine 2GB (güvenlik için)
localhostForwarding=true
```

---

## 🚀 Restart Komutları

### 1. WSL'i Kapat
```powershell
wsl --shutdown
```

### 2. Docker Desktop'ı Yeniden Başlat
- Docker Desktop Settings > Restart
- Veya Docker Desktop'ı kapatıp tekrar açın

### 3. Doğrulama
```powershell
# WSL durumunu kontrol et
wsl --status

# WSL içinde memory kontrolü
wsl -d docker-desktop -e sh -c "free -h"
```

---

## 📝 Değişiklik Özeti

| Özellik | Öncesi | Sonrası | Kazanç |
|---------|--------|---------|--------|
| **RAM Limiti** | 15.5 GB | 6 GB | Windows'a +9.5 GB |
| **Processor** | 12 | 4 | Windows'a +8 CPU |
| **Swap** | 4 GB | 0 GB | Disk I/O azalır |
| **Docker Kullanımı** | 4.1 GB | ~4 GB | Yeterli |
| **Chrome için RAM** | Az | Çok | Hızlanır |
| **Chrome için CPU** | Az | Çok | Hızlanır |

---

## ✅ Sonuç

- ✅ **Optimizasyon uygulandı**
- ✅ **Proje verilerine zarar verilmedi**
- ✅ **Docker container'ları korundu**
- ✅ **Volume'lar güvende**
- ✅ **Image'lar korundu**

**Beklenen Sonuç:** Sistem daha hızlı, Chrome ve diğer uygulamalar daha iyi performans gösterecek.

---

**Not:** Eğer yoğun Docker kullanımında OOM hatası alırsanız, `swap=0` yerine `swap=2GB` yapın.

**Son Güncelleme:** 2025-11-05


