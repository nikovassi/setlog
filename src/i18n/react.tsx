import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSettings } from '../hooks/useSettings';
import { equipmentName, exerciseName, monthName, muscleName, pl, pw, setLanguage, t, type Language } from './core';

const api = { t, pl, pw, exerciseName, muscleName, equipmentName, monthName };
type I18n = typeof api & { lang: Language };

const Ctx = createContext<I18n>({ ...api, lang: 'en' });

/** Reads the language from settings; every consumer re-renders when it changes. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { language } = useSettings();
  // Set synchronously so formatters and services used during this render see the new language.
  setLanguage(language);
  const value = useMemo(() => ({ ...api, lang: language }), [language]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  return useContext(Ctx);
}
