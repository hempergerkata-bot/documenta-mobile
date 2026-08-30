import type { DocumentIntelligenceResult } from './documentIntelligence';
import { SUPPORTED_LANGUAGES, t, type TranslationKey } from './localization';
import { primaryCanonicalAmount } from './canonicalDocument';

export type SearchIntent =
  | 'find_document' | 'find_case' | 'find_document_by_topic' | 'find_document_by_sender'
  | 'find_document_by_person' | 'find_document_by_amount' | 'find_document_by_date'
  | 'find_document_by_period' | 'find_document_by_action' | 'find_document_by_deadline'
  | 'find_related_documents' | 'summarize_document' | 'explain_document' | 'next_action'
  | 'compare_documents';
export type SearchConfidence = 'high' | 'medium' | 'low';
export type SearchContextMode = 'global' | 'document' | 'case';
export type SearchConversationContext = Readonly<{
  mode: SearchContextMode;
  documentId?: string;
  caseId?: string;
  lastResultDocumentIds: readonly string[];
  lastQuery?: string;
}>;
export type AssistantMessage = Readonly<{
  id: string; role: 'user' | 'assistant'; text: string; createdAt: string;
  contextMode: SearchContextMode; documentId?: string; caseId?: string; resultIds?: readonly string[];
}>;
export type SearchHistoryRecord = Readonly<{ id: string; query: string; createdAt: string; intent: SearchIntent; resultIds: readonly string[] }>;
export const SEARCH_INDEX_VERSION = 1;

export type SearchDocument = Readonly<{
  id: string; title: string; sender?: string; recipient?: string; category?: string; subcategory?: string;
  documentType?: string; documentDate?: string; receivedDate?: string; importedAt?: string; createdAt?: string;
  dueDate?: string; amount?: string; person?: string; profileIds?: readonly string[]; status?: string;
  tags?: readonly string[]; note?: string; ocrText?: string; lifecycle?: string; archiveYear?: number;
  caseOriginYear?: number; relevantPeriodStart?: string; relevantPeriodEnd?: string;
  intelligence?: DocumentIntelligenceResult; intelligenceReviewDecisions?: Readonly<Record<string, string>>;
  cloudIntelligence?: { canonical?: { summary: string | null; mainContent: string | null; actions: string[]; dueDates: Array<{ value: string }>; amounts: Array<{ literal: string }>; references: Array<{ value: string }>; sender: string | null; recipient: string | null } };
}>;
export type SearchProfile = Readonly<{ id: string; name: string }>;
export type SearchCase = Readonly<{ id: string; title: string; documentIds: readonly string[]; profileIds?: readonly string[]; status?: string; dueDate?: string }>;
export type SearchRelationship = Readonly<{ fromDocumentId: string; toDocumentId: string; kind?: string }>;
export type SearchAction = Readonly<{ id: string; documentId?: string; title: string; status?: string; dueDate?: string; confidence?: string; userConfirmed?: boolean }>;
export type SearchLibrary = Readonly<{ documents: readonly SearchDocument[]; profiles?: readonly SearchProfile[]; cases?: readonly SearchCase[]; relationships?: readonly SearchRelationship[]; actions?: readonly SearchAction[] }>;
export type SearchIndexEntry = Readonly<{ id: string; document: SearchDocument; searchableText: string; concepts: readonly string[]; profileNames: readonly string[]; caseIds: readonly string[]; hasEvidence: boolean }>;
export type AssistantCanonicalFacts = Readonly<{ summary?: string; amount?: string; deadline?: string; action?: string }>;
export type SearchQueryOptions = Readonly<{
  referenceDate?: string; includeArchived?: boolean; topK?: number; scope?: SearchContextMode;
  documentId?: string; caseId?: string; profileId?: string; year?: number; fromYear?: number; toYear?: number;
  context?: SearchConversationContext;
  index?: readonly SearchIndexEntry[];
}>;
export type SuggestedQuestion = 'summary' | 'deadline' | 'action' | 'related' | 'change' | 'uncertainty';
export type SearchResult = Readonly<{
  kind: 'document' | 'case' | 'action';
  id: string; title: string; document?: SearchDocument; case?: SearchCase; action?: SearchAction;
  score: number; confidence: SearchConfidence; matchedFields: readonly string[]; signals: readonly string[];
  why: readonly string[]; archived: boolean;
}>;
export type SearchResponse = Readonly<{
  query: string; intent: SearchIntent; results: readonly SearchResult[]; topResults: readonly SearchResult[];
  moreAvailable: boolean; ambiguous: boolean; zeroResult: boolean; resolvedDocumentId?: string;
  resolvedCaseId?: string; comparisonDocumentIds?: readonly [string, string]; referenceResolved: boolean; suggestedQuestions: readonly SuggestedQuestion[];
}>;
export interface SemanticSearchAdapter {
  readonly kind: 'deterministic-local';
  search(library: SearchLibrary, query: string, options?: SearchQueryOptions): SearchResponse;
}

