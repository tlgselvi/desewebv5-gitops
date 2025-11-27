# Security Test Suite

Bu klasör OWASP Top 10 güvenlik testlerini içerir.

## Test Dosyaları

- `security-test-framework.ts` - Security test framework ve utilities
- `helpers/test-app-helper.ts` - Test Express app oluşturma helper'ı
- `owasp-a01-access-control.test.ts` - OWASP A01: Broken Access Control testleri
- `owasp-a02-cryptographic-failures.test.ts` - OWASP A02: Cryptographic Failures testleri
- `owasp-a03-injection.test.ts` - OWASP A03: Injection testleri
- `owasp-a04-a10-summary.test.ts` - OWASP A04-A10: Kalan güvenlik testleri

## Çalıştırma

```bash
# Tüm security testlerini çalıştır
pnpm test tests/security

# Belirli bir OWASP kategorisini test et
pnpm test tests/security/owasp-a01-access-control.test.ts
pnpm test tests/security/owasp-a02-cryptographic-failures.test.ts
pnpm test tests/security/owasp-a03-injection.test.ts
```

## Test Kapsamı

### OWASP A01: Broken Access Control
- ✅ Unauthorized access prevention
- ✅ Privilege escalation prevention (vertical and horizontal)
- ✅ IDOR (Insecure Direct Object Reference) prevention
- ✅ Path traversal prevention
- ✅ Security headers validation
- ✅ Sensitive data leak prevention

### OWASP A02: Cryptographic Failures
- ✅ Password hashing (bcrypt)
- ✅ TLS/SSL configuration
- ✅ Sensitive data encryption
- ✅ Key management
- ✅ Weak algorithm detection

### OWASP A03: Injection
- ✅ SQL injection prevention
- ✅ XSS (Cross-Site Scripting) prevention
- ✅ Command injection prevention
- ✅ NoSQL injection prevention
- ✅ Input validation

### OWASP A04-A10
- ✅ Security design patterns
- ✅ Security misconfiguration
- ✅ Vulnerable components
- ✅ Authentication failures
- ✅ Software and data integrity
- ✅ Logging and monitoring failures
- ✅ SSRF prevention

## Test Framework Kullanımı

```typescript
import { SecurityTestFramework, AttackPayloadGenerator } from './security-test-framework.js';
import { createTestApp } from './helpers/test-app-helper.js';

const app = createTestApp();
const framework = new SecurityTestFramework(app);

// SQL injection payloads
const sqlPayloads = AttackPayloadGenerator.getSQLInjectionPayloads();

// XSS payloads
const xssPayloads = AttackPayloadGenerator.getXSSPayloads();
```

## Notlar

- Testler gerçek uygulama route'larını kullanmaz, kendi test route'larını tanımlar
- Bu, test bağımsızlığını sağlar ve dependency sorunlarını önler
- Her test kendi Express app instance'ını oluşturur

