# ♿ Accessibility Checklist - WCAG 2.1 AA

**DESE EA PLAN v7.0**  
**Target:** WCAG 2.1 Level AA Compliance

---

## 📋 Checklist by Category

### 1. Perceivable

#### 1.1 Text Alternatives
- [x] All images have `alt` attributes
- [x] Decorative images use `alt=""`
- [x] Complex images have detailed descriptions
- [x] Icons have accessible labels
- [ ] Charts have data tables as alternatives

#### 1.2 Time-based Media
- [ ] Videos have captions
- [ ] Videos have audio descriptions
- [ ] Live audio has captions

#### 1.3 Adaptable
- [x] Semantic HTML structure (headings, landmarks)
- [x] Reading order is logical
- [x] Instructions don't rely solely on sensory characteristics
- [x] Page orientation is not restricted

#### 1.4 Distinguishable
- [x] Color contrast ratio ≥ 4.5:1 (normal text)
- [x] Color contrast ratio ≥ 3:1 (large text)
- [x] Text can be resized to 200%
- [x] Images of text are avoided
- [x] Reflow works at 320px width
- [x] Non-text contrast ≥ 3:1
- [ ] Text spacing can be adjusted
- [x] Content on hover/focus is dismissible

### 2. Operable

#### 2.1 Keyboard Accessible
- [x] All functionality available via keyboard
- [x] No keyboard traps
- [ ] Character key shortcuts can be turned off
- [x] Skip links available

#### 2.2 Enough Time
- [ ] Timing can be adjusted
- [x] Auto-updating content can be paused
- [ ] No time limits on forms

#### 2.3 Seizures and Physical Reactions
- [x] No content flashes more than 3 times/second
- [x] No motion animation that causes vestibular issues

#### 2.4 Navigable
- [x] Skip links to main content
- [x] Pages have descriptive titles
- [x] Focus order is logical
- [x] Link purpose is clear
- [x] Multiple ways to find pages
- [x] Headings and labels are descriptive
- [x] Focus is visible
- [ ] Location is indicated (breadcrumbs)

#### 2.5 Input Modalities
- [x] Pointer gestures have alternatives
- [ ] Pointer cancellation supported
- [x] Label in Name
- [ ] Motion actuation has alternatives
- [x] Target size ≥ 44px (touch targets)

### 3. Understandable

#### 3.1 Readable
- [x] Language of page is set
- [x] Language of parts is set
- [ ] Unusual words are defined
- [ ] Abbreviations are expanded

#### 3.2 Predictable
- [x] Focus doesn't change context
- [x] Input doesn't change context
- [x] Consistent navigation
- [x] Consistent identification

#### 3.3 Input Assistance
- [x] Error identification
- [x] Labels or instructions
- [x] Error suggestion
- [x] Error prevention for legal/financial

### 4. Robust

#### 4.1 Compatible
- [x] Valid HTML
- [x] Name, role, value for custom components
- [x] Status messages announced

---

## 🧪 Testing Tools

### Automated Testing

```bash
# Install axe-core
npm install --save-dev @axe-core/playwright

# Run accessibility tests
pnpm test:a11y
```

### Playwright A11y Test Example

```typescript
// tests/e2e/accessibility/a11y-audit.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('Dashboard should be accessible', async ({ page }) => {
    await page.goto('/dashboard');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('Login page should be accessible', async ({ page }) => {
    await page.goto('/login');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  // Add more pages...
});
```

### Manual Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus visibility
   - Test all functionality without mouse

2. **Screen Reader Testing**
   - NVDA (Windows)
   - VoiceOver (macOS/iOS)
   - TalkBack (Android)

3. **Color Contrast**
   - Use browser DevTools
   - WebAIM Contrast Checker

4. **Zoom Testing**
   - Test at 200% zoom
   - Test at 400% zoom
   - Verify no horizontal scrolling at 320px

---

## 🔧 Common Fixes

### Missing Alt Text

```tsx
// ❌ Bad
<img src="/logo.png" />

// ✅ Good
<img src="/logo.png" alt="DESE EA Plan Logo" />

// ✅ Decorative
<img src="/decoration.png" alt="" role="presentation" />
```

### Missing Form Labels

```tsx
// ❌ Bad
<input type="text" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input type="text" id="email" />

// ✅ With aria-label
<input type="text" aria-label="Email address" />
```

### Color Contrast

```css
/* ❌ Bad - contrast ratio ~2.5:1 */
.text {
  color: #999999;
  background: #ffffff;
}

/* ✅ Good - contrast ratio ~7:1 */
.text {
  color: #595959;
  background: #ffffff;
}
```

### Focus Visibility

```css
/* ❌ Bad */
*:focus {
  outline: none;
}

/* ✅ Good */
*:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Skip Link

```tsx
// Add at top of page
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded"
>
  Skip to main content
</a>

// Main content area
<main id="main-content" tabIndex={-1}>
  ...
</main>
```

### ARIA Landmarks

```tsx
<header role="banner">...</header>
<nav role="navigation" aria-label="Main">...</nav>
<main role="main">...</main>
<aside role="complementary">...</aside>
<footer role="contentinfo">...</footer>
```

---

## 📊 Lighthouse Audit

```bash
# Run Lighthouse CI
npx lighthouse http://localhost:3000 \
  --output=html \
  --output-path=./lighthouse-report.html \
  --only-categories=accessibility
```

### Target Scores

| Metric | Target | Current |
|--------|--------|---------|
| Accessibility | > 90 | TBD |
| Performance | > 90 | TBD |
| Best Practices | > 90 | TBD |
| SEO | > 90 | TBD |

---

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Checklist](https://webaim.org/standards/wcag/checklist)
- [A11y Project](https://www.a11yproject.com/)
- [Axe DevTools](https://www.deque.com/axe/devtools/)

---

**Son Güncelleme:** 27 Kasım 2025

