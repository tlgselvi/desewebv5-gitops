/**
 * Internationalization (i18n) Configuration
 * DESE EA PLAN v7.0
 * 
 * Supports: Turkish (tr), English (en)
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

// Translation types
type NestedTranslations = {
  [key: string]: string | NestedTranslations;
};

// Translations store
interface I18nStore {
  locale: Locale;
  translations: Record<Locale, NestedTranslations>;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Turkish translations
const tr: NestedTranslations = {
  common: {
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    add: 'Ekle',
    search: 'Ara',
    filter: 'Filtrele',
    export: 'Dışa Aktar',
    import: 'İçe Aktar',
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    warning: 'Uyarı',
    info: 'Bilgi',
    yes: 'Evet',
    no: 'Hayır',
    confirm: 'Onayla',
    back: 'Geri',
    next: 'İleri',
    finish: 'Bitir',
    close: 'Kapat',
    submit: 'Gönder',
    reset: 'Sıfırla',
    all: 'Tümü',
    none: 'Hiçbiri',
    select: 'Seç',
    noData: 'Veri bulunamadı',
    actions: 'İşlemler',
  },
  auth: {
    login: 'Giriş Yap',
    logout: 'Çıkış Yap',
    register: 'Kayıt Ol',
    forgotPassword: 'Şifremi Unuttum',
    resetPassword: 'Şifre Sıfırla',
    email: 'E-posta',
    password: 'Şifre',
    confirmPassword: 'Şifre Tekrar',
    rememberMe: 'Beni Hatırla',
    loginSuccess: 'Başarıyla giriş yapıldı',
    loginError: 'Giriş yapılamadı',
    logoutSuccess: 'Başarıyla çıkış yapıldı',
    invalidCredentials: 'Geçersiz e-posta veya şifre',
  },
  nav: {
    dashboard: 'Gösterge Paneli',
    finance: 'Finans',
    crm: 'CRM',
    inventory: 'Envanter',
    hr: 'İnsan Kaynakları',
    iot: 'IoT',
    service: 'Servis',
    settings: 'Ayarlar',
    profile: 'Profil',
    help: 'Yardım',
  },
  finance: {
    title: 'Finans Yönetimi',
    accounts: 'Hesaplar',
    invoices: 'Faturalar',
    transactions: 'İşlemler',
    reports: 'Raporlar',
    newAccount: 'Yeni Hesap',
    newInvoice: 'Yeni Fatura',
    totalBalance: 'Toplam Bakiye',
    income: 'Gelir',
    expense: 'Gider',
    profit: 'Kar',
  },
  crm: {
    title: 'Müşteri İlişkileri',
    contacts: 'Kişiler',
    deals: 'Fırsatlar',
    pipeline: 'Pipeline',
    activities: 'Aktiviteler',
    newContact: 'Yeni Kişi',
    newDeal: 'Yeni Fırsat',
    totalContacts: 'Toplam Kişi',
    activeDeals: 'Aktif Fırsatlar',
    wonDeals: 'Kazanılan',
    lostDeals: 'Kaybedilen',
  },
  inventory: {
    title: 'Envanter Yönetimi',
    products: 'Ürünler',
    stock: 'Stok',
    warehouses: 'Depolar',
    movements: 'Hareketler',
    newProduct: 'Yeni Ürün',
    lowStock: 'Düşük Stok',
    outOfStock: 'Stokta Yok',
    totalProducts: 'Toplam Ürün',
  },
  hr: {
    title: 'İnsan Kaynakları',
    employees: 'Çalışanlar',
    departments: 'Departmanlar',
    payroll: 'Bordro',
    leaves: 'İzinler',
    newEmployee: 'Yeni Çalışan',
    totalEmployees: 'Toplam Çalışan',
    activeEmployees: 'Aktif Çalışan',
  },
  iot: {
    title: 'IoT Yönetimi',
    devices: 'Cihazlar',
    telemetry: 'Telemetri',
    alerts: 'Uyarılar',
    rules: 'Kurallar',
    newDevice: 'Yeni Cihaz',
    online: 'Çevrimiçi',
    offline: 'Çevrimdışı',
    totalDevices: 'Toplam Cihaz',
  },
  service: {
    title: 'Servis Yönetimi',
    requests: 'Talepler',
    technicians: 'Teknisyenler',
    visits: 'Ziyaretler',
    maintenance: 'Bakım',
    newRequest: 'Yeni Talep',
    pending: 'Beklemede',
    inProgress: 'Devam Ediyor',
    completed: 'Tamamlandı',
  },
  settings: {
    title: 'Ayarlar',
    general: 'Genel',
    organization: 'Organizasyon',
    users: 'Kullanıcılar',
    roles: 'Roller',
    integrations: 'Entegrasyonlar',
    billing: 'Faturalama',
    security: 'Güvenlik',
    notifications: 'Bildirimler',
    language: 'Dil',
    theme: 'Tema',
    timezone: 'Saat Dilimi',
  },
  validation: {
    required: 'Bu alan zorunludur',
    email: 'Geçerli bir e-posta adresi girin',
    minLength: 'En az {min} karakter olmalıdır',
    maxLength: 'En fazla {max} karakter olabilir',
    min: 'En az {min} olmalıdır',
    max: 'En fazla {max} olabilir',
    pattern: 'Geçersiz format',
    unique: 'Bu değer zaten kullanılıyor',
  },
  errors: {
    generic: 'Bir hata oluştu',
    network: 'Ağ hatası',
    unauthorized: 'Yetkisiz erişim',
    forbidden: 'Erişim reddedildi',
    notFound: 'Bulunamadı',
    serverError: 'Sunucu hatası',
    timeout: 'İstek zaman aşımına uğradı',
  },
  dates: {
    today: 'Bugün',
    yesterday: 'Dün',
    tomorrow: 'Yarın',
    thisWeek: 'Bu Hafta',
    thisMonth: 'Bu Ay',
    thisYear: 'Bu Yıl',
    lastWeek: 'Geçen Hafta',
    lastMonth: 'Geçen Ay',
    lastYear: 'Geçen Yıl',
  },
};

// English translations
const en: NestedTranslations = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    close: 'Close',
    submit: 'Submit',
    reset: 'Reset',
    all: 'All',
    none: 'None',
    select: 'Select',
    noData: 'No data found',
    actions: 'Actions',
  },
  auth: {
    login: 'Log In',
    logout: 'Log Out',
    register: 'Register',
    forgotPassword: 'Forgot Password',
    resetPassword: 'Reset Password',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    rememberMe: 'Remember Me',
    loginSuccess: 'Successfully logged in',
    loginError: 'Login failed',
    logoutSuccess: 'Successfully logged out',
    invalidCredentials: 'Invalid email or password',
  },
  nav: {
    dashboard: 'Dashboard',
    finance: 'Finance',
    crm: 'CRM',
    inventory: 'Inventory',
    hr: 'Human Resources',
    iot: 'IoT',
    service: 'Service',
    settings: 'Settings',
    profile: 'Profile',
    help: 'Help',
  },
  finance: {
    title: 'Finance Management',
    accounts: 'Accounts',
    invoices: 'Invoices',
    transactions: 'Transactions',
    reports: 'Reports',
    newAccount: 'New Account',
    newInvoice: 'New Invoice',
    totalBalance: 'Total Balance',
    income: 'Income',
    expense: 'Expense',
    profit: 'Profit',
  },
  crm: {
    title: 'Customer Relations',
    contacts: 'Contacts',
    deals: 'Deals',
    pipeline: 'Pipeline',
    activities: 'Activities',
    newContact: 'New Contact',
    newDeal: 'New Deal',
    totalContacts: 'Total Contacts',
    activeDeals: 'Active Deals',
    wonDeals: 'Won',
    lostDeals: 'Lost',
  },
  inventory: {
    title: 'Inventory Management',
    products: 'Products',
    stock: 'Stock',
    warehouses: 'Warehouses',
    movements: 'Movements',
    newProduct: 'New Product',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    totalProducts: 'Total Products',
  },
  hr: {
    title: 'Human Resources',
    employees: 'Employees',
    departments: 'Departments',
    payroll: 'Payroll',
    leaves: 'Leaves',
    newEmployee: 'New Employee',
    totalEmployees: 'Total Employees',
    activeEmployees: 'Active Employees',
  },
  iot: {
    title: 'IoT Management',
    devices: 'Devices',
    telemetry: 'Telemetry',
    alerts: 'Alerts',
    rules: 'Rules',
    newDevice: 'New Device',
    online: 'Online',
    offline: 'Offline',
    totalDevices: 'Total Devices',
  },
  service: {
    title: 'Service Management',
    requests: 'Requests',
    technicians: 'Technicians',
    visits: 'Visits',
    maintenance: 'Maintenance',
    newRequest: 'New Request',
    pending: 'Pending',
    inProgress: 'In Progress',
    completed: 'Completed',
  },
  settings: {
    title: 'Settings',
    general: 'General',
    organization: 'Organization',
    users: 'Users',
    roles: 'Roles',
    integrations: 'Integrations',
    billing: 'Billing',
    security: 'Security',
    notifications: 'Notifications',
    language: 'Language',
    theme: 'Theme',
    timezone: 'Timezone',
  },
  validation: {
    required: 'This field is required',
    email: 'Enter a valid email address',
    minLength: 'Must be at least {min} characters',
    maxLength: 'Must be at most {max} characters',
    min: 'Must be at least {min}',
    max: 'Must be at most {max}',
    pattern: 'Invalid format',
    unique: 'This value is already in use',
  },
  errors: {
    generic: 'An error occurred',
    network: 'Network error',
    unauthorized: 'Unauthorized access',
    forbidden: 'Access denied',
    notFound: 'Not found',
    serverError: 'Server error',
    timeout: 'Request timed out',
  },
  dates: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    lastWeek: 'Last Week',
    lastMonth: 'Last Month',
    lastYear: 'Last Year',
  },
};

// i18n store
export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      locale: 'tr' as Locale,
      translations: { tr, en },
      
      setLocale: (locale: Locale) => {
        set({ locale });
        // Update HTML lang attribute
        if (typeof document !== 'undefined') {
          document.documentElement.lang = locale;
        }
      },
      
      t: (key: string, params?: Record<string, string | number>): string => {
        const { locale, translations } = get();
        const keys = key.split('.');
        
        let value: string | NestedTranslations = translations[locale];
        
        for (const k of keys) {
          if (typeof value === 'object' && value !== null) {
            value = value[k];
          } else {
            return key; // Key not found
          }
        }
        
        if (typeof value !== 'string') {
          return key;
        }
        
        // Replace parameters
        if (params) {
          return Object.entries(params).reduce(
            (str, [paramKey, paramValue]) => 
              str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
            value
          );
        }
        
        return value;
      },
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);

// Utility hooks
export const useTranslation = () => {
  const { t, locale, setLocale } = useI18n();
  return { t, locale, setLocale };
};

// Format utilities
export const formatDate = (date: Date, locale: Locale): string => {
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const formatDateTime = (date: Date, locale: Locale): string => {
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatCurrency = (amount: number, currency: string, locale: Locale): string => {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatNumber = (num: number, locale: Locale): string => {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US').format(num);
};

export const formatPercent = (num: number, locale: Locale): string => {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100);
};

