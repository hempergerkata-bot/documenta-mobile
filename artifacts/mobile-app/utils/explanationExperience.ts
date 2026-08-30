import type { AppLanguage, ExplanationSupportedLanguage } from './localization';
import { eligibleDeadlines, isMainAmountEligible, type DocumentIntelligenceResult, type Evidence } from './documentIntelligence';

export type TranslationMode = 'automatic_when_needed' | 'ask_first' | 'off';
export type ExplanationDisplayMode = 'text' | 'voice' | 'text_and_voice';
export type TranslationState = 'not_needed' | 'available' | 'requested' | 'completed' | 'unavailable' | 'disabled';
export type ExplanationRequestState = 'not_requested' | 'available' | 'needs_review' | 'generated' | 'unavailable';
export type ConfirmedDocumentFields = Readonly<Record<string, string | undefined>>;

export type TranslationDecision = Readonly<{ state: TranslationState; sourceLanguage: string; targetLanguage: string; shouldTranslate: boolean; confirmationRequired: boolean }>;
export function deriveTranslationState(sourceLanguage: string | undefined, targetLanguage: string, mode: TranslationMode, localTranslationAvailable = false): TranslationDecision {
  const source = sourceLanguage || 'unknown';
  if (source === targetLanguage) return { state: 'not_needed', sourceLanguage: source, targetLanguage, shouldTranslate: false, confirmationRequired: false };
  if (mode === 'off') return { state: 'disabled', sourceLanguage: source, targetLanguage, shouldTranslate: false, confirmationRequired: false };
  if (!localTranslationAvailable) return { state: 'unavailable', sourceLanguage: source, targetLanguage, shouldTranslate: false, confirmationRequired: false };
  if (mode === 'ask_first') return { state: 'available', sourceLanguage: source, targetLanguage, shouldTranslate: false, confirmationRequired: true };
  return { state: 'requested', sourceLanguage: source, targetLanguage, shouldTranslate: true, confirmationRequired: false };
}
export function deriveExplanationRequestState(language: AppLanguage, translation: TranslationDecision, hasIntelligence: boolean, reviewRequired = false, generated = false): ExplanationRequestState {
  if (!hasIntelligence || !isExplanationAdapterLanguage(language)) return 'unavailable';
  if (translation.confirmationRequired || reviewRequired) return 'needs_review';
  return generated ? 'generated' : 'available';
}
export function isExplanationAdapterLanguage(language: string): language is ExplanationSupportedLanguage {
  return language === 'de' || language === 'hu' || language === 'en';
}

