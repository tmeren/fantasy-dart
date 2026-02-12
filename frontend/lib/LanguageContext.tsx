import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, TranslationKey, t as translate } from './i18n';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved === 'en' || saved === 'tr') {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: TranslationKey) => translate(key, locale);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Language toggle button — designed for navbar top-right corner.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'tr' : 'en')}
      className="flex items-center gap-1 px-2 py-1 rounded-md bg-dark-700 hover:bg-dark-600 transition-colors text-sm font-medium"
      title={locale === 'en' ? 'Türkçe\'ye geç' : 'Switch to English'}
    >
      <span className={locale === 'en' ? 'text-primary-400 font-bold' : 'text-dark-500'}>EN</span>
      <span className="text-dark-600 mx-0.5">/</span>
      <span className={locale === 'tr' ? 'text-primary-400 font-bold' : 'text-dark-500'}>TR</span>
    </button>
  );
}
