/**
 * Keyboard Navigation Hook
 * Provides keyboard shortcuts and navigation utilities
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description?: string;
}

/**
 * Hook for keyboard navigation and shortcuts
 */
export function useKeyboardNavigation(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const matches =
          event.key === shortcut.key &&
          (shortcut.ctrlKey ?? false) === event.ctrlKey &&
          (shortcut.shiftKey ?? false) === event.shiftKey &&
          (shortcut.altKey ?? false) === event.altKey;

        if (matches) {
          event.preventDefault();
          shortcut.handler();
        }
      });
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Common keyboard shortcuts for the application
 */
export const COMMON_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: '/',
    handler: () => {
      // Focus search input if available
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    description: 'Focus search',
  },
  {
    key: 'k',
    ctrlKey: true,
    handler: () => {
      // Focus command palette if available
      const commandPalette = document.querySelector('[data-command-palette]');
      if (commandPalette) {
        (commandPalette as HTMLElement).focus();
      }
    },
    description: 'Open command palette',
  },
];

