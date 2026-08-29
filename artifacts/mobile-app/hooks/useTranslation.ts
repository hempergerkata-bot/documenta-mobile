import { useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, formatNumber, isRtlLanguage, languageDefinition, t, type AppLanguage, type TranslationKey } from '@/utils/localization';

export function useTranslation() {
  const { settings } = useApp();
  const language = settings.appLanguage;
  const definition = languageDefinition(language);
  const translate = useCallback((key: TranslationKey, variables?: Record<string, string | number>) => t(language, key, variables), [language]);
  return {
    language,
    direction: definition.direction,
    isRTL: isRtlLanguage(language),
    backSymbol: isRtlLanguage(language) ? '→' : '←',
    t: translate,
    date: (value: string | Date | undefined) => formatDate(value, language),
    number: (value: string | number | undefined) => formatNumber(value, language),
    currency: (value: string | number | undefined, currency = 'EUR') => formatCurrency(value, language, currency),
  };
}

export type { AppLanguage };
