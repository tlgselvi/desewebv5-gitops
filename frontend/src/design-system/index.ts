/**
 * Design System
 * 
 * Centralized design system exports for the application.
 * This module provides access to design tokens, component utilities, and design guidelines.
 */

export * from './tokens';
export { designTokens } from './tokens';
export type { DesignTokens } from './tokens';

// Design System Guidelines
export const designSystemGuidelines = {
  /**
   * Color Usage Guidelines
   */
  colorUsage: {
    primary: 'Use for primary actions, links, and brand elements',
    success: 'Use for success states, confirmations, and positive feedback',
    warning: 'Use for warnings and cautionary messages',
    error: 'Use for errors, destructive actions, and critical alerts',
    gray: 'Use for neutral text, borders, and backgrounds',
    slate: 'Use for alternative neutral tones',
  },
  
  /**
   * Typography Guidelines
   */
  typographyUsage: {
    sans: 'Use for body text, UI elements, and general content',
    mono: 'Use for code, technical data, and monospaced content',
  },
  
  /**
   * Spacing Guidelines
   */
  spacingGuidelines: {
    rule: 'Use consistent spacing scale (4px base unit)',
    small: 'Use spacing[1-3] for tight spacing (4-12px)',
    medium: 'Use spacing[4-6] for standard spacing (16-24px)',
    large: 'Use spacing[8-12] for section spacing (32-48px)',
    xlarge: 'Use spacing[16+] for page-level spacing (64px+)',
  },
  
  /**
   * Component Guidelines
   */
  componentGuidelines: {
    consistency: 'All components should follow the same design patterns',
    accessibility: 'All components must meet WCAG 2.1 AA standards',
    responsive: 'All components must work on mobile, tablet, and desktop',
    theming: 'All components must support light and dark themes',
  },
} as const;

