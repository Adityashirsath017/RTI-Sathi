import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LanguageOption } from './languages';
import { TRANSLATIONS } from './index';
import { clerkAuthService } from '@/services/firebase/clerkAuthService';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  currentLanguageOption: LanguageOption;
  t: (
    key: string,
    paramsOrFallback?: string | Record<string, string | number>,
    maybeParams?: Record<string, string | number>
  ) => string;
  isSaving: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    const saved = localStorage.getItem('clerk_preferred_lang');
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    const current = clerkAuthService.getCurrentClerk();
    if (current?.preferredLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === current.preferredLanguage)) {
      return current.preferredLanguage;
    }
    return DEFAULT_LANGUAGE;
  });

  const [isSaving, setIsSaving] = useState(false);

  // Sync with Firebase clerk document
  useEffect(() => {
    const unsubscribe = clerkAuthService.onAuthStateChanged((currentClerk) => {
      if (currentClerk?.preferredLanguage) {
        const clerkLang = currentClerk.preferredLanguage;
        if (SUPPORTED_LANGUAGES.some((l) => l.code === clerkLang)) {
          setLanguageState(clerkLang);
          localStorage.setItem('clerk_preferred_lang', clerkLang);
          document.documentElement.lang = clerkLang;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = async (lang: string): Promise<void> => {
    const validLang = SUPPORTED_LANGUAGES.some((l) => l.code === lang) ? lang : DEFAULT_LANGUAGE;

    setLanguageState(validLang);
    localStorage.setItem('clerk_preferred_lang', validLang);
    document.documentElement.lang = validLang;

    const currentClerk = clerkAuthService.getCurrentClerk();
    if (currentClerk?.uid) {
      try {
        setIsSaving(true);
        await clerkAuthService.updateClerkProfile({ preferredLanguage: validLang });
      } catch (err) {
        console.warn('[Clerk i18n] Error persisting preferred language:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const t = (
    key: string,
    paramsOrFallback?: string | Record<string, string | number>,
    maybeParams?: Record<string, string | number>
  ): string => {
    const isFallbackString = typeof paramsOrFallback === 'string';
    const fallback = isFallbackString ? paramsOrFallback : undefined;
    const params = isFallbackString ? maybeParams : paramsOrFallback;

    let text =
      TRANSLATIONS[language]?.[key] ||
      TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ||
      fallback ||
      key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentLanguageOption, t, isSaving }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
