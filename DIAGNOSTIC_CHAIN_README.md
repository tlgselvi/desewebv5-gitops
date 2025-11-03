# DESE JARVIS Diagnostic Chain

## Amaç

MCP, Cursor ve Docker arasındaki tüm bağlantıları, güvenlik ve metrik zincirini doğrulamak.

## Kullanım

### Manuel Tetikleme

```powershell
pwsh scripts/create-diagnostic-report.ps1
```

### Verbose Çıktı ile

```powershell
pwsh scripts/create-diagnostic-report.ps1 -Verbose
```

### Özel Çıktı Yolu

```powershell
pwsh scripts/create-diagnostic-report.ps1 -OutputPath 'reports/custom-report.md'
```

## Test Adımları

### 1. MCP Discovery
- FinBot, MuBot ve DESE MCP sunucularını kontrol eder
- URL: `http://localhost:5555|5556|5557/*/health`

### 2. Module Health Check
- Her modülün health endpoint'ini test eder
- Response time ve status bilgisi toplanır

### 3. Security Scan
- `npm audit` ile güvenlik açıklarını tarar
- Hardcoded secret'ları kontrol eder

### 4. Observability Metrics
- Prometheus metrics endpoint'ini kontrol eder
- Correlation AI metriklerini doğrular

### 5. Correlation AI Test
- `/api/v1/ai/correlation` endpoint'ini test eder
- Servis erişilebilirliğini doğrular

### 6. Test Coverage
- Vitest coverage report'unu kontrol eder
- Test coverage yüzdesini doğrular

### 7. Build Status
- `dist/` klasörünün varlığını kontrol eder
- Build artifact'larını doğrular

## Çıktı

Diagnostic report `reports/jarvis_diagnostic_summary.md` dosyasına kaydedilir.

## Yapılandırma Dosyası

Not: `.cursorignore` dosyası `.yaml` dosyalarını ignore ettiği için YAML config dosyası kullanılmıyor.  
Bunun yerine doğrudan PowerShell script üzerinden yapılandırma yapılıyor.

## Troubleshooting

### MCP Sunucuları Çalışmıyor

```powershell
npm run mcp:all
```

### Metrics Endpoint Erişilebilir Değil

Ana uygulama başlatın:
```powershell
npm run dev
```

### Security Audit Hatası

```powershell
npm audit fix
```

## Daha Fazla Bilgi

- JARVIS Config: `.cursor/jarvis-config.json`
- Upgrade Protocol: `.cursor/upgrade-protocol-v1.2.yaml`
- Diagnostic Script: `scripts/create-diagnostic-report.ps1`

