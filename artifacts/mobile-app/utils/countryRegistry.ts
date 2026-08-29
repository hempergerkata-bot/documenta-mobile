import type { AppLanguage } from './localization';

/** A static, dependency-free country catalog. Selecting a suggestion is always a UI concern. */
export type CountryProfile = Readonly<{
  countryCode: string;
  nativeName: string;
  englishName: string;
  defaultLocale: string;
  defaultCurrency: string;
  defaultDateLocale: string;
  supportedAppLanguages: readonly AppLanguage[];
  enabled: boolean;
}>;

function profile(countryCode: string, nativeName: string, englishName: string, defaultLocale: string, defaultCurrency: string, defaultDateLocale: string, supportedAppLanguages: readonly AppLanguage[]): CountryProfile {
  return { countryCode, nativeName, englishName, defaultLocale, defaultCurrency, defaultDateLocale, supportedAppLanguages, enabled: true };
}
const profiles: readonly CountryProfile[] = [
  profile('DE', 'Deutschland', 'Germany', 'de-DE', 'EUR', 'de-DE', ['de']), profile('HU', 'Magyarország', 'Hungary', 'hu-HU', 'HUF', 'hu-HU', ['hu']),
  profile('US', 'United States', 'United States', 'en-US', 'USD', 'en-US', ['en']), profile('RO', 'România', 'Romania', 'ro-RO', 'RON', 'ro-RO', ['ro']),
  profile('PL', 'Polska', 'Poland', 'pl-PL', 'PLN', 'pl-PL', ['pl']), profile('SK', 'Slovensko', 'Slovakia', 'sk-SK', 'EUR', 'sk-SK', ['sk']),
  profile('UA', 'Україна', 'Ukraine', 'uk-UA', 'UAH', 'uk-UA', ['uk']), profile('TR', 'Türkiye', 'Turkey', 'tr-TR', 'TRY', 'tr-TR', ['tr']),
  profile('SA', 'المملكة العربية السعودية', 'Saudi Arabia', 'ar-SA', 'SAR', 'ar-SA', ['ar']), profile('CZ', 'Česko', 'Czechia', 'cs-CZ', 'CZK', 'cs-CZ', ['cs']),
  profile('BG', 'България', 'Bulgaria', 'bg-BG', 'BGN', 'bg-BG', ['bg']), profile('HR', 'Hrvatska', 'Croatia', 'hr-HR', 'EUR', 'hr-HR', ['hr']),
  profile('RS', 'Србија', 'Serbia', 'sr-RS', 'RSD', 'sr-RS', ['sr']), profile('IT', 'Italia', 'Italy', 'it-IT', 'EUR', 'it-IT', ['it']),
  profile('FR', 'France', 'France', 'fr-FR', 'EUR', 'fr-FR', ['fr']), profile('CH', 'Schweiz', 'Switzerland', 'de-CH', 'CHF', 'de-CH', ['de', 'fr', 'it']),
];

export const UNKNOWN_COUNTRY: CountryProfile = Object.freeze({
  countryCode: 'UNKNOWN', nativeName: 'Unbekannt', englishName: 'Unknown',
  defaultLocale: 'en-US', defaultCurrency: '', defaultDateLocale: 'en-US',
  supportedAppLanguages: ['en'] as AppLanguage[], enabled: false,
});
export const COUNTRY_REGISTRY: readonly CountryProfile[] = Object.freeze(profiles.map(profile => Object.freeze(profile)));

export function countryProfile(countryCode?: string): CountryProfile {
  const normalized = countryCode?.trim().toUpperCase();
  return COUNTRY_REGISTRY.find(profile => profile.countryCode === normalized) ?? UNKNOWN_COUNTRY;
}

export function searchCountries(query: string): readonly CountryProfile[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return COUNTRY_REGISTRY;
  return COUNTRY_REGISTRY.filter(profile =>
    [profile.countryCode, profile.nativeName, profile.englishName, ...profile.supportedAppLanguages]
      .some(value => value.toLocaleLowerCase().includes(needle)),
  );
}

export type DeviceLocaleCountrySuggestion = Readonly<{
  profile: CountryProfile;
  deviceLocale: string;
  reason: 'region_match' | 'language_home_country';
  persistence: 'suggestion_only';
}>;

/** Returns choices only; it deliberately has no write path and never changes a profile. */
export function suggestCountriesForDeviceLocales(deviceLocales: readonly string[]): readonly DeviceLocaleCountrySuggestion[] {
  const suggestions: DeviceLocaleCountrySuggestion[] = [];
  const seen = new Set<string>();
  for (const deviceLocale of deviceLocales) {
    const parts = deviceLocale.replace('_', '-').split('-');
    const language = parts[0]?.toLowerCase() as AppLanguage | undefined;
    const region = parts.find(part => /^[A-Za-z]{2}$/.test(part) && part.toUpperCase() !== parts[0]?.toUpperCase())?.toUpperCase();
    const direct = region ? countryProfile(region) : UNKNOWN_COUNTRY;
    const candidates = direct !== UNKNOWN_COUNTRY ? [[direct, 'region_match'] as const] :
      COUNTRY_REGISTRY.filter(profile => language && profile.supportedAppLanguages.includes(language)).map(profile => [profile, 'language_home_country'] as const);
    for (const [profile, reason] of candidates) {
      if (!seen.has(profile.countryCode)) {
        seen.add(profile.countryCode);
        suggestions.push(Object.freeze({ profile, deviceLocale, reason, persistence: 'suggestion_only' }));
      }
    }
  }
  return Object.freeze(suggestions);
}