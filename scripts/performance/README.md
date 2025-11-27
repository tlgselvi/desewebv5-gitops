# Performance Optimization Scripts

Bu klasör performance optimization için gerekli analiz scriptlerini içerir.

## Scripts

### 1. Query Analysis (`query-analysis.ts`)

Database query performansını analiz eder:
- Yavaş query'leri tespit eder (pg_stat_statements kullanarak)
- EXPLAIN ANALYZE ile query plan analizi yapar
- Kullanılmayan index'leri bulur
- Eksik index'leri tespit eder (foreign key'ler için)

**Kullanım:**
```bash
pnpm perf:query-analysis
```

**Çıktı:** `reports/query-analysis.json`

### 2. N+1 Detection (`detect-n-plus-one.ts`)

Kod tabanında N+1 query problemlerini tespit eder:
- Service dosyalarını tarar
- Loop içindeki database query'lerini bulur
- Severity seviyesine göre kategorize eder

**Kullanım:**
```bash
pnpm perf:n-plus-one
```

**Çıktı:** `reports/n-plus-one-detection.json`

### 3. Index Optimization (`index-optimization.ts`)

Index optimizasyon önerileri sunar:
- Eksik composite index'leri tespit eder
- Kullanılmayan index'leri bulur
- Query pattern'lerine göre index önerileri yapar
- Migration SQL dosyası oluşturur

**Kullanım:**
```bash
pnpm perf:index-optimization
```

**Çıktı:** 
- `reports/index-optimization.json`
- `reports/index-optimization-migration.sql`

### 4. Combined Analysis

Tüm analizleri birlikte çalıştırır:

```bash
pnpm perf:analyze
```

## Raporlar

Tüm raporlar `reports/` klasörüne kaydedilir:
- `query-analysis.json` - Query performans analizi
- `n-plus-one-detection.json` - N+1 pattern tespiti
- `index-optimization.json` - Index optimizasyon önerileri
- `index-optimization-migration.sql` - Index migration SQL dosyası

## Notlar

- Query analysis script'i PostgreSQL'in `pg_stat_statements` extension'ını kullanır
- Slow query logging için superuser yetkisi gerekebilir
- N+1 detection static code analysis yapar, runtime analizi yapmaz

