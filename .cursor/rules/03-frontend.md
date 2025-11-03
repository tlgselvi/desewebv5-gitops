---
alwaysApply: false
priority: medium
globs:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
  - "src/**/*.tsx"
version: 6.7.0
lastUpdated: 2025-11-03
---

# 🎨 Frontend Kuralları (Next.js 16 + React 19 + TypeScript)

## Component Yapısı

```typescript
// ✅ Doğru Component Yapısı
import { FC } from 'react';

interface UserCardProps {
  id: string;
  name: string;
  email: string;
  onEdit?: (id: string) => void;
}

export const UserCard: FC<UserCardProps> = ({ id, name, email, onEdit }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-gray-600">{email}</p>
      {onEdit && (
        <button onClick={() => onEdit(id)}>Edit</button>
      )}
    </div>
  );
};
```

**Kurallar:**
- ✅ TypeScript interface kullanılmalı (props için)
- ✅ Functional components tercih edilmeli
- ✅ Tailwind CSS class'ları kullanılmalı
- ✅ Props optional ise `?` ile işaretlenmeli

## Hooks Kullanımı

```typescript
// ✅ Doğru Hook Kullanımı
import { useState, useEffect } from 'react';

export function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const data = await fetchUserById(userId);
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  return { user, loading, error };
}
```

**Kurallar:**
- ✅ Custom hooks için `use` prefix kullanılmalı
- ✅ Loading ve error state'leri yönetilmeli
- ✅ useEffect dependencies doğru tanımlanmalı
- ✅ Type safety sağlanmalı

