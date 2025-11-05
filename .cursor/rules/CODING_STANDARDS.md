# 📝 Kod Standartları - Dese EA Plan v6.8.0

**Versiyon:** 6.8.0  
**Son Güncelleme:** 2025-01-27

---

## ✅ Zorunlu Kurallar

### 1. Path Aliases
- ✅ **HER ZAMAN** `@/` prefix'ini kullanın
- ❌ Relative imports (`../../`) kullanmayın

```typescript
// ✅ Doğru
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';

// ❌ Yanlış
import { config } from '../../config/index.js';
```

### 2. Type Safety
- ✅ **ASLA** `any` tipi kullanmayın
- ✅ Her zaman explicit types kullanın

```typescript
// ✅ Doğru
function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ Yanlış
function getUser(id: any) {
  // ...
}
```

### 3. Logging
- ✅ **ASLA** `console.log` kullanmayın
- ✅ **HER ZAMAN** `logger` utility kullanın

```typescript
// ✅ Doğru
logger.info('User created', { userId: user.id });

// ❌ Yanlış
console.log('User created:', user);
```

### 4. Error Handling
- ✅ **HER async fonksiyonda** try-catch kullanın
- ✅ `asyncHandler` middleware kullanın

```typescript
// ✅ Doğru
router.post('/', asyncHandler(async (req, res) => {
  // ...
}));

// ❌ Yanlış
router.post('/', async (req, res) => {
  // ... (unhandled promise)
});
```

### 5. Database Queries
- ✅ **ASLA** raw SQL kullanmayın
- ✅ **HER ZAMAN** Drizzle ORM kullanın

```typescript
// ✅ Doğru
const user = await db.query.users.findFirst({
  where: eq(users.id, id),
});

// ❌ Yanlış
const user = await db.query(`SELECT * FROM users WHERE id = '${id}'`);
```

---

## 📁 Dosya Yapısı

```
src/
├── config/          # Configuration files
├── db/              # Database
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── mcp/             # MCP Servers (4 adet)
├── schemas/         # Zod validation
└── utils/           # Utilities
```

---

## 🔍 Kod Review Checklist

- [ ] TypeScript types tanımlı (no `any`)
- [ ] Linting geçiyor (`pnpm lint`)
- [ ] Tests geçiyor (`pnpm test`)
- [ ] Error handling var (try-catch veya asyncHandler)
- [ ] Input validation yapıldı (Zod)
- [ ] Logging eklendi (logger, not console)
- [ ] Path aliases kullanıldı (`@/`)
- [ ] Drizzle ORM kullanıldı (no raw SQL)

---

## 📚 Referanslar

- `.cursorrules` - Ana rules dosyası
- `CODING_STANDARDS.md` - Detaylı kod standartları
- `DESE_JARVIS_CONTEXT.md` - Proje context

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

