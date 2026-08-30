import { SUPPORTED_LANGUAGES, type AppLanguage } from './localization';

export type CapabilityStatus = 'full' | 'partial' | 'unsupported';
export type LanguageCapability =
  | 'ui'
  | 'documentRecognition'
  | 'explanation'
  | 'replies'
  | 'assistant'
  | 'tts';

export type LanguageCapabilities = Readonly<Record<LanguageCapability, CapabilityStatus>>;
export type LanguageCapabilityMatrix = Readonly<Record<AppLanguage, LanguageCapabilities>>;

const complete = (overrides: Partial<LanguageCapabilities> = {}): LanguageCapabilities => Object.freeze({
  ui: 'full',
  // OCR is device/script dependent and structured extraction is not validated equally in every language.
  documentRecognition: 'partial',
  explanation: 'unsupported',
  replies: 'unsupported',
  // Local search has multilingual terms, but complete intent coverage is only validated in the core languages.
  assistant: 'partial',
  // TTS is only available when the device reports a compatible, local voice at runtime.
  tts: 'partial',
  ...overrides,
});

const CORE_LANGUAGE_CAPABILITIES = complete({
  explanation: 'full',
  replies: 'full',
  assistant: 'full',
});

export const LANGUAGE_CAPABILITY_MATRIX: LanguageCapabilityMatrix = Object.freeze({
  de: CORE_LANGUAGE_CAPABILITIES,
  hu: CORE_LANGUAGE_CAPABILITIES,
  en: CORE_LANGUAGE_CAPABILITIES,
  ro: complete(),
  pl: complete(),
  sk: complete(),
  uk: complete(),
  tr: complete(),
  ar: complete(),
  cs: complete(),
  bg: complete(),
  hr: complete(),
  sr: complete(),
  it: complete(),
  fr: complete(),
});

export const LANGUAGE_CAPABILITIES: readonly LanguageCapability[] = Object.freeze([
  'ui',
  'documentRecognition',
  'explanation',
  'replies',
  'assistant',
  'tts',
]);

export function languageCapability(language: AppLanguage, capability: LanguageCapability): CapabilityStatus {
  return LANGUAGE_CAPABILITY_MATRIX[language][capability];
}

export function auditLanguageCapabilityMatrix(): string[] {
  const issues: string[] = [];
  for (const language of SUPPORTED_LANGUAGES) {
    const entry = LANGUAGE_CAPABILITY_MATRIX[language];
    if (!entry) {
      issues.push(`${language}: missing`);
      continue;
    }
    for (const capability of LANGUAGE_CAPABILITIES) {
      if (!['full', 'partial', 'unsupported'].includes(entry[capability])) issues.push(`${language}.${capability}: invalid`);
    }
  }
  return issues;
}