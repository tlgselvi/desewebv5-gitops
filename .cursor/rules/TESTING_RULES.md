# 🧪 Testing Rules - Dese EA Plan v6.8.0

**Versiyon:** 6.8.0  
**Tech Stack:** Vitest + Supertest + Playwright

---

## ✅ Test Kuralları

### 1. Test Yapısı
- ✅ AAA pattern kullanın (Arrange, Act, Assert)
- ✅ Test naming: `should [expected behavior] when [condition]`
- ✅ Her test case tek bir şeyi test etmeli

```typescript
// ✅ Doğru Test Yapısı
import { describe, it, expect, beforeEach } from 'vitest';
import { userService } from '@/services/userService.js';

describe('userService', () => {
  describe('findById', () => {
    it('should return user when user exists', async () => {
      // Arrange
      const userId = '123';
      
      // Act
      const user = await userService.findById(userId);
      
      // Assert
      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
    });
  });
});
```

### 2. Test Coverage
- ✅ Target: 70%+ (hedef %80+)
- ✅ Her feature için unit test
- ✅ Integration testler için testcontainers

### 3. Test Dosya İsimlendirme
- ✅ Test dosyası `*.test.ts` formatında olmalı
- ✅ `src/services/userService.test.ts`

---

## 📊 Test Komutları

```bash
pnpm test              # Unit tests
pnpm test:coverage     # Coverage report
pnpm test:auto         # E2E tests (Playwright)
pnpm test:smart        # Full test suite
```

---

## 📚 Referanslar

- `.cursorrules` - Ana rules dosyası
- `DESE_JARVIS_CONTEXT.md` - Proje context

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