export type QuestionIntent = 'identity' | 'sender' | 'recipient' | 'date' | 'amount' | 'deadline' | 'reference' | 'purpose' | 'payment_terms' | 'action' | 'reply' | 'uncertainty' | 'case' | 'change' | 'medical' | 'general';
export type SourceTrace = Readonly<{ field: string; source: 'confirmed' | 'intelligence'; evidence: readonly Evidence[] }>;
export type ExplanationAnswer = Readonly<{ intent: QuestionIntent; text: string; supported: boolean; sourceTrace: readonly SourceTrace[]; safetyNotice?: string }>;
const unsupported: Record<ExplanationSupportedLanguage, string> = {
  de: 'Dazu liegen in diesem Dokument keine bestätigten Informationen vor.',
  hu: 'Ehhez a dokumentumhoz nincs megerősített információ.',
  en: 'This document does not contain confirmed information about that.',
};
const certaintyCopy: Record<ExplanationSupportedLanguage, { certain: string; uncertain: string }> = {
  de: { certain: 'Laut Dokument', uncertain: 'Wahrscheinlich; dies ist nicht sicher bestätigt' },
  hu: { certain: 'A dokumentum szerint', uncertain: 'Valószínűleg; ez nincs biztosan megerősítve' },
  en: { certain: 'According to the document', uncertain: 'Probably; this is not confirmed with certainty' },
};
const labels: Record<ExplanationSupportedLanguage, Record<string, string>> = {
  de: { sender: 'Absender', recipient: 'Empfänger', date: 'Datum', amount: 'Betrag', deadline: 'Frist', reference: 'Referenz', purpose: 'Zweck', payment_terms: 'Zahlungsbedingung', action: 'Erforderliche Aktion', identity: 'Dokument', case: 'Fall', change: 'Änderung', reply: 'Antwort erforderlich' },
  hu: { sender: 'Feladó', recipient: 'Címzett', date: 'Dátum', amount: 'Összeg', deadline: 'Határidő', reference: 'Hivatkozási szám', purpose: 'Cél', payment_terms: 'Fizetési feltétel', action: 'Szükséges teendő', identity: 'Dokument', case: 'Ügy', change: 'Változás', reply: 'Válasz szükséges' },
  en: { sender: 'Sender', recipient: 'Recipient', date: 'Date', amount: 'Amount', deadline: 'Deadline', reference: 'Reference', purpose: 'Purpose', payment_terms: 'Payment terms', action: 'Required action', identity: 'Document', case: 'Case', change: 'Change', reply: 'Response required' },
};
export function classifyQuestionIntent(question: string): QuestionIntent {
  const q = question.toLowerCase();
  if (/(sender|absender|feladó)/.test(q)) return 'sender';
  if (/(recipient|empfänger|címzett)/.test(q)) return 'recipient';
  if (/(reference|referenz|invoice\s*(?:number|no)|customer\s*(?:number|no)|aktenzeichen|rechnungsnummer|kundennummer|hivatkoz|számlaszám|ügyfélszám)/.test(q)) return 'reference';
  if (/(purpose|zweck|worum|miről szól|célja)/.test(q)) return 'purpose';
  if (/(payment terms|zahlungsbeding|zahlungsziel|fizetési feltétel)/.test(q)) return 'payment_terms';
  if (/(deadline|frist|határid)/.test(q)) return 'deadline';
  if (/(amount|betrag|összeg|pay)/.test(q)) return 'amount';
  if (/(date|datum|dátum)/.test(q)) return 'date';
  if (/(reply|antwort|válasz)/.test(q)) return 'reply';
  if (/(uncertain|unsicher|bizonytalan)/.test(q)) return 'uncertainty';
  if (/(case|fall|ügy)/.test(q)) return 'case';
  if (/(change|änder|változ)/.test(q)) return 'change';
  if (/(medical|doctor|arzt|orvos|health)/.test(q)) return 'medical';
  if (/(action|do|aktion|teend)/.test(q)) return 'action';
  if (/(what|was|mi ez|identity|document)/.test(q)) return 'identity';
  return 'general';
}

