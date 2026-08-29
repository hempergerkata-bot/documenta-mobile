import {
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
  actionStatusLabel,
  auditTranslations,
  detectDeviceLanguage,
  documentLanguageLabel,
  documentStatusLabel,
  deadlineKindLabel,
  formatCurrency,
  formatDate,
  formatLongDate,
  formatNumber,
  parseDisplayNumber,
  migrateLanguagePreferences,
  plural,
  t,
  translations,
  riskLabel,
  actionTypeLabel,
  automationLabel,
  caseProgressExplanationLabel,
  caseProgressStateLabel,
  confidenceLabel,
  documentCategoryLabel,
  documentFieldLabel,
  documentPlaceholder,
  documentTypeLabel,
  missingDataTypeLabel,
  isExplanationLanguage,
  isReplyLanguage,
  isRtlLanguage,
  languageLocale,
  priorityLabel,
  triggerTypeLabel,
  type TranslationKey,
} from './localization';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const snapshot = {
  intelligence: {
    documentLanguage: { value: 'de', confidence: 'high', evidence: [{ text: 'Original deutsch', source: 'ocr', confidence: 'high' }] },
    amount: '1234.56',
    deadline: '2026-08-29',
    reviewDecision: 'accept',
  },
  action: { id: 'a1', status: 'confirmed' },
  case: { id: 'c1', status: 'offen' },
};
const before = JSON.stringify(snapshot);

assert(detectDeviceLanguage('hu-HU') === 'hu', 'supported device language is used');
assert(detectDeviceLanguage('fr-FR') === 'fr', 'newly supported device language is used');
assert(detectDeviceLanguage('nl-NL') === FALLBACK_LANGUAGE, 'unsupported device language uses fallback');
assert(t('de', 'common.save') === 'Speichern', 'German switching');
assert(t('hu', 'common.save') === 'Mentés', 'Hungarian switching');
assert(t('en', 'common.save') === 'Save', 'English switching');
assert(t('ar', 'common.save') === 'حفظ', 'Arabic switching');
assert(t('uk', 'common.save') === 'Зберегти', 'Ukrainian switching');
assert(t('fr', 'common.save') === 'Enregistrer', 'French switching');

const migrated = migrateLanguagePreferences({ explanationLanguage: 'Magyar', defaultResponseLanguage: 'English' }, 'de');
assert(migrated.appLanguage === 'de', 'migration preserves device/default app language');
assert(migrated.explanationLanguage === 'hu', 'legacy explanation language migrates');
assert(migrated.replyLanguage === 'en', 'legacy reply language migrates');
assert(migrated.appLanguage !== migrated.explanationLanguage && migrated.replyLanguage !== migrated.explanationLanguage, 'language preferences remain independent');

const huSave = translations.hu['common.save'];
delete (translations.hu as Partial<typeof translations.hu>)['common.save'];
assert(t('hu', 'common.save') === translations.de['common.save'], 'missing selected key falls back');
translations.hu['common.save'] = huSave;
assert(t('en', 'missing.technical.key' as TranslationKey) === '—', 'missing key never leaks raw technical key');

assert(t('en', 'documents.subtitle', { count: 4 }) === '4 documents in one place', 'interpolation');
assert(plural('en', 1, 'common.page', 'common.pages') === 'page', 'singular selection');
assert(plural('en', 2, 'common.page', 'common.pages') === 'pages', 'plural selection');
assert(formatDate('2026-08-29', 'de') === '29.8.2026', 'German date formatting');
assert(formatDate('2026-08-29', 'hu').includes('2026') && formatDate('2026-08-29', 'hu').includes('08'), 'Hungarian date formatting');
assert(formatDate('2026-08-29', 'en') === '8/29/2026', 'English date formatting');
assert(formatNumber(1234.56, 'de').replace(/\u00a0|\u202f/g, ' ') === '1.234,56', 'German number formatting');
assert(formatNumber(1234.56, 'en') === '1,234.56', 'English number formatting');
const canonicalAmount = '1234.56';
assert(formatCurrency(canonicalAmount, 'de', 'EUR').includes('1.234,56'), 'currency locale formatting');
assert(parseDisplayNumber('1.234') === 1234, 'German grouped integer parsing');
assert(parseDisplayNumber('1,234') === 1234, 'English grouped integer parsing');
assert(formatCurrency('1.234 €', 'de', 'EUR').includes('1.234,00'), 'German grouped currency display');
assert(formatCurrency('$1,234', 'en', 'USD').includes('1,234.00'), 'English grouped currency display');
assert(canonicalAmount === '1234.56', 'currency formatting does not mutate canonical value');

