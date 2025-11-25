# 🤖 DESE EA Plan - GenAI Agent Prompt

## Finansal Analiz ve Muhasebe Asistanı Agent'ı

Aşağıdaki prompt'u Vertex AI Studio'da "Bir uygulama oluşturun" kartına yapıştırın:

---

**PROMPT:**

```
Bir finansal analiz ve muhasebe yönetim asistanı uygulaması oluştur. Bu uygulama Türkçe konuşmalı ve şu özelliklere sahip olmalı:

1. **Finansal Analiz:**
   - Gelir-gider analizi yapabilmeli
   - Finansal tahminler ve projeksiyonlar oluşturabilmeli
   - Trend analizi yapabilmeli
   - Nakit akışı analizi sunabilmeli

2. **Muhasebe Yönetimi:**
   - İşlem kayıtlarını yönetebilmeli
   - Kategori bazlı raporlama yapabilmeli
   - Dönemsel karşılaştırmalar yapabilmeli
   - Muhasebe kayıtlarını doğrulayabilmeli

3. **Raporlama:**
   - Özet raporlar oluşturabilmeli
   - Grafik ve görselleştirme önerileri sunabilmeli
   - Excel/CSV formatında veri çıktısı önerebilmeli

4. **Kullanıcı Etkileşimi:**
   - Türkçe doğal dil işleme
   - Soru-cevap formatında çalışmalı
   - Kullanıcıya anlaşılır açıklamalar yapmalı
   - Finansal terimleri Türkçe açıklayabilmeli

5. **Veri Güvenliği:**
   - Kullanıcı verilerini korumalı
   - Hassas finansal bilgileri güvenli şekilde işlemeli
   - KVKK uyumlu olmalı

Uygulama adı: "DESE Finansal Asistan"
Dil: Türkçe
Zaman dilimi: Europe/Istanbul
```

---

## Alternatif: Daha Detaylı Prompt

Eğer daha detaylı bir uygulama istiyorsanız:

```
DESE EA Plan için entegre bir finansal yönetim ve muhasebe asistanı uygulaması geliştir. 

**Temel Özellikler:**

1. **Finansal Danışman (FinBot):**
   - Kullanıcıların finansal verilerini analiz eder
   - Gelir-gider dengesini değerlendirir
   - Gelecek dönemler için tahminler yapar
   - Yatırım önerileri sunar
   - Bütçe planlaması yapar

2. **Muhasebe Asistanı (MuBot):**
   - İşlem kayıtlarını kategorize eder
   - Muhasebe kayıtlarını doğrular
   - Dönemsel raporlar hazırlar
   - Vergi uyumluluğu kontrolü yapar
   - Nakit akışı takibi yapar

3. **Raporlama ve Analiz:**
   - Otomatik rapor oluşturma
   - Grafik ve görselleştirme
   - Karşılaştırmalı analizler
   - Trend analizi
   - Performans metrikleri

4. **Kullanıcı Arayüzü:**
   - Türkçe doğal dil işleme
   - Soru-cevap formatı
   - Adım adım rehberlik
   - Örnekler ve açıklamalar
   - Hata mesajları Türkçe

5. **Entegrasyon:**
   - REST API desteği
   - Webhook entegrasyonu
   - Veri import/export
   - Excel/CSV desteği

**Teknik Gereksinimler:**
- Türkçe dil desteği
- Europe/Istanbul zaman dilimi
- JSON formatında veri işleme
- Güvenli veri saklama
- KVKK uyumluluğu

Uygulama adı: "DESE Finansal Yönetim Asistanı"
Hedef kullanıcılar: KOBİ'ler, muhasebe departmanları, finansal danışmanlar
```

---

## Kullanım Adımları

1. Vertex AI Studio'da "Bir uygulama oluşturun" kartına tıklayın
2. Yukarıdaki prompt'u kopyalayıp yapıştırın
3. "Create" veya "Oluştur" butonuna tıklayın
4. Uygulama oluşturulduktan sonra Agent ID'yi kopyalayın
5. Agent ID'yi script ile `.env` dosyanıza ekleyin:

```powershell
.\scripts\add-genai-agent-id.ps1 -AgentId "YOUR_AGENT_ID"
```

---

## Özelleştirme İpuçları

- Prompt'a özel gereksinimlerinizi ekleyebilirsiniz
- Örnek senaryolar ekleyerek daha spesifik olabilirsiniz
- Kullanıcı hikayeleri ekleyerek daha iyi sonuçlar alabilirsiniz

