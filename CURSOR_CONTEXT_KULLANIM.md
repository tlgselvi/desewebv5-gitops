# Cursor AI - DESE JARVIS Context Kullanım Rehberi

> **Context Dosyası:** `DESE_JARVIS_CONTEXT.md`  
> **Oluşturulma:** 2025-11-05

---

## 🎯 Context Nedir?

Context dosyası, Cursor AI'ın projeniz hakkında bilgi sahibi olmasını sağlar. Bu sayede daha doğru ve projeye özel cevaplar alırsınız.

---

## 📖 Kullanım Yöntemleri

### 1. @Mention ile Kullanım (En Kolay)

Chat'te `@` işareti ile dosyayı mention edin:

```
@DESE_JARVIS_CONTEXT.md Docker image'larını kontrol et
```

```
@DESE_JARVIS_CONTEXT.md proje yapısını göster
```

```
@DESE_JARVIS_CONTEXT.md MCP server'ları nasıl başlatırım?
```

```
@DESE_JARVIS_CONTEXT.md Kubernetes deployment detaylarını göster
```

**Avantaj:** Hızlı ve kolay, sadece `@` + dosya adı yazmanız yeterli.

---

### 2. Dosyayı Açarak Kullanım

1. **DESE_JARVIS_CONTEXT.md** dosyasını Cursor'da açın
2. Dosya açıkken chat'te soru sorun
3. Cursor otomatik olarak açık dosyaları context'e alır

**Örnek:**
- DESE_JARVIS_CONTEXT.md dosyasını açın
- Chat'te: "Docker volume'ları nelerdir?"
- Cursor context'ten bilgiyi kullanır

---

### 3. Cursor Memory'ye Ekleme (Kalıcı)

Context dosyasını `.cursor/memory/` klasörüne kopyalayın:

```powershell
# Otomatik kopyalama (zaten yapıldı)
Copy-Item DESE_JARVIS_CONTEXT.md .cursor/memory/
```

**Avantaj:** Cursor her zaman bu context'i hatırlar, her seferinde mention etmenize gerek kalmaz.

---

### 4. Chat'te Direkt Referans

Chat'te context dosyasından bilgi isteyin:

```
DESE_JARVIS_CONTEXT.md dosyasına göre, FinBot'un port'u nedir?
```

```
Context dosyasındaki Docker konfigürasyonunu göster
```

---

## 💡 Pratik Örnekler

### Docker İşlemleri
```
@DESE_JARVIS_CONTEXT.md Docker cleanup yaparken hangi volume'ları silmemeliyim?
```

**Beklenen Cevap:** `desewebv5_postgres_data` ve `desewebv5_redis_data` volume'larını asla silmeyin.

---

### MCP Server Başlatma
```
@DESE_JARVIS_CONTEXT.md Tüm MCP server'ları nasıl başlatırım?
```

**Beklenen Cevap:** `pnpm mcp:all` komutu ile tüm MCP server'ları başlatabilirsiniz.

---

### Proje Yapısı
```
@DESE_JARVIS_CONTEXT.md src/services klasöründe ne tür dosyalar olmalı?
```

**Beklenen Cevap:** Business logic servisleri, Drizzle ORM kullanarak database işlemleri.

---

### Kubernetes Deployment
```
@DESE_JARVIS_CONTEXT.md Kubernetes'te hangi namespace'ler var?
```

**Beklenen Cevap:** `dese-ea-plan-v5`, `aiops`, `autonomous-services`, `monitoring`, `argocd`

---

### Code Standards
```
@DESE_JARVIS_CONTEXT.md Path alias kullanırken nasıl import yapmalıyım?
```

**Beklenen Cevap:** `@/` prefix kullanın: `import { config } from '@/config/index.js'`

---

## 🔍 Context İçeriği Özeti

Context dosyası şu bilgileri içerir:

✅ **Proje Özeti**
- Modüller (FinBot, MuBot, DESE)
- Teknoloji stack

✅ **Konfigürasyonlar**
- Docker ayarları
- WSL2 optimizasyonları
- Database ve Redis

✅ **MCP Servers**
- Port numaraları
- Health check endpoint'leri

✅ **Kubernetes**
- Namespace'ler
- Deployment detayları
- Image tag'leri

✅ **Development Workflow**
- Setup adımları
- Code standards
- File structure rules

✅ **Package Scripts**
- Tüm pnpm komutları
- Açıklamaları

✅ **Kritik Notlar**
- Silinmemesi gerekenler
- Best practices
- Mevcut durum

---

## 🚀 Hızlı Başlangıç

### 1. Context'i Yükle
```powershell
# Context dosyası zaten oluşturuldu ve .cursor/memory/ klasörüne kopyalandı
```

### 2. Chat'te Kullan
```
@DESE_JARVIS_CONTEXT.md proje hakkında bilgi ver
```

### 3. Kod Yazarken
Context dosyası açıkken kod yazın, Cursor otomatik olarak context'i kullanır.

---

## 📝 İpuçları

### ✅ Yapılması Gerekenler
- Context dosyasını güncel tutun
- Önemli değişikliklerde context'i güncelleyin
- @mention kullanarak hızlı erişim sağlayın

### ❌ Yapılmaması Gerekenler
- Context dosyasını silmeyin
- .cursor/memory/ klasörünü temizlerken dikkatli olun
- Context dosyasını commit etmeyi unutmayın

---

## 🔄 Context Güncelleme

Context dosyasını güncellemek için:

1. `DESE_JARVIS_CONTEXT.md` dosyasını düzenleyin
2. `.cursor/memory/DESE_JARVIS_CONTEXT.md` dosyasını da güncelleyin
3. Veya otomatik kopyalama script'i çalıştırın:

```powershell
Copy-Item DESE_JARVIS_CONTEXT.md .cursor/memory/DESE_JARVIS_CONTEXT.md -Force
```

---

## 📚 Ek Kaynaklar

- **Context Dosyası:** `DESE_JARVIS_CONTEXT.md`
- **Docker Özeti:** `DOCKER_SISTEM_OZET.md`
- **WSL Optimizasyon:** `WSL_OPTIMIZATION_REPORT.md`
- **Coding Standards:** `CODING_STANDARDS.md`

---

**Son Güncelleme:** 2025-11-05  
**Hazırlayan:** DESE JARVIS System

