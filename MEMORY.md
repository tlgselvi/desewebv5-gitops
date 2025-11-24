# PROJECT MEMORY & CONTEXT (v7.0)

## 🎯 Proje Kimliği
**İsim:** DESE EA PLAN
**Versiyon:** v7.0 (Enterprise Transformation Phase)
**Amaç:** SEO Analiz aracından → Bütünleşik Kurumsal ERP & IoT Platformuna dönüşüm.

## 🧠 Aktif Bağlam (Context)
Biz şu anda **"SaaS Dönüşümü"** sürecindeyiz. Eski "SEO Tool" kimliğimiz sadece bir modül (`DESE Analytics`) olarak kalacak. Ana odak noktamız Finans, CRM, Stok ve IoT modüllerini sıfırdan inşa etmektir.

## 🚫 Unutulması Gerekenler (Legacy)
- Eski monolitik yapı ve karışık klasör düzeni.
- Sadece SEO odaklı veritabanı şeması.
- Docker'ın frontend geliştirmeyi yavaşlattığı eski çalışma düzeni (Artık Hybrid Mode kullanıyoruz).

## ✅ Hatırlanması Gerekenler (Rules)
1.  **Plan Kutsaldır:** `DESE_EA_PLAN_TRANSFORMATION_REPORT.md` dosyasındaki adımları sırasıyla uygula.
2.  **Önce Şema:** Kod yazmadan önce veritabanı şemasını (`src/db/schema/`) tanımla.
3.  **Modüler Ol:** Her şeyi `src/modules/` altına koy.
4.  **Güvenli Ol:** Multi-tenancy (`organization_id`) kontrolünü asla atlama.

## 🚀 Mevcut Görev (Current Task)
**Sprint 1 / Görev 1:** Veritabanı şemasını (`src/db/schema.ts`) parçalamak ve modüler hale getirmek.
**Durum:** Başlamaya hazır.

