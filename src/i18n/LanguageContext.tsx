import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, Language, TranslationKeys } from './translations';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const SUPPORTED_LANGUAGES: Language[] = ['nl', 'fr', 'en'];

/** Detect browser language, fallback to 'nl' */
const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language?.slice(0, 2).toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(browserLang as Language)) return browserLang as Language;
  return 'nl';
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('de12eman-lang');
    if (saved && SUPPORTED_LANGUAGES.includes(saved as Language)) return saved as Language;
    return detectBrowserLanguage();
  });

  // Sync language from profile on auth state change
  useEffect(() => {
    let cancelled = false;
    const syncFromProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const { data } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', session.user.id)
        .maybeSingle();
      if (data?.language && SUPPORTED_LANGUAGES.includes(data.language as Language) && !cancelled) {
        setLanguageState(data.language as Language);
        localStorage.setItem('de12eman-lang', data.language);
      }
    };
    syncFromProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) syncFromProfile();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('de12eman-lang', lang);
    // Persist to profile if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ language: lang } as any).eq('id', session.user.id);
    }
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
