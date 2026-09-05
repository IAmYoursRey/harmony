import { createContext } from 'react';

export type Language = 'id' | 'en';

export interface I18nContextValue {
  locale: Language;
  setLocale: (locale: Language) => void;
  t: (key: string, variablesOrDefault?: string | Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