type Concept = 'debt' | 'medical' | 'bank' | 'insurance' | 'tax' | 'school' | 'daycare' | 'contract' | 'invoice' | 'deadline' | 'letter' | 'payment' | 'authority' | 'change';
type ConceptRegistry = Readonly<Record<string, readonly string[]>>;
export const SEARCH_CONCEPTS: ConceptRegistry = Object.freeze({
  debt: ['tartozás', 'követelés', 'inkasszó', 'inkasszo', 'debitor', 'forderung', 'inkasso', 'schuld', 'debt', 'collection', 'dług', 'długów', 'rozhodnutie', 'poplatok', 'dug', 'duгу', 'борг', 'borç', 'دين', 'deuda', 'dette'],
  medical: ['orvos', 'orvosi', 'egészségügyi', 'egeszsegugyi', 'arzt', 'medizin', 'medical', 'doctor', 'medic', 'lekar', 'медич', 'doktor', 'médecin', 'medico'],
  bank: ['bank', 'bankos', 'banka', 'банка', 'banco', 'banque', 'bankowy', 'bancario'],
  insurance: ['biztosítás', 'biztositas', 'versicherung', 'insurance', 'asigurare', 'ubezpieczenie', 'poisťovňa', 'poistovna', 'страхування', 'sigorta', 'تأمين', 'pojištění', 'pojisteni', 'застраховка', 'osiguranje', 'осигурање', 'assurance', 'assicurazione'],
  tax: ['adó', 'ado', 'steuer', 'tax', 'impozit', 'podatek', 'daň', 'подат', 'vergi', 'ضريب', 'porez', 'imposta', 'impôt'],
  school: ['iskola', 'iskolai', 'schule', 'school', 'școală', 'szkoła', 'škola', 'школ', 'okul', 'مدرسة', 'škola', 'scuola', 'école'],
  daycare: ['kita', 'óvoda', 'ovoda', 'kindergarten', 'asilo', 'grădiniță', 'przedszkole', 'ясли', 'vrtić', 'vrtić', 'asilo nido', 'crèche'],
  contract: ['szerződés', 'szerzodes', 'vertrag', 'contract', 'umowa', 'zmluva', 'договор', 'sözleşme', 'عقد', 'ugovor', 'contratto', 'contrat'],
  invoice: ['számla', 'szamla', 'rechnung', 'invoice', 'factură', 'faktura', 'faktúra', 'рахун', 'fatura', 'فاتورة', 'račun', 'fattura', 'facture'],
  deadline: ['határidő', 'hatarido', 'meddig', 'mikorra', 'frist', 'deadline', 'due', 'scadență', 'termin', 'срок', 'son tarih', 'مهلة', 'rok', 'scadenza', 'échéance'],
  letter: ['levél', 'level', 'irat', 'papír', 'papir', 'dokumentum', 'document', 'letter', 'brief', 'schreiben', 'scrisoare', 'list', 'dopís', 'лист', 'mektup', 'رسالة', 'pismo', 'lettera', 'lettre'],
  payment: ['fizet', 'kifizet', 'fizetve', 'rendezett', 'rendezve', 'payment', 'paid', 'settled', 'zahlung', 'bezahlt', 'payable', 'plată', 'płat', 'platba', 'плат', 'ödeme', 'دفع', 'plać', 'pagamento', 'paiement'],
  authority: ['hatóság', 'hatosag', 'amt', 'behörde', 'authority', 'autoritate', 'urząd', 'úrad', 'відомств', 'kurum', 'جهة', 'uprava', 'autorità', 'administration'],
  change: ['változ', 'valtoz', 'módos', 'modos', 'changed', 'change', 'geändert', 'geandert', 'modyfik', 'змін', 'değiş', 'تغير', 'promjen', 'cambi', 'modif'],
});