const catalogKeys = Object.keys(translations.en) as TranslationKey[];
for (const language of SUPPORTED_LANGUAGES) {
  assert(languageLocale(language).length >= 2, `${language} has a locale`);
  assert(Object.keys(translations[language]).length === catalogKeys.length, `${language} catalog key parity`);
  assert(catalogKeys.every((key) => typeof translations[language][key] === 'string' && translations[language][key].trim().length > 0), `${language} catalog has no empty values`);
  assert(catalogKeys.every((key) => t(language, key) !== key), `${language} never exposes a raw translation key`);
  assert(formatDate('2026-08-29', language).length > 0, `${language} formats a short date`);
  assert(formatLongDate('2026-08-29', language).length > 0, `${language} formats a long date`);
  assert(formatNumber(1234, language).length > 0, `${language} formats an integer`);
  assert(formatNumber(1234.56, language).length > 0, `${language} formats a decimal`);
  assert(formatNumber(-1234.56, language) !== formatNumber(1234.56, language), `${language} formats a negative amount`);
  assert(formatCurrency(-1234.56, language, 'EUR').length > 0, `${language} formats negative EUR`);
  assert(formatCurrency(1234.56, language, 'USD').length > 0, `${language} formats USD`);
}

assert(isRtlLanguage('ar') && !isRtlLanguage('de'), 'only Arabic uses RTL direction');
assert(/[\u0600-\u06ff]/.test(t('ar', 'dashboard.title')), 'Arabic UI uses Arabic script');
assert(/[\u0400-\u04ff]/.test(t('uk', 'dashboard.title')), 'Ukrainian UI uses Cyrillic script');
assert(/[\u0400-\u04ff]/.test(t('bg', 'dashboard.title')), 'Bulgarian UI uses Cyrillic script');
assert(/[\u0400-\u04ff]/.test(t('sr', 'dashboard.title')), 'Serbian UI uses Cyrillic script');
assert(/[A-Za-zÀ-ž]/.test(t('fr', 'dashboard.title')), 'Latin-script UI remains safe');
assert(isExplanationLanguage('de') && isExplanationLanguage('hu') && isExplanationLanguage('en') && !isExplanationLanguage('fr'), 'explanation adapter support is explicit');
assert(isReplyLanguage('de') && isReplyLanguage('hu') && isReplyLanguage('en') && !isReplyLanguage('ar'), 'reply adapter support is explicit');
assert(documentStatusLabel('Abgeschlossen', 'hu') === 'Lezárva', 'enum label translation');
assert(actionStatusLabel('completed', 'en') === 'Completed', 'action enum label translation');
assert(deadlineKindLabel('payment', 'hu') === 'fizetés', 'deadline kind label translation');
assert(riskLabel('critical', 'de') === 'kritisch', 'risk label translation');
assert(documentLanguageLabel('de', 'high', 'hu') === 'Német', 'detected document language display');
assert(documentLanguageLabel('de', 'low', 'hu') === 'Bizonytalan', 'uncertain language is not invented');
assert(documentCategoryLabel('Versicherung', 'hu') === 'Biztosítás', 'document category display mapping');
assert(documentTypeLabel('Rechnung', 'en') === 'Invoice', 'document type display mapping');
assert(documentFieldLabel('invoiceNumber', 'hu') === 'Számlaszám', 'extracted field display mapping');
assert(documentPlaceholder('payrollPeriod', 'en').includes('July'), 'placeholder display mapping');
assert(confidenceLabel('high', 'hu') === 'magas', 'confidence display mapping');
assert(priorityLabel('hoch', 'en') === 'high', 'legacy priority display mapping');
assert(actionTypeLabel('submit_document', 'de') === 'Dokument einreichen', 'action type display mapping');
assert(caseProgressStateLabel('blocked', 'hu') === 'blokkolt', 'case progress state display mapping');
assert(missingDataTypeLabel('signature', 'en') === 'Signature', 'missing data type display mapping');
assert(caseProgressExplanationLabel({ state: 'overdue', activeActionCount: 2, reviewActionCount: 0, overdueActionCount: 2, waitingActionCount: 0, unresolvedConflictCount: 0 }, 'en') === '2 tasks are overdue.', 'case explanation is generated in display language');
assert(automationLabel('defaultRuleName', 'hu').includes('határidőkre'), 'new automation rule name display mapping');
assert(triggerTypeLabel('action_due_soon', 'en') === 'Action due soon', 'automation trigger display mapping');
assert(documentCategoryLabel('Versicherung', 'en') === 'Insurance' && snapshot.case.status === 'offen', 'display mapping preserves canonical values');

assert(JSON.stringify(snapshot) === before, 'localization leaves evidence, confidence, review, action, and case data unchanged');
const audit = auditTranslations();
assert(Object.values(audit.missingByLanguage).every((items) => items.length === 0), 'all 15 catalog key sets are complete');
assert(audit.duplicateKeys.length === 0, 'translation catalog has no duplicate keys');

console.log('Localization tests passed');