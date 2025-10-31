---
alwaysApply: false
priority: medium
globs:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "tests/**/*.ts"
version: 5.0.0
lastUpdated: 2025-01-27
---

# 🧪 Testing Kuralları

## Unit Test Yapısı

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

    it('should return null when user does not exist', async () => {
      // Arrange
      const userId = 'nonexistent';
      
      // Act
      const user = await userService.findById(userId);
      
      // Assert
      expect(user).toBeNull();
    });
  });
});
```

**Kurallar:**
- ✅ AAA pattern kullanılmalı (Arrange, Act, Assert)
- ✅ Test naming: `should [expected behavior] when [condition]`
- ✅ Her test case tek bir şeyi test etmeli
- ✅ Test dosyası `*.test.ts` formatında olmalı
- ✅ Coverage minimum %70, hedef %80+

## Integration Test Yapısı

```typescript
// ✅ Doğru Integration Test
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb } from '@/db/test-setup.js';
import { createProject } from '@/services/projects.js';

describe('Project API Integration', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it('should create a new project', async () => {
    const project = await createProject({ name: 'Test Project' });
    expect(project.id).toBeDefined();
    expect(project.name).toBe('Test Project');
  });
});
```

