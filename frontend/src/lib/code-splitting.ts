/**
 * Code Splitting Utilities
 * Provides utilities for dynamic imports and lazy loading
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * Dynamic import with loading component
 */
export function createLazyComponent<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingComponent?: ComponentType
) {
  return dynamic(importFn, {
    loading: loadingComponent
      ? () => {
          const LoadingComponent = loadingComponent;
          return <LoadingComponent />;
        }
      : undefined,
    ssr: false, // Disable SSR for better performance if not needed
  });
}

/**
 * Lazy load a component with error boundary
 */
export function lazyLoad<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>
) {
  return dynamic(importFn, {
    loading: () => <div>Yükleniyor...</div>,
    ssr: false,
  });
}

/**
 * Preload a module for faster subsequent loads
 */
export function preloadModule(importFn: () => Promise<unknown>): void {
  if (typeof window !== 'undefined') {
    importFn();
  }
}

