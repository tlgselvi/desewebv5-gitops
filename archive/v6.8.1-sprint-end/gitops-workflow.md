# Dese EA Plan v6.8.1 - GitOps Workflow

**Version:** v6.8.1  
**Last Update:** 2025-11-09  
**Durum:** 🔄 Kyverno stabilizasyonu sonrası GitOps revizyonu tamamlandı

## 🚀 GitOps Senkronizasyon Sistemi

# Kyverno & ArgoCD Yapılandırması (Yeni)

```
desewebv5-gitops/
├── gitops/
│   ├── apps/
│   │   ├── security/
│   │   │   └── base/
│   │   │       ├── kyverno-crds.yaml      # CRD'ler (sync-wave: -1, SSA=true)
│   │   │       ├── kyverno-helm.yaml      # Kyverno kaynakları (CRD hariç)
│   │   │       ├── kyverno-policies.yaml  # Kyverno policy set
│   │   │       ├── kustomization.yaml     # Kaynak sıralaması
│   │   │       └── security-base.yaml
│   │   └── monitoring/
│   │       └── base/ ...                  # Prometheus, Grafana, Loki, Tempo
│   ├── clusters/
│   │   └── prod.yaml                      # ArgoCD Application tanımı
│   └── overlays/                          # Ortam bazlı yamalar
├── docs/                                  # GitOps ve operasyon rehberleri
└── scripts/                               # Senkron ve bakım scriptleri
```

### 🔄 GitOps Senkronizasyon Akışı

1. **Commit → Main**  
   - Kaynak dosyalar (özellikle `gitops/apps/security/base/**`) güncellendiğinde PR → merge süreci.
2. **ArgoCD Monitoring**  
   - `argocd app list` ile uygulamaların `Synced/Healthy` durumu izlenir.
3. **Kyverno CRD Uygulaması (Tek Seferlik veya Büyük Güncelleme)**  
   - CRD’ler `kyverno-crds.yaml` içinde; ArgoCD `sync-wave: -1` + `ServerSideApply=true` ile otomatik uygular.
   - Acil durumda manuel:
     ```bash
     kubectl apply -f gitops/apps/security/base/kyverno-crds.yaml --server-side
     ```
4. **Kyverno Kaynakları (Helm Renderı)**  
   - Kaynak limitleri güncel (`20m/96Mi`), helm test hook devre dışı.
   - Admission controller manifestleri `kyverno-helm.yaml` içerisinde.
5. **ArgoCD Manuel Sync (Gerekirse)**  
   - Port-forward:
     ```bash
     kubectl port-forward svc/argocd-server -n argocd 8080:443
     ```
   - Login:
     ```bash
     argocd login localhost:8080 --username admin --password <pw> --insecure
     ```
   - Sync:
     ```bash
     argocd app sync security
     ```

### 🧠 Önemli Notlar (Kyverno)
- CRD’ler ana manifestten ayrıldı; annotation limit hatası yok.
- Helm test pod’u (`kyverno-admission-controller-metrics`) devre dışı (prod ortamda gereksiz).
- Kyverno admission controller token secret’ı otomatik (`createSelfSignedCert: true`).
- `kyverno` namespace’i `CreateNamespace=true` sync opsiyonuyla ArgoCD tarafından yönetiliyor.

### 🔧 Lokal Senkron (Monitoring Örneği)

```bash
# Monitoring stack'i elle uygulamak için
kubectl apply -k gitops/apps/monitoring/base

# Kyverno CRD'leri manuel uygulamak gerekiyorsa
kubectl apply -f gitops/apps/security/base/kyverno-crds.yaml --server-side

# Durum kontrolü
kubectl get pods -n kyverno
kubectl get pods -n monitoring
```

### 🎯 Avantajlar
- ✅ **Version Control:** Tüm değişiklikler Git'te takip edilir
- ✅ **Rollback:** Kolay geri alma imkanı
- ✅ **Audit:** Tüm değişiklikler loglanır
- ✅ **Collaboration:** Ekip çalışması için ideal
- ✅ **Automation:** Otomatik deployment

### 🔍 ArgoCD Durum Kontrolü

```bash
# Uygulama listesi
argocd app list

# Durum sorgusu (security uygulaması)
argocd app get security

# Kyverno admission controller logları (troubleshooting için)
kubectl logs deployment/kyverno-admission-controller -n kyverno
```

## ✅ Özet

- Kyverno CRD ve kaynakları ArgoCD ile güvenle yönetiliyor.
- Helm test hook kapalı; admission controller kaynak limitleri optimize.
- ArgoCD manuel sync adımları dokümante edildi (`argocd login`, `argocd app sync security`).
- Monitoring, security ve diğer uygulamalar için Kustomize tabanlı yapı kullanılıyor.
- Lokal veya CI/CD ortamında ihtiyaç duyulan kubectl komutları örneklerle sağlandı.
