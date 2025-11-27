/**
 * Accessibility Utilities
 * Helper functions for improving accessibility
 */

/**
 * Generate unique ID for form elements
 */
export function generateId(prefix = 'input'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ARIA live region for announcements
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const region = document.getElementById('a11y-live-region');
  if (region) {
    region.setAttribute('aria-live', priority);
    region.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      region.textContent = '';
    }, 1000);
  }
}

/**
 * Focus trap utility for modals
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTab);
  
  return () => {
    element.removeEventListener('keydown', handleTab);
  };
}

/**
 * Skip to main content link
 */
export function createSkipLink(): HTMLElement {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md';
  skipLink.textContent = 'Skip to main content';
  return skipLink;
}

