# Design System Documentation

## Overview

Bu proje için kapsamlı bir design system oluşturulmuştur. Design system, tutarlı bir kullanıcı deneyimi sağlamak için merkezi design tokens, reusable component'ler ve dokümantasyon içerir.

## Design Tokens

Design tokens `frontend/src/design-system/tokens.ts` dosyasında tanımlanmıştır:

- **Colors**: Primary, success, warning, error, gray, slate paletleri
- **Typography**: Font family, font size, font weight
- **Spacing**: 4px base unit ile tutarlı spacing scale
- **Border Radius**: Yuvarlatılmış köşeler için değerler
- **Shadows**: Soft, medium, strong shadow değerleri
- **Animations**: Duration, easing, keyframes
- **Z-Index**: Katman yönetimi için z-index değerleri

### Kullanım

```typescript
import { designTokens } from "@/design-system";

// Color kullanımı
const primaryColor = designTokens.colors.primary[500];

// Spacing kullanımı
const padding = designTokens.spacing[4]; // 1rem
```

## Component Library

### UI Components

Tüm UI component'ler `frontend/src/components/ui/` klasöründe bulunur:

#### Button
- Variants: default, destructive, outline, secondary, ghost, link
- Sizes: sm, default, lg, icon
- Icon desteği
- Loading state

#### Form Components
- **Input**: Text, email, password, number, tel, url tipleri
- **Textarea**: Çok satırlı metin girişi
- **Select**: Dropdown seçim component'i (Radix UI tabanlı)

#### Dialog/Modal
- Radix UI Dialog tabanlı
- Header, Footer, Description desteği
- Form entegrasyonu

#### Loading States
- **Loading**: Spinner, dots, pulse variant'ları
- **LoadingSpinner**: Sadece spinner
- **LoadingDots**: Animated dots
- **LoadingPulse**: Pulsing circle
- Full screen overlay desteği

#### Error States
- **ErrorState**: Hata mesajları için component
- Variants: default, compact, minimal
- Retry ve Home action desteği
- **ErrorFallback**: Error boundary için fallback component

#### Toast/Notification
- Sonner tabanlı toast wrapper
- `frontend/src/lib/toast.ts` dosyasında utility fonksiyonlar
- Success, error, info, warning, loading tipleri
- Promise toast desteği

## Storybook

Storybook component library'yi görselleştirmek ve dokümante etmek için kullanılır.

### Kurulum

```bash
cd frontend
pnpm install
```

### Çalıştırma

```bash
cd frontend
pnpm storybook
```

Storybook `http://localhost:6006` adresinde açılacaktır.

### Story Dosyaları

Her component için story dosyaları oluşturulmuştur:
- `button.stories.tsx`
- `input.stories.tsx`
- `textarea.stories.tsx`
- `select.stories.tsx`
- `dialog.stories.tsx`
- `loading.stories.tsx`
- `error-state.stories.tsx`

## Kullanım Örnekleri

### Button Kullanımı

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default" size="md">
  Click me
</Button>
```

### Loading State Kullanımı

```tsx
import { Loading } from "@/components/ui/loading";

<Loading text="Yükleniyor..." variant="spinner" size="md" />
```

### Error State Kullanımı

```tsx
import { ErrorState } from "@/components/ui/error-state";

<ErrorState
  title="Bir hata oluştu"
  message="Lütfen tekrar deneyin."
  showRetry
  onRetry={() => window.location.reload()}
/>
```

### Toast Kullanımı

```tsx
import { toast } from "@/lib/toast";

toast.success("İşlem başarılı!");
toast.error("Bir hata oluştu");
toast.promise(
  fetchData(),
  {
    loading: "Yükleniyor...",
    success: "Başarılı!",
    error: "Hata oluştu",
  }
);
```

## Best Practices

1. **Design Tokens Kullanımı**: Hard-coded değerler yerine design tokens kullanın
2. **Component Variants**: Mevcut variant'ları kullanın, yeni variant eklemek yerine
3. **Accessibility**: Tüm component'ler ARIA labels ve keyboard navigation desteği içerir
4. **TypeScript**: Tüm component'ler tam TypeScript desteği ile yazılmıştır
5. **Storybook**: Yeni component'ler için mutlaka story dosyası oluşturun

## Sonraki Adımlar

- [ ] Faz 2: UX Improvements
- [ ] Faz 3: Performance Optimization
- [ ] Faz 4: Advanced Features

## Referanslar

- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Storybook](https://storybook.js.org/)
- [Sonner](https://sonner.emilkowal.ski/)

