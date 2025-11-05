# 🎨 Frontend Rules - Dese EA Plan v6.8.0

**Versiyon:** 6.8.0  
**Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS

---

## ✅ Component Kuralları

### 1. TypeScript Interface
- ✅ Props için interface kullanın
- ✅ Optional props için `?` kullanın

```typescript
// ✅ Doğru
interface UserCardProps {
  id: string;
  name: string;
  email: string;
  onEdit?: (id: string) => void;
}

export const UserCard: FC<UserCardProps> = ({ id, name, email, onEdit }) => {
  // ...
};
```

### 2. Functional Components
- ✅ Functional components tercih edin
- ✅ `'use client'` directive gerekli yerlerde

```typescript
// ✅ Doğru
'use client';

import { FC } from 'react';

export const UserCard: FC<UserCardProps> = ({ ... }) => {
  // ...
};
```

### 3. Tailwind CSS
- ✅ Tailwind CSS class'ları kullanın
- ✅ Inline styles kullanmayın

```typescript
// ✅ Doğru
<div className="p-4 bg-white rounded-lg shadow">

// ❌ Yanlış
<div style={{ padding: '1rem', backgroundColor: 'white' }}>
```

---

## 📁 Dosya Yapısı

```
frontend/
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # React components
│   ├── lib/          # Utilities
│   └── styles/       # Global styles
```

---

## 📚 Referanslar

- `.cursorrules` - Ana rules dosyası
- `DESE_JARVIS_CONTEXT.md` - Proje context

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

