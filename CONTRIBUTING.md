# 🤝 Katkıda Bulunma Rehberi

Dese EA Plan v5.0 projesine katkıda bulunmak için teşekkür ederiz! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 📋 İçindekiler

1. [Kod Standartları](#kod-standartları)
2. [Geliştirme Süreci](#geliştirme-süreci)
3. [Commit Mesajları](#commit-mesajları)
4. [Pull Request Süreci](#pull-request-süreci)
5. [Test Gereksinimleri](#test-gereksinimleri)
6. [Dokümantasyon](#dokümantasyon)

---

## 💻 Kod Standartları

### TypeScript

- ✅ **Strict Mode**: Mümkün olduğunca kullanın (şu anda kademeli olarak açılıyor)
- ✅ **Type Safety**: `any` kullanımından kaçının
- ✅ **Path Aliases**: `@/` prefix'ini kullanın (`@/config`, `@/db`, vb.)
- ✅ **Naming**: 
  - PascalCase: Classes, Interfaces, Types
  - camelCase: Functions, Variables
  - UPPER_CASE: Constants

### Code Style

```typescript
// ✅ İyi
export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    return user ?? null;
  } catch (error) {
    logger.error('Failed to get user', { id, error });
    throw error;
  }
}

// ❌ Kötü
export async function getUser(id: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  return user;
}
```

### Dosya Organizasyonu

```
src/
├── config/          # Konfigürasyon dosyaları
├── db/              # Veritabanı şeması ve bağlantı
├── middleware/      # Express middleware'leri
├── routes/          # API route tanımları
├── services/        # İş mantığı (business logic)
├── schemas/         # Zod validation şemaları
└── utils/           # Yardımcı fonksiyonlar
```

---

## 🔄 Geliştirme Süreci

### 1. Fork & Clone

```bash
# Repository'yi fork edin
# Sonra clone edin
git clone https://github.com/YOUR_USERNAME/dese-ea-plan-v5.git
cd dese-ea-plan-v5
```

### 2. Branch Oluşturma

```bash
# Feature branch
git checkout -b feature/amazing-feature

# Bug fix
git checkout -b fix/bug-description

# Hotfix
git checkout -b hotfix/critical-issue
```

### 3. Geliştirme

```bash
# Bağımlılıkları yükleyin
pnpm install

# Environment dosyasını oluşturun
cp env.example .env

# Development server'ı başlatın
pnpm dev

# Testleri çalıştırın
pnpm test

# Lint kontrolü
pnpm lint
```

### 4. Commit

```bash
# Staged değişiklikleri commit edin
git add .
git commit -m "feat: add amazing feature"
```

---

## 📝 Commit Mesajları

[Conventional Commits](https://www.conventionalcommits.org/) standardını kullanıyoruz.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: Yeni özellik
- `fix`: Bug fix
- `docs`: Dokümantasyon değişiklikleri
- `style`: Kod formatı (linter, prettier)
- `refactor`: Kod refactoring
- `test`: Test ekleme/düzeltme
- `chore`: Build, config, dependency değişiklikleri
- `perf`: Performans iyileştirmesi
- `ci`: CI/CD değişiklikleri

### Örnekler

```bash
# Feature
feat(seo): add keyword analysis endpoint

# Bug fix
fix(auth): resolve JWT token expiration issue

# Documentation
docs(readme): update installation instructions

# Breaking change
feat(api)!: change project endpoint structure

BREAKING CHANGE: /api/v1/projects endpoint now requires authentication
```

---

## 🔀 Pull Request Süreci

### PR Checklist

- [ ] Kod linting'den geçti (`pnpm lint`)
- [ ] Tüm testler geçiyor (`pnpm test`)
- [ ] Test coverage hedeflerini karşılıyor (%80+)
- [ ] TypeScript hataları yok
- [ ] Dokümantasyon güncellendi (gerekirse)
- [ ] Commit mesajları conventional commits formatında
- [ ] Self-review yapıldı

### PR Açma

1. **Branch'i push edin**
   ```bash
   git push origin feature/amazing-feature
   ```

2. **GitHub'da PR açın**
   - Title: Conventional commits formatında
   - Description: Değişiklikleri açıklayın
   - Related issues: Issue numaralarını belirtin

3. **Code Review bekleme**
   - En az 1 reviewer onayı gerekli
   - CI/CD pipeline'ın geçmesi gerekiyor

4. **Merge**
   - Squash & merge kullanılıyor
   - PR merge edildikten sonra branch silinir

---

## 🧪 Test Gereksinimleri

### Test Coverage Hedefleri

- **Minimum**: %70
- **Hedef**: %80+
- **Kritik Modüller**: %90+

### Test Türleri

#### Unit Tests
```typescript
import { describe, it, expect } from 'vitest';
import { calculateScore } from './service';

describe('calculateScore', () => {
  it('should return correct score', () => {
    expect(calculateScore([1, 2, 3])).toBe(6);
  });
});
```

#### Integration Tests
```typescript
import { setupTestDb } from '@/db/test-setup';
import { createProject } from './projects';

describe('Project API', () => {
  it('should create a new project', async () => {
    const project = await createProject({ name: 'Test' });
    expect(project.id).toBeDefined();
  });
});
```

### Test Çalıştırma

```bash
# Tüm testler
pnpm test

# Coverage ile
pnpm test:coverage

# Watch mode
pnpm test --watch

# UI ile
pnpm test:ui
```

---

## 📚 Dokümantasyon

### Kod Dokümantasyonu

- **JSDoc** comments kullanın
- **Swagger/OpenAPI** annotations ekleyin
- **Complex logic** için açıklayıcı yorumlar

```typescript
/**
 * Analyzes SEO metrics for a given URL
 * @param url - The URL to analyze
 * @param options - Analysis options (lighthouse, coreWebVitals, etc.)
 * @returns Promise resolving to SEO analysis results
 */
export async function analyzeSeo(
  url: string,
  options?: AnalysisOptions
): Promise<SeoAnalysis> {
  // Implementation
}
```

### Markdown Dokümantasyonu

- Yeni özellikler için README güncelleyin
- Breaking changes için CHANGELOG güncelleyin
- API değişiklikleri için Swagger dokümantasyonunu güncelleyin

---

## 🔒 Güvenlik

### Güvenlik Kontrol Listesi

- [ ] Sensitive data commit edilmedi (`.env`, secrets)
- [ ] SQL injection koruması var (Drizzle ORM)
- [ ] Input validation yapıldı (Zod)
- [ ] Authentication/Authorization kontrol edildi
- [ ] Rate limiting uygulandı (gerekirse)
- [ ] Dependency vulnerabilities kontrol edildi (`pnpm audit`)

### Güvenlik Sorunu Bildirme

Güvenlik açığı bulursanız:
1. **Public issue açmayın**
2. Email: `security@dese.ai`
3. **Responsible disclosure** bekleyin

---

## 🎯 Best Practices

### Do's ✅

- ✅ Kod review istemekten çekinmeyin
- ✅ Küçük, odaklanmış PR'lar açın
- ✅ Testleri yazın
- ✅ Dokümantasyonu güncelleyin
- ✅ Error handling ekleyin
- ✅ Logging ekleyin

### Don'ts ❌

- ❌ Büyük PR'lar (1000+ satır)
- ❌ Test yazmadan PR açmak
- ❌ Main branch'e direkt commit
- ❌ Hardcoded secrets
- ❌ Console.log kullanımı (logger kullanın)
- ❌ `any` type kullanımı (mümkün olduğunca)

---

## 🐛 Bug Report

### Bug Report Formatı

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Environment:**
- OS: [e.g. Windows 10]
- Node.js: [e.g. 20.19.0]
- Browser: [e.g. Chrome 120]

**Logs**
Error logs if applicable.
```

---

## 💡 Feature Request

### Feature Request Formatı

```markdown
**Feature Description**
Clear description of the feature.

**Use Case**
Why is this feature needed?

**Proposed Solution**
How would you implement it?

**Alternatives Considered**
Other solutions you've thought about.
```

---

## 📞 İletişim

- **Email**: dev@dese.ai
- **Website**: https://dese.ai
- **Documentation**: https://docs.dese.ai

---

**Son Güncelleme**: 2025-01-27  
**Versiyon**: 5.0.0

