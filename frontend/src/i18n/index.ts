/**
 * Internationalization (i18n) System
 * DESE EA PLAN v7.1
 * 
 * Provides multi-language support with Zustand-based state management.
 * Supports Turkish (tr) and English (en) locales.
 * 
 * @example
 * import { useI18n } from '@/i18n';
 * 
 * function MyComponent() {
 *   const { t, locale, setLocale } = useI18n();
 *   return <h1>{t('common.welcome')}</h1>;
 * }
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Supported locales
export type Locale = 'tr' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['tr', 'en'];

export const LOCALE_NAMES: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
};

// Translation keys type
type TranslationKey = string;

// Translations dictionary
const translations: Record<Locale, Record<TranslationKey, string>> = {
  tr: {
    // Common
    'common.welcome': 'Hoş Geldiniz',
    'common.search': 'Ara...',
    'common.searchPlaceholder': 'Ara... (Ctrl+K veya /)',
    'common.loading': 'Yükleniyor...',
    'common.error': 'Bir hata oluştu',
    'common.retry': 'Tekrar Dene',
    'common.save': 'Kaydet',
    'common.cancel': 'İptal',
    'common.delete': 'Sil',
    'common.edit': 'Düzenle',
    'common.create': 'Oluştur',
    'common.close': 'Kapat',
    'common.confirm': 'Onayla',
    'common.back': 'Geri',
    'common.next': 'İleri',
    'common.yes': 'Evet',
    'common.no': 'Hayır',
    'common.noResults': 'Sonuç bulunamadı',
    'common.actions': 'İşlemler',
    
    // Auth
    'auth.login': 'Giriş Yap',
    'auth.logout': 'Çıkış Yap',
    'auth.email': 'E-posta',
    'auth.password': 'Şifre',
    'auth.forgotPassword': 'Şifremi Unuttum',
    'auth.loginSuccess': 'Giriş başarılı!',
    'auth.loginFailed': 'Giriş başarısız',
    'auth.invalidCredentials': 'Geçersiz e-posta veya şifre',
    'auth.sessionExpired': 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
    'auth.googleLogin': 'Google ile Giriş Yap',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.home': 'Ana Sayfa',
    'nav.settings': 'Ayarlar',
    'nav.profile': 'Profil',
    'nav.help': 'Yardım',
    'nav.modules': 'Modüller',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Hoş Geldiniz',
    'dashboard.overview': 'Genel Bakış',
    'dashboard.recentActivity': 'Son Aktiviteler',
    'dashboard.performance': 'Performans Metrikleri',
    
    // MCP Modules
    'mcp.finbot': 'FinBot MCP',
    'mcp.finbot.description': 'Finansal planlama ve gelir projeksiyonları',
    'mcp.mubot': 'MuBot MCP',
    'mcp.mubot.description': 'Muhasebe ve ERP entegrasyonları',
    'mcp.aiops': 'Jarvis AIOps MCP',
    'mcp.aiops.description': 'Operasyon kontrol merkezi',
    'mcp.iot': 'IoT MCP',
    'mcp.iot.description': 'IoT cihaz yönetimi',
    'mcp.hr': 'HR MCP',
    'mcp.hr.description': 'İnsan kaynakları yönetimi',
    'mcp.crm': 'CRM MCP',
    'mcp.crm.description': 'Müşteri ilişkileri yönetimi',
    'mcp.inventory': 'Inventory MCP',
    'mcp.inventory.description': 'Stok ve envanter yönetimi',
    
    // Settings
    'settings.title': 'Ayarlar',
    'settings.language': 'Dil',
    'settings.theme': 'Tema',
    'settings.themeLight': 'Açık',
    'settings.themeDark': 'Koyu',
    'settings.themeSystem': 'Sistem',
    'settings.notifications': 'Bildirimler',
    'settings.integrations': 'Entegrasyonlar',
    
    // Errors
    'error.generic': 'Beklenmeyen bir hata oluştu',
    'error.network': 'Ağ bağlantısı hatası',
    'error.notFound': 'Sayfa bulunamadı',
    'error.unauthorized': 'Yetkisiz erişim',
    'error.forbidden': 'Erişim reddedildi',
    'error.serverError': 'Sunucu hatası',
    'error.tryAgain': 'Lütfen tekrar deneyin',
    
    // Tables
    'table.noData': 'Veri bulunamadı',
    'table.loading': 'Veriler yükleniyor...',
    'table.rowsPerPage': 'Sayfa başına satır',
    'table.of': '/',
    'table.page': 'Sayfa',
    
    // Forms
    'form.required': 'Bu alan zorunludur',
    'form.invalidEmail': 'Geçerli bir e-posta adresi giriniz',
    'form.minLength': 'En az {min} karakter olmalıdır',
    'form.maxLength': 'En fazla {max} karakter olabilir',
  },
  
  en: {
    // Common
    'common.welcome': 'Welcome',
    'common.search': 'Search...',
    'common.searchPlaceholder': 'Search... (Ctrl+K or /)',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.noResults': 'No results found',
    'common.actions': 'Actions',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot Password',
    'auth.loginSuccess': 'Login successful!',
    'auth.loginFailed': 'Login failed',
    'auth.invalidCredentials': 'Invalid email or password',
    'auth.sessionExpired': 'Session expired. Please log in again.',
    'auth.googleLogin': 'Login with Google',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.home': 'Home',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.help': 'Help',
    'nav.modules': 'Modules',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    'dashboard.overview': 'Overview',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.performance': 'Performance Metrics',
    
    // MCP Modules
    'mcp.finbot': 'FinBot MCP',
    'mcp.finbot.description': 'Financial planning and revenue projections',
    'mcp.mubot': 'MuBot MCP',
    'mcp.mubot.description': 'Accounting and ERP integrations',
    'mcp.aiops': 'Jarvis AIOps MCP',
    'mcp.aiops.description': 'Operations control center',
    'mcp.iot': 'IoT MCP',
    'mcp.iot.description': 'IoT device management',
    'mcp.hr': 'HR MCP',
    'mcp.hr.description': 'Human resources management',
    'mcp.crm': 'CRM MCP',
    'mcp.crm.description': 'Customer relationship management',
    'mcp.inventory': 'Inventory MCP',
    'mcp.inventory.description': 'Stock and inventory management',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',
    'settings.themeSystem': 'System',
    'settings.notifications': 'Notifications',
    'settings.integrations': 'Integrations',
    
    // Errors
    'error.generic': 'An unexpected error occurred',
    'error.network': 'Network connection error',
    'error.notFound': 'Page not found',
    'error.unauthorized': 'Unauthorized access',
    'error.forbidden': 'Access denied',
    'error.serverError': 'Server error',
    'error.tryAgain': 'Please try again',
    
    // Tables
    'table.noData': 'No data found',
    'table.loading': 'Loading data...',
    'table.rowsPerPage': 'Rows per page',
    'table.of': 'of',
    'table.page': 'Page',
    
    // Forms
    'form.required': 'This field is required',
    'form.invalidEmail': 'Please enter a valid email address',
    'form.minLength': 'Must be at least {min} characters',
    'form.maxLength': 'Must be at most {max} characters',
  },
};

// i18n Store Interface
interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * i18n Hook with Zustand
 * Provides locale state and translation function
 */
export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'tr',
      
      setLocale: (locale: Locale) => {
        set({ locale });
        // Update HTML lang attribute
        if (typeof document !== 'undefined') {
          document.documentElement.lang = locale;
        }
      },
      
      t: (key: string, params?: Record<string, string | number>) => {
        const { locale } = get();
        let translation = translations[locale][key];
        
        // Fallback to English if key not found
        if (!translation) {
          translation = translations.en[key];
        }
        
        // Return key if translation not found
        if (!translation) {
          console.warn(`Translation missing for key: ${key}`);
          return key;
        }
        
        // Replace parameters
        if (params) {
          Object.entries(params).forEach(([paramKey, value]) => {
            translation = translation.replace(`{${paramKey}}`, String(value));
          });
        }
        
        return translation;
      },
    }),
    {
      name: 'dese-i18n',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);

/**
 * Get translation without hook (for non-React contexts)
 */
export function getTranslation(key: string, locale?: Locale): string {
  const currentLocale = locale || useI18n.getState().locale;
  return translations[currentLocale][key] || translations.en[key] || key;
}

export default useI18n;
