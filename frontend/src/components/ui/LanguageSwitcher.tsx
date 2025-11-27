/**
 * Language Switcher Component
 * DESE EA PLAN v7.0
 */

'use client';

import { useI18n, SUPPORTED_LOCALES, LOCALE_NAMES, type Locale } from '@/i18n';
import { useState, useRef, useEffect } from 'react';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'buttons' | 'select';
  showLabel?: boolean;
  className?: string;
}

export function LanguageSwitcher({ 
  variant = 'dropdown', 
  showLabel = false,
  className = '' 
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const FlagIcon = ({ locale: l }: { locale: Locale }) => {
    const flags: Record<Locale, string> = {
      tr: '🇹🇷',
      en: '🇺🇸',
    };
    return <span className="text-lg">{flags[l]}</span>;
  };

  if (variant === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {SUPPORTED_LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
              ${locale === l 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}
            `}
          >
            <FlagIcon locale={l} />
            {showLabel && <span>{LOCALE_NAMES[l]}</span>}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'select') {
    return (
      <div className={`relative ${className}`}>
        {showLabel && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('settings.language')}
          </label>
        )}
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="
            w-full px-3 py-2 rounded-lg border border-gray-300 
            bg-white dark:bg-gray-800 dark:border-gray-600
            focus:ring-2 focus:ring-primary focus:border-primary
            cursor-pointer
          "
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
          transition-colors
        "
        aria-label={t('settings.language')}
        aria-expanded={isOpen}
      >
        <FlagIcon locale={locale} />
        <span className="text-sm font-medium">{LOCALE_NAMES[locale]}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="
          absolute right-0 mt-2 py-2 w-40 
          bg-white dark:bg-gray-800 
          rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
          z-50
        ">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2 text-left
                hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                ${locale === l ? 'bg-gray-50 dark:bg-gray-700' : ''}
              `}
            >
              <FlagIcon locale={l} />
              <span className="text-sm">{LOCALE_NAMES[l]}</span>
              {locale === l && (
                <svg className="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;