type Candidate = { value?: string; field: string; evidence: readonly Evidence[] };
export function answerDocumentQuestion(result: DocumentIntelligenceResult, question: string, language: ExplanationSupportedLanguage, corrected: ConfirmedDocumentFields = {}): ExplanationAnswer {
  const intent = classifyQuestionIntent(question);
  const field = (key: string, candidate: Candidate): Candidate => corrected[key] ? { value: corrected[key], field: key, evidence: [] } : candidate;
  const identifier = result.identifiers?.value?.find(item => item.kind === 'reference' && item.validation !== 'invalid');
  const reference = result.dates.references?.value?.[0];
  const deadline = eligibleDeadlines(result)[0];
  const candidateFor: Record<QuestionIntent, Candidate> = {
    sender: field('sender', { value: result.parties.sender.value, field: 'sender', evidence: result.parties.sender.evidence }),
    recipient: field('recipient', { value: result.parties.recipient.value, field: 'recipient', evidence: result.parties.recipient.evidence }),
    date: field('documentDate', { value: result.dates.documentDate.value, field: 'documentDate', evidence: result.dates.documentDate.evidence }),
    amount: field('amount', { value: isMainAmountEligible(result) ? result.amounts.main.value : undefined, field: 'amount', evidence: result.amounts.main.evidence }),
    deadline: field('deadline', { value: deadline?.value, field: 'deadline', evidence: deadline?.evidence ?? [] }),
    reference: field('referenceNumber', { value: identifier?.value ?? reference, field: 'referenceNumber', evidence: identifier?.evidence ?? result.dates.references?.evidence ?? [] }),
    purpose: { value: result.taxonomy.purpose?.value, field: 'taxonomy.purpose', evidence: result.taxonomy.purpose?.evidence ?? [] },
    payment_terms: field('paymentTerms', { value: deadline?.value, field: 'paymentTerms', evidence: deadline?.evidence ?? [] }),
    action: { value: result.actions[0]?.requirement, field: 'action', evidence: result.actions[0]?.evidence ?? [] },
    reply: { value: result.responseNecessary.value === true ? labels[language].reply : undefined, field: 'responseNecessary', evidence: result.responseNecessary.evidence },
    uncertainty: { value: result.reviewRequired ? result.reviewReasons.join('; ') : undefined, field: 'reviewRequired', evidence: [] },
    case: { value: result.case.summary.value, field: 'case.summary', evidence: result.case.summary.evidence },
    change: { value: result.changes[0]?.description, field: 'changes', evidence: result.changes[0]?.evidence ?? [] },
    identity: { value: result.taxonomy.mainCategory.value, field: 'taxonomy.mainCategory', evidence: result.taxonomy.mainCategory.evidence },
    medical: { value: result.taxonomy.mainCategory.value === 'health' ? result.actionSummary : undefined, field: 'actionSummary', evidence: [] },
    general: { value: result.plainLanguageExplanation, field: 'plainLanguageExplanation', evidence: [] },
  };
  const candidate = candidateFor[intent];
  const confirmed = Boolean(corrected[candidate.field]);
  const confidence = confirmed ? 'high' : candidate.evidence[0]?.confidence ?? 'unknown';
  const critical = ['amount', 'deadline', 'reference', 'payment_terms', 'reply', 'case', 'change', 'medical'].includes(intent);
  const valid = Boolean(candidate.value) && (confirmed || candidate.evidence.length > 0) && (!critical || confidence === 'high' || confidence === 'medium');
  const category = result.taxonomy.mainCategory.value ?? '';
  const notices: string[] = [];
  if (intent === 'medical' || category === 'health') notices.push(language === 'de' ? 'Dies ist keine medizinische Beratung.' : language === 'hu' ? 'Ez nem orvosi tanács.' : 'This is not medical advice.');
  if (category === 'authority' || category === 'contract') notices.push(language === 'de' ? 'Dies ist keine Rechtsberatung.' : language === 'hu' ? 'Ez nem jogi tanács.' : 'This is not legal advice.');
  if (intent === 'amount' || /(?:invoice|finance|bank|tax|payment|rechnung|adó|számla)/i.test(category)) notices.push(language === 'de' ? 'Dies ist keine Finanzberatung. Zahlungsdaten bitte am Original prüfen.' : language === 'hu' ? 'Ez nem pénzügyi tanács. A fizetési adatokat ellenőrizd az eredeti dokumentumban.' : 'This is not financial advice. Verify payment details against the original document.');
  const safetyNotice = notices.length ? notices.join(' ') : undefined;
  if (!valid) return { intent, text: unsupported[language], supported: false, sourceTrace: [], safetyNotice };
  const certainty = confidence === 'high' ? certaintyCopy[language].certain : certaintyCopy[language].uncertain;
  return { intent, text: `${certainty}: ${labels[language][intent]}: ${candidate.value}`, supported: true, sourceTrace: [{ field: candidate.field, source: confirmed ? 'confirmed' : 'intelligence', evidence: candidate.evidence }], safetyNotice };
}

export type ConversationRecord = Readonly<{ documentId: string; threadId: string; id: string; role: 'user' | 'assistant'; text: string; createdAt: string }>;
export function selectConversation(records: readonly ConversationRecord[], documentId: string, threadId: string): readonly ConversationRecord[] {
  return records.filter(record => record.documentId === documentId && record.threadId === threadId);
}
export function resetConversation(records: readonly ConversationRecord[], documentId: string, threadId?: string): readonly ConversationRecord[] {
  return records.filter(record => record.documentId !== documentId || (threadId !== undefined && record.threadId !== threadId));
}