const INTENT_WORDS: readonly [SearchIntent, readonly string[]][] = [
  ['summarize_document', ['mi volt benne', 'mi a lényeg', 'lényeg', 'what was in', 'zusammenfassung', 'összefoglal']],
  ['explain_document', ['mit jelent', 'magyarázd', 'egyszerűen', 'explain', 'meaning', 'bedeutet']],
  ['next_action', ['mit kell', 'teendő', 'csinálnom', 'kell erre válasz', 'what do i need', 'next step', 'was muss', 'action']],
  ['find_related_documents', ['kapcsolódó', 'előző levél', 'másik papír', 'related', 'previous letter', 'verknüpft']],
  ['compare_documents', ['mi változott', 'előzőhöz képest', 'compare', 'changed from', 'unterschied']],
  ['find_case', ['melyik ügy', 'milyen ügy', 'nyitott ügy', 'case', 'fall', 'ügyhöz']],
  ['find_document_by_deadline', ['határidő', 'meddig', 'mikorra', 'deadline', 'frist', 'scadență']],
  ['find_document_by_amount', ['mennyi', 'összeg', 'euró', 'euro', 'forint', 'amount', 'betrag', '500', '59']],
  ['find_document_by_period', ['évben', 'tavaly', 'idén', 'múlt év', 'between 20', 'year', 'jahr', 'anul']],
  ['find_document_by_date', ['ma', 'tegnap', 'múlt héten', 'múlt hónapban', 'date', 'datum', 'gestern']],
  ['find_document_by_action', ['kifizet', 'rendezett action', 'feladat', 'task', 'action', 'bezahl']],
  ['find_document_by_person', ['-s papír', 'profil', 'hozzá tartoz', 'person', 'für amy', 'für mich']],
  ['find_document_by_sender', ['küldött', 'feladó', 'attól a', 'sender', 'von ', 'expéditeur']],
  ['find_document_by_topic', ['papír', 'levél', 'dolog', 'izé', 'document', 'letter']],
];
const LOCALIZED_INTENT_KEYS: readonly [SearchIntent, TranslationKey][] = [
  ['summarize_document', 'assistant.questionSummary'],
  ['find_document_by_deadline', 'assistant.questionDeadline'],
  ['next_action', 'assistant.questionAction'],
  ['find_related_documents', 'assistant.questionRelated'],
  ['compare_documents', 'assistant.questionChange'],
  ['explain_document', 'assistant.questionUncertainty'],
];
const NEGATION_WORDS = ['nem', 'nincs', 'ne ', 'not', 'no ', 'nicht', 'kein', 'nu ', 'nie ', 'не ', 'не́', 'non ', 'pas ', 'لا '];
const tokenize = (value: string) => normalize(value).split(' ').filter(Boolean);
export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9\u0400-\u04ff\u0600-\u06ff]+/gi, ' ').replace(/\s+/g, ' ').trim();
}
function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = current;
    }
  }
  return row[b.length];
}
function closeToken(query: string, candidate: string): boolean {
  return query === candidate || (query.length >= 4 && candidate.length >= 4 && levenshtein(query, candidate) <= (query.length > 6 ? 2 : 1));
}
function conceptsFor(text: string): Concept[] {
  const normalized = normalize(text); const inputTokens = tokenize(text);
  return (Object.entries(SEARCH_CONCEPTS) as [Concept, readonly string[]][]).filter(([, words]) => words.some(word => {
    const normalizedWord = normalize(word);
    return normalized.includes(normalizedWord) || (normalizedWord.length >= 4 && inputTokens.some(token => closeToken(token, normalizedWord)));
  })).map(([concept]) => concept);
}
function factText(document: SearchDocument, profiles: readonly SearchProfile[]): string {
  const intelligence = document.intelligence;
  const fields = [
    document.title, document.sender, document.recipient, document.category, document.subcategory, document.documentType,
    document.documentDate, document.receivedDate, document.importedAt, document.dueDate, document.amount, document.person,
    ...(document.tags ?? []), document.note, document.ocrText, String(document.archiveYear ?? ''), String(document.caseOriginYear ?? ''),
    document.relevantPeriodStart, document.relevantPeriodEnd, ...(document.profileIds ?? []).map(id => profiles.find(profile => profile.id === id)?.name),
    intelligence?.taxonomy?.mainCategory?.value, intelligence?.taxonomy?.subtype?.value, intelligence?.taxonomy?.purpose?.value,
    intelligence?.parties?.sender?.value, intelligence?.parties?.recipient?.value, intelligence?.dates?.documentDate?.value,
    intelligence?.amounts?.main?.value, ...(intelligence?.deadlines?.map(item => item.value) ?? []), ...(intelligence?.actions?.map(item => item.requirement) ?? []),
    intelligence?.case?.summary?.value, intelligence?.plainLanguageExplanation, intelligence?.actionSummary, intelligence?.deadlineSummary,
    document.cloudIntelligence?.canonical?.summary, document.cloudIntelligence?.canonical?.mainContent,
    document.cloudIntelligence?.canonical?.sender, document.cloudIntelligence?.canonical?.recipient,
    ...(document.cloudIntelligence?.canonical?.actions ?? []), ...(document.cloudIntelligence?.canonical?.references?.map(item => item.value) ?? []),
    ...(document.cloudIntelligence?.canonical?.amounts?.map(item => item.literal) ?? []),
    ...(document.cloudIntelligence?.canonical?.dueDates?.map(item => item.value) ?? []),
  ];
  return normalize(fields.filter(Boolean).join(' '));
}
function dateValues(document: SearchDocument): string[] {
  return [document.documentDate, document.receivedDate, document.importedAt, document.createdAt, document.cloudIntelligence?.canonical?.dueDates[0]?.value, document.dueDate, document.relevantPeriodStart, document.relevantPeriodEnd].filter((value): value is string => Boolean(value));
}
function yearIn(value: string | undefined, year: number): boolean { return Boolean(value && new RegExp(`(?:^|[^0-9])${year}(?:[^0-9]|$)`).test(value)); }
function parsedAmount(value: string): { number: number; currency?: string } | undefined {
  if (!value) return undefined; const match = value.match(/(\d[\d\s.'’]*(?:[.,]\d{1,2})?)/); if (!match) return undefined;
  const compact = match[1].replace(/[\s'’]/g, ''); const comma = compact.lastIndexOf(','); const dot = compact.lastIndexOf('.');
  const decimalIndex = comma >= 0 && dot >= 0 ? Math.max(comma, dot) : comma >= 0 && compact.length - comma <= 3 ? comma : dot >= 0 && compact.length - dot <= 3 ? dot : -1;
  const digits = compact.replace(/[.,]/g, ''); const normalizedNumber = decimalIndex < 0 ? digits : `${compact.slice(0, decimalIndex).replace(/[.,]/g, '')}.${compact.slice(decimalIndex + 1).replace(/[.,]/g, '')}`;
  const number = Number(normalizedNumber); if (!Number.isFinite(number)) return undefined;
  const currency = /€|eur/i.test(value) ? 'EUR' : /ft|huf/i.test(value) ? 'HUF' : /chf/i.test(value) ? 'CHF' : /usd|\$/i.test(value) ? 'USD' : undefined;
  return { number, currency };
}
function queryAmount(query: string): { number: number; currency?: string; approximate: boolean } | undefined {
  const match = query.match(/(?:kb\.?|ca\.?|approximately|about|circa)?\s*(\d[\d\s.'’]*(?:[.,]\d{1,2})?)\s*(eur|euro|€|huf|ft|chf|usd|\$)?/i);
  if (!match) return undefined; const parsed = parsedAmount(match[1]); if (!parsed) return undefined; const number = parsed.number;
  if (!match[2] && !/(mennyi|osszeg|összeg|amount|betrag|payment|fizet|zahl|plat|pagamento|paiement)/i.test(query)) return undefined;
  const currency = /eur|euro|€/i.test(match[2] ?? '') ? 'EUR' : /huf|ft/i.test(match[2] ?? '') ? 'HUF' : /chf/i.test(match[2] ?? '') ? 'CHF' : /usd|\$/i.test(match[2] ?? '') ? 'USD' : undefined;
  return { number, currency, approximate: /kb|ca|approximately|about|circa/i.test(match[0]) };
}
function queryYears(query: string, referenceDate?: string): { years: number[]; from?: number; to?: number } {
  const years = [...query.matchAll(/\b(20\d{2})\b/g)].map(match => Number(match[1]));
  const range = query.match(/\b(20\d{2})\s*(?:-|–|bis|és|and|to|a)\s*(20\d{2})\b/i);
  if (range) return { years, from: Number(range[1]), to: Number(range[2]) };
  const currentYear = referenceDate ? Number(referenceDate.slice(0, 4)) : undefined;
  if (currentYear && /(tavaly|múlt év|last year|letztes jahr|lani|anul trecut|去年)/i.test(query)) years.push(currentYear - 1);
  if (currentYear && /(idén|this year|dieses jahr|anul acesta)/i.test(query)) years.push(currentYear);
  return { years: [...new Set(years)] };
}
function queryDateRange(query: string, referenceDate?: string): { from?: string; to?: string } {
  const base = referenceDate ? new Date(`${referenceDate}T00:00:00Z`) : undefined;
  if (!base || Number.isNaN(base.valueOf())) return {};
  if (/(tegnap|yesterday|gestern|ieri|wczoraj)/i.test(query)) { const day = new Date(base); day.setUTCDate(day.getUTCDate() - 1); const date = day.toISOString().slice(0, 10); return { from: date, to: date }; }
  if (/(múlt héten|last week|letzte woche|săptămâna trecută)/i.test(query)) { const to = new Date(base); to.setUTCDate(to.getUTCDate() - 1); const from = new Date(to); from.setUTCDate(from.getUTCDate() - 6); return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }; }
  if (/(múlt hónapban|last month|letzten monat|luna trecută)/i.test(query)) { const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - 1, 1)); const to = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 0)); return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }; }
  if (/(ma|today|heute|astăzi)/i.test(query)) { const date = base.toISOString().slice(0, 10); return { from: date, to: date }; }
  return {};
}
const MONTH_WORDS: readonly (readonly string[])[] = [
  [], ['jan','januar','january','januarie','styczen','ocak','يناير','leden','януари','sijecanj','gennaio','janvier'],
  ['feb','februar','february','februarie','luty','unor','subat','فبراير','февруари','veljaca','febbraio','fevrier'],
  ['mar','marz','march','martie','marzec','marec','березень','mart','مارس','brezen','март','ozujak','marzo','mars'],
  ['apr','april','kwiecien','duben','квітень','nisan','أبريل','април','travanj','aprile','avril'],
  ['may','mai','maj','травень','mayis','مايو','kveten','май','svibanj','maggio'],
  ['jun','juni','june','iunie','czerwiec','червень','haziran','يونيو','cerven','юни','lipanj','giugno','juin'],
  ['jul','juli','july','iulie','lipiec','липень','temmuz','يوليو','cervenec','юли','srpanj','luglio','juillet'],
  ['aug','august','sierpien','серпень','agustos','أغسطس','srpen','август','kolovoz','agosto','aout'],
  ['sep','september','wrzesien','сентябрь','eylul','سبتمبر','zari','септември','rujan','settembre','septembre'],
  ['oct','okt','oktober','october','octombrie','pazdziernik','жовтень','ekim','أكتوبر','rijen','октомври','ottobre','octobre'],
  ['nov','november','listopad','листопад','kasim','نوفمبر','ноември','studeni','novembre'],
  ['dec','dez','dezember','december','grudzien','грудень','aralik','ديسمبر','prosinec','декември','prosinac','dicembre','decembre'],
];
function canonicalSearchDate(value: string): string | undefined {
  const numeric = value.trim().match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$|^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (numeric) {
    const year = Number(numeric[1] ?? numeric[6]); const month = Number(numeric[2] ?? numeric[5]); const day = Number(numeric[3] ?? numeric[4]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate()) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const text = normalize(value).match(/(\d{1,2})\s+([^\d\s]+)\s+(\d{4})/); if (!text) return undefined;
  const month = MONTH_WORDS.findIndex(words => words.includes(text[2])); const day = Number(text[1]); const year = Number(text[3]);
  if (!month || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function classifySearchIntent(query: string): SearchIntent {
  const normalized = normalize(query);
  for (const [intent, key] of LOCALIZED_INTENT_KEYS) {
    if (SUPPORTED_LANGUAGES.some(language => normalized.includes(normalize(t(language, key))))) return intent;
  }
  for (const [intent, words] of INTENT_WORDS) {
    if (intent === 'find_document_by_topic' && /\b20\d{2}\b/.test(normalized)) return 'find_document_by_period';
    if (words.some(word => normalized.includes(normalize(word)))) return intent;
  }
  if (/\b20\d{2}\b/.test(normalized)) return 'find_document_by_period';
  const concepts = conceptsFor(query);
  if (concepts.includes('deadline')) return 'find_document_by_deadline';
  if (concepts.includes('medical') || concepts.includes('bank') || concepts.includes('insurance') || concepts.includes('tax')) return 'find_document_by_topic';
  return 'find_document';
}
export function buildSearchIndex(library: SearchLibrary): readonly SearchIndexEntry[] {
  const profiles = library.profiles ?? []; const cases = library.cases ?? [];
  return Object.freeze(library.documents.filter(document => document.lifecycle !== 'papierkorb').map(document => Object.freeze({
    id: document.id, document, searchableText: factText(document, profiles), concepts: conceptsFor(factText(document, profiles)),
    profileNames: (document.profileIds ?? []).map(id => profiles.find(profile => profile.id === id)?.name).filter((value): value is string => Boolean(value)),
    caseIds: cases.filter(item => item.documentIds.includes(document.id)).map(item => item.id),
    hasEvidence: Boolean(document.intelligence && (document.intelligence.parties?.sender?.evidence?.length || document.intelligence.taxonomy?.mainCategory?.evidence?.length || document.intelligence.plainLanguageExplanation)),
  })));
}
export function assistantCanonicalFacts(document: Pick<SearchDocument, 'cloudIntelligence'>): AssistantCanonicalFacts {
  const canonical = document.cloudIntelligence?.canonical;
  return {
    summary: canonical?.summary ?? canonical?.mainContent ?? undefined,
    amount: canonical ? primaryCanonicalAmount(canonical.amounts)?.literal : undefined,
    deadline: canonical?.dueDates[0]?.value,
    action: canonical?.actions[0],
  };
}
function dateWithin(dateValuesToCheck: readonly string[], from?: string, to?: string): boolean {
  if (!from || !to) return false; return dateValuesToCheck.some(value => { const date = canonicalSearchDate(value); return Boolean(date && date >= from && date <= to); });
}
function confidence(score: number): SearchConfidence { return score >= 8 ? 'high' : score >= 4 ? 'medium' : 'low'; }
function matchesScope(entry: SearchIndexEntry, options: SearchQueryOptions, library: SearchLibrary): boolean {
  const document = entry.document;
  if (options.includeArchived === false && document.lifecycle === 'archiviert') return false;
  if (options.documentId && document.id !== options.documentId) return false;
  if (options.caseId && !entry.caseIds.includes(options.caseId)) return false;
  if (options.profileId && !(document.profileIds ?? []).includes(options.profileId)) return false;
  if (options.year && !dateValues(document).some(value => yearIn(value, options.year!))) return false;
  if (options.fromYear || options.toYear) {
    const years = dateValues(document).map(value => Number(value.slice(0, 4))).filter(Number.isFinite);
    if (!years.some(year => year >= (options.fromYear ?? 0) && year <= (options.toYear ?? 9999))) return false;
  }
  if (options.scope === 'case' && options.caseId && !(library.cases ?? []).some(item => item.id === options.caseId && item.documentIds.includes(document.id))) return false;
  return true;
}
function documentResult(entry: SearchIndexEntry, score: number, matchedFields: string[], signals: string[]): SearchResult {
  const archived = entry.document.lifecycle === 'archiviert';
  return { kind: 'document', id: entry.id, title: entry.document.title, document: entry.document, score, confidence: confidence(score), matchedFields: [...new Set(matchedFields)], signals: [...new Set(signals)], why: [...new Set(signals)].slice(0, 4), archived };
}
function relatedIds(documentId: string, relationships: readonly SearchRelationship[], cases: readonly SearchCase[]): string[] {
  const result = new Set<string>(cases.filter(item => item.documentIds.includes(documentId)).flatMap(item => item.documentIds));
  relationships.forEach(item => { if (item.fromDocumentId === documentId) result.add(item.toDocumentId); if (item.toDocumentId === documentId) result.add(item.fromDocumentId); });
  result.delete(documentId); return [...result];
}
export function searchLocal(library: SearchLibrary, query: string, options: SearchQueryOptions = {}): SearchResponse {
  const cleanQuery = query.trim(); const intent = classifySearchIntent(cleanQuery); const index = options.index ?? buildSearchIndex(library);
  const profiles = library.profiles ?? []; const normalized = normalize(cleanQuery); const queryTokens = tokenize(cleanQuery);
  const concepts = conceptsFor(cleanQuery); const years = queryYears(cleanQuery, options.referenceDate); const dateRange = queryDateRange(cleanQuery, options.referenceDate);
  const amount = queryAmount(cleanQuery); const negative = NEGATION_WORDS.some(word => normalized.includes(normalize(word)));
  const context = options.context; const contextualIntents: readonly SearchIntent[] = ['summarize_document', 'explain_document', 'next_action', 'find_related_documents', 'compare_documents', 'find_document_by_deadline', 'find_document_by_action'];
  const referenceId = context?.documentId && (contextualIntents.includes(intent) || /(?:ebben|abban|ezzel|azzal|ez a levél|az előző|az a dokumentum|mi volt benne|mit jelent|what was in|this document)/i.test(cleanQuery)) ? context.documentId : undefined;
  const seedOnlyIntent = intent !== 'find_related_documents' && intent !== 'compare_documents';
  const scoped = { ...options, documentId: options.documentId ?? (seedOnlyIntent ? referenceId : undefined) };
  const documentResults = index.filter(entry => matchesScope(entry, scoped, library)).map(entry => {
    const document = entry.document; let score = 0; const fields: string[] = []; const signals: string[] = [];
    const searchableTokens = tokenize(entry.searchableText);
      const canonical = document.cloudIntelligence?.canonical;
    const fieldValues: Array<[string, string | undefined, number]> = [
      ['title', document.title, 4], ['sender', document.sender, 5], ['recipient', document.recipient, 4], ['person', document.person, 5],
      ['category', `${document.category} ${document.subcategory} ${document.documentType}`, 3], ['ocr', document.ocrText, 2], ['case', undefined, 3],
        ['canonical', [
          canonical?.summary, canonical?.mainContent, canonical?.sender, canonical?.recipient,
          ...(canonical?.actions ?? []), ...(canonical?.references?.map(item => item.value) ?? []),
          ...(canonical?.amounts?.map(item => item.literal) ?? []), ...(canonical?.dueDates?.map(item => item.value) ?? []),
        ].filter(Boolean).join(' '), 5],
    ];
    fieldValues.forEach(([field, value, weight]) => {
      const tokens = tokenize(value ?? ''); const matches = queryTokens.filter(queryToken => tokens.some(token => closeToken(queryToken, token)));
      if (matches.length) { score += weight + Math.min(2, matches.length - 1); fields.push(field); signals.push(`${field} match`); }
    });
    const matchedConcepts = concepts.filter(concept => entry.concepts.includes(concept));
    matchedConcepts.forEach(concept => { score += concept === 'letter' ? 1 : 3; fields.push('topic'); signals.push(`${concept} topic`); });
    if (entry.caseIds.length && (concepts.includes('debt') || intent === 'find_case' || intent === 'find_related_documents')) { score += 2; fields.push('case'); signals.push('case relation'); }
    years.years.forEach(year => {
      if (dateValues(document).some(value => yearIn(value, year))) { score += 3; fields.push('date'); signals.push(`document/received year ${year}`); }
      if (yearIn(document.relevantPeriodStart, year) || yearIn(document.relevantPeriodEnd, year) || document.caseOriginYear === year) { score += 3; fields.push('period'); signals.push(`relevant period ${year}`); }
      if (/archiv/i.test(normalized) && document.archiveYear === year) { score += 3; fields.push('archiveYear'); signals.push(`archive year ${year}`); }
    });
    if (years.from !== undefined && years.to !== undefined && dateValues(document).some(value => { const year = Number(value.slice(0, 4)); return year >= years.from! && year <= years.to!; })) { score += 4; fields.push('period'); signals.push('period range match'); }
    if (dateWithin(dateValues(document), dateRange.from, dateRange.to)) { score += 4; fields.push('date'); signals.push('canonical date match'); }
    if (amount) { const actual = parsedAmount(document.cloudIntelligence?.canonical?.amounts[0]?.literal ?? document.amount ?? document.intelligence?.amounts?.main?.value ?? ''); if (actual && (!amount.currency || actual.currency === amount.currency)) { const difference = Math.abs(actual.number - amount.number); const tolerance = amount.approximate ? Math.max(10, amount.number * 0.1) : 0.009; if (difference <= tolerance) { score += difference < 0.01 ? 6 : 4; fields.push('amount'); signals.push('currency-aware amount match'); } } }
    if (options.context?.documentId === document.id) { score += 5; signals.push('conversation context'); fields.push('context'); }
    if (referenceId === document.id) { score += 6; signals.push('resolved reference'); fields.push('context'); }
    const profileNames = entry.profileNames.map(normalize); if (profiles.some(profile => profileNames.includes(normalize(profile.name)) && normalized.includes(normalize(profile.name)))) { score += 5; fields.push('profile'); signals.push('profile match'); }
    if (concepts.includes('payment')) {
      const completed = /abgeschlossen|bezahlt|paid|completed|rendezett/i.test(document.status ?? '');
      const payable = /zu bezahlen|offen|unpaid|payable|fizet/i.test(document.status ?? '');
      if (negative) { if (payable) { score += 3; fields.push('status'); signals.push('unpaid status'); } if (completed) score -= 6; }
      else if (completed) { score += 3; fields.push('status'); signals.push('completed payment state'); }
    }
    if (intent === 'find_document_by_deadline' && ((document.dueDate || document.intelligence?.deadlines?.some(item => Boolean(item.value))))) { score += 3; fields.push('deadline'); signals.push('deadline evidence'); }
    if (intent === 'find_document_by_action' && (document.intelligence?.actions?.length || library.actions?.some(action => action.documentId === document.id))) { score += 3; fields.push('action'); signals.push('action state'); }
    if (intent === 'find_document_by_person' && document.profileIds?.length) { score += 2; fields.push('profile'); }
    if (intent === 'find_document_by_sender' && document.sender) { score += 1; fields.push('sender'); }
    if (intent === 'find_document_by_topic' && matchedConcepts.some(concept => concept !== 'letter')) score += 2;
    if (score <= 0) return undefined;
    return documentResult(entry, score, fields, signals);
  }).filter((result): result is SearchResult => Boolean(result));
  const caseResults: SearchResult[] = (library.cases ?? []).filter(item => !options.caseId || item.id === options.caseId).flatMap(item => {
    const matchingDocs = documentResults.filter(result => item.documentIds.includes(result.id)); const score = matchingDocs.reduce((sum, result) => sum + result.score, 0) + (normalized.includes(normalize(item.title)) ? 5 : 0);
    if (intent !== 'find_case' || score <= 0) return []; return [{ kind: 'case', id: item.id, title: item.title, case: item, score, confidence: confidence(score), matchedFields: ['case'], signals: ['case title/document relation'], why: ['case relation'], archived: false }];
  });
  const actionResults: SearchResult[] = intent === 'find_document_by_action' ? (library.actions ?? []).flatMap(action => {
    const result = documentResults.find(item => item.id === action.documentId); return result ? [{ kind: 'action' as const, id: action.id, title: action.title, action, score: result.score + 2, confidence: confidence(result.score + 2), matchedFields: ['action'], signals: ['action state'], why: ['linked action'], archived: false }] : [];
  }) : [];
  let results = [...documentResults, ...caseResults, ...actionResults].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  if (intent === 'find_case') results = caseResults;
  if ((intent === 'find_related_documents' || intent === 'compare_documents') && context?.documentId) {
    const ids = relatedIds(context.documentId, library.relationships ?? [], library.cases ?? []);
    results = ids.map(id => index.find(entry => entry.id === id)).filter((entry): entry is SearchIndexEntry => Boolean(entry))
      .map(entry => documentResult(entry, 9, ['relationship'], ['explicit document/case relation']));
  }
  results = results.filter(result => result.confidence !== 'low');
  const topK = options.topK ?? 5; const topResults = results.slice(0, topK); const topScore = topResults[0]?.score ?? 0;
  const ambiguous = topResults.length > 1 && topResults[0].confidence !== 'low' && topResults[1].score >= topScore - 2;
  const comparisonDocumentIds = intent === 'compare_documents' && context?.documentId && !ambiguous && topResults[0]?.kind === 'document' ? [context.documentId, topResults[0].id] as const : undefined;
  const resolvedDocumentId = intent === 'compare_documents' ? context?.documentId : !ambiguous && topResults[0]?.kind === 'document' ? topResults[0].id : undefined;
  const resolvedCaseId = !ambiguous && topResults[0]?.kind === 'case' ? topResults[0].id : undefined;
  const suggestions: SuggestedQuestion[] = intent === 'find_document' || intent === 'find_document_by_topic' ? ['summary', 'action', 'deadline', 'related'] : [];
  return { query: cleanQuery, intent, results, topResults, moreAvailable: results.length > topK, ambiguous, zeroResult: results.length === 0, resolvedDocumentId, resolvedCaseId, comparisonDocumentIds, referenceResolved: Boolean(referenceId), suggestedQuestions: suggestions };
}
export const deterministicSearchAdapter: SemanticSearchAdapter = Object.freeze({ kind: 'deterministic-local', search: searchLocal });
export function isConfirmedAssistantAction(action: SearchAction | undefined): boolean {
  return Boolean(action?.userConfirmed && ['confirmed', 'in_progress', 'waiting'].includes(action.status ?? ''));
}

export function nextConversationContext(previous: SearchConversationContext, response: SearchResponse): SearchConversationContext {
  return { mode: response.resolvedCaseId ? 'case' : response.resolvedDocumentId ? 'document' : previous.mode, documentId: response.resolvedDocumentId ?? previous.documentId, caseId: response.resolvedCaseId ?? previous.caseId, lastResultDocumentIds: response.results.filter(result => result.kind === 'document').map(result => result.id), lastQuery: response.query };
}
export const emptySearchContext: SearchConversationContext = { mode: 'global', lastResultDocumentIds: [] };