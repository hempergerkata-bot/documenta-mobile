/**
 * Scanner-independent, deterministic document understanding.  It deliberately
 * consumes text (and optionally already extracted fields) only; no OCR, file,
 * network, or UI dependency belongs here.
 */
export const DOCUMENT_INTELLIGENCE_VERSION = '2.0.0';
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';
export type Evidence = { text: string; source: 'ocr' | 'structured'; confidence: Confidence };
export type Fact<T> = { value?: T; confidence: Confidence; evidence: Evidence[] };
export type Language = 'de' | 'hu' | 'en' | 'unknown';
export type DeadlineKind = 'payment' | 'response' | 'appeal' | 'cancellation' | 'appointment' | 'other';
export type AmountRole = 'payable' | 'total' | 'net' | 'gross' | 'credit' | 'fee' | 'unknown';
export type ConsequenceKind = 'financial' | 'legal' | 'contractual' | 'administrative' | 'medical_appointment' | 'informational' | 'unknown';
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type CaseRelation = 'new' | 'existing' | 'uncertain';
export type ChangeKind = 'amount' | 'deadline' | 'status' | 'contract_term' | 'fee' | 'address' | 'person' | 'reference' | 'requirement' | 'decision';

export type StructuredFields = Record<string, string | string[] | undefined>;
export type IntelligenceInput = {
  text: string;
  structuredFields?: StructuredFields;
  referenceDate?: string; // ISO date; used only to calculate explicit relative deadlines
  relatedDocuments?: Array<{ id: string; text?: string; title?: string; sender?: string; date?: string; references?: string[]; amount?: string; dueDate?: string; status?: string; contractTerms?: string; person?: string; address?: string }>;
};
export type TypedDeadline = Fact<string> & { kind: DeadlineKind; source: string; calculationBasis?: string; relative: boolean };
export type MoneyAmount = Fact<string> & { role: AmountRole; currency?: string };
export type Action = { requirement: string; priority: 'high' | 'medium' | 'low'; deadlineIndex?: number; responseNecessary: boolean; evidence: Evidence[] };
export type MissingRequirement = { requirement: string; type: 'document' | 'data' | 'signature' | 'proof'; evidence: Evidence[] };
export type RightOrOption = { option: string; conditions?: string; conditional?: boolean; deadlineIndex?: number; evidence: Evidence[] };
export type RelationSuggestion = { documentId: string; relation: 'same_case' | 'response' | 'chain'; confidence: Confidence; reasons: string[]; contradictions: string[]; changes: string[] };
export type DeadlineConflict = { kind: DeadlineKind; deadlineIndexes: number[]; reason: string; evidence: Evidence[] };
export type ExplicitConsequence = Fact<string> & { kind: ConsequenceKind; explicit: boolean };
export type TypedWarning = Fact<string> & { kind: 'deadline' | 'payment' | 'legal' | 'medical' | 'general'; severity: RiskLevel };
export type TypedChange = { kind: ChangeKind; description: string; evidence: Evidence[]; confidence: Confidence };
export type ReviewDecision = 'pending' | 'accept' | 'edit' | 'reject' | 'unknown';
export type ExplanationLanguage = 'de' | 'hu' | 'en';
export type ExplanationMode = 'short' | 'normal' | 'detailed' | 'plain';
export type LocalizedExplanationSections = {
  summary: string;
  action: string;
  deadline: string;
  amount: string;
  personalImpact: string;
};
export type ReviewRecord = { field: string; confidence: Confidence; reason: string; recommendedAction: 'accept' | 'edit' | 'reject' | 'unknown'; origin: 'automatic' | 'confirmed'; decision: ReviewDecision; evidence: Evidence[] };
const dateTokenPattern = /(?:\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}|\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/g;

/** Strictly normalizes supported ISO and German/Hungarian numeric dates. */
export function normalizeDocumentDate(value: string): string | undefined {
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  const local = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : undefined;
  if (!parts) return undefined;
  const [year, month, day] = parts.map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return undefined;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function dateSpans(text: string) {
  return [...text.matchAll(dateTokenPattern)].map(match => ({ start: match.index!, end: match.index! + match[0].length }));
}
function isDateSpan(text: string, start: number, end: number) {
  return dateSpans(text).some(span => start < span.end && end > span.start);
}

export type DocumentIntelligenceResult = {
  version: typeof DOCUMENT_INTELLIGENCE_VERSION;
  language: Fact<Language>;
  /** Alias kept separate for consumers that distinguish OCR/document language from UI language. */
  documentLanguage: Fact<Language>;
  taxonomy: { mainCategory: Fact<string>; subtype: Fact<string>; purpose: Fact<string>; roles: Fact<string[]> };
  parties: { sender: Fact<string>; senderDepartment: Fact<string>; senderContact: Fact<string>; recipient: Fact<string> };
  dates: { documentDate: Fact<string>; periods: Fact<string[]>; references: Fact<string[]> };
  amounts: { items: MoneyAmount[]; main: MoneyAmount };
  deadlines: TypedDeadline[];
  deadlineConflicts: DeadlineConflict[];
  actions: Action[];
  responseNecessary: Fact<boolean>;
  missingRequirements: MissingRequirement[];
  checklist: MissingRequirement[];
  consequences: { items: Fact<string>[]; riskLevel: Fact<RiskLevel>; warnings: Fact<string>[]; explicitItems: ExplicitConsequence[]; warningDetails: TypedWarning[] };
  rightsOptions: RightOrOption[];
  alternatives: RightOrOption[];
  keyPoints: Fact<string>[];
  relations: RelationSuggestion[];
  changes: TypedChange[];
  case: { summary: Fact<string>; nextStep: Fact<string>; closable: Fact<boolean>; relation: Fact<CaseRelation>; status: Fact<string>; chain: Array<{ relation: 'response' | 'chain'; evidence: Evidence[]; confidence: Confidence }> };
  explanations: Record<'short' | 'normal' | 'detailed', string>;
  plainLanguageExplanation: string;
  personalImpact: string;
  actionSummary: string;
  deadlineSummary: string;
  moneySummary: string;
  reviewRequired: boolean;
  reviewReasons: string[];
  reviewRecords: ReviewRecord[];
};

export function isCurrentDocumentIntelligence(value: unknown): value is DocumentIntelligenceResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DocumentIntelligenceResult>;
  return candidate.version === DOCUMENT_INTELLIGENCE_VERSION
    && !!candidate.documentLanguage
    && Array.isArray(candidate.reviewRecords)
    && typeof candidate.plainLanguageExplanation === 'string'
    && Array.isArray(candidate.consequences?.explicitItems)
    && Array.isArray(candidate.consequences?.warningDetails);
}

type Adapter = { language: Language; score: (text: string) => number; category: Array<[RegExp, string, string, string]>; labels: Record<string, RegExp>; };
const de: Adapter = {
  language: 'de',
  score: t => (t.match(/(?:rechnung|mahnung|versicherung|beitragserhöhung|bescheid|bewilligung|genehmigt|abgelehnt|arbeitsbescheinigung|arbeitgeber|frist|zahlung|widerspruch|kündigung|betrag|aktenzeichen|behörde|vertrag|arzt|termin|labor|rezept|schule|kita|kontoauszug|abonnement|finanzamt|inkasso|mietvertrag|lohnabrechnung)/gi) || []).length,
  category: [
    [/\b(?:lohnabrechnung|gehaltsabrechnung)\b/i, 'work', 'payroll', 'payroll'], [/\b(?:beitragserhöhung|prämienerhöhung)\b/i, 'insurance', 'premium_increase', 'insurance_change'], [/\b(?:kfz-versicherung|autoversicherung)\b/i, 'insurance', 'auto_insurance', 'insurance'],
    [/\b(?:versicherung(?:sbrief|sschreiben)|police)\b/i, 'insurance', 'insurance_letter', 'insurance'], [/\b(?:zahlungs?erinnerung|mahnung)\b/i, 'finance', 'payment_reminder', 'payment'], [/\b(?:inkasso|vollstreckungsankündigung)\b/i, 'finance', 'collection_letter', 'collection'],
    [/\b(?:strom|gas|wasser|energie).{0,20}\brechnung\b/i, 'housing', 'utility_invoice', 'payment'], [/\b(?:steuerbescheid|finanzamt)\b/i, 'finance', 'tax_document', 'tax'], [/\b(?:kontoauszug|bankmitteilung)\b/i, 'finance', 'bank_document', 'information'],
    [/\b(?:mietvertrag|miete|wohnung)\b/i, 'housing', 'rental_housing', 'housing'], [/\b(?:abo|abonnement)\b/i, 'contract', 'subscription', 'subscription'], [/\b(?:vertragsänderung|vertrag.{0,25}(?:geändert|änderung))\b/i, 'contract', 'contract_change', 'contract_change'],
    [/\b(?:kündigung|widerruf)\b/i, 'contract', 'cancellation', 'cancellation'], [/\b(?:vertrag)\b/i, 'contract', 'contract', 'contract'], [/\b(?:ablehnung|abgelehnt)\b/i, 'authority', 'rejection', 'decision'],
    [/\b(?:genehmigung|genehmigt|bewilligung)\b/i, 'authority', 'approval', 'decision'], [/\b(?:bescheid|widerspruch|behörde|amt)\b/i, 'authority', 'authority_decision', 'decision'],
    [/\b(?:laborbefund|laborbericht|befund)\b/i, 'health', 'lab_report', 'medical'], [/\b(?:rezept|verordnung)\b/i, 'health', 'prescription_order', 'medical'], [/\b(?:arztbrief)\b/i, 'health', 'doctor_letter', 'medical'],
    [/\b(?:terminbestätigung)\b/i, 'health', 'appointment_confirmation', 'appointment'], [/\b(?:termin|arzt)\b/i, 'health', 'appointment', 'appointment'], [/\b(?:schule|kita|kindergarten)\b/i, 'education', 'school_kita', 'information'],
    [/\b(?:arbeitsbescheinigung|arbeitsvertrag|arbeitgeber)\b/i, 'work', 'work_document', 'work'], [/\b(?:rechnung|zahlung)\b/i, 'finance', 'invoice', 'payment'],
  ],
  labels: { sender: /\b(?:absender|von|firma)\s*[:\-]\s*(.+)/i, recipient: /\b(?:empfänger|an)\s*[:\-]\s*(.+)/i, department: /\b(?:abteilung|fachbereich)\s*[:\-]\s*(.+)/i, contact: /\b(?:kontakt|ansprechpartner|telefon|e-mail)\s*[:\-]\s*(.+)/i, documentDate: /\b(?:rechnungsdatum|ausstellungsdatum|abrechnungsdatum|dokumentdatum|datum)\s*[:\-]\s*((?:\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}|\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}))/i, reference: /\b(?:aktenzeichen|geschäftszeichen|referenz(?:nummer)?|rechnungsnummer)\s*[:#\-]?\s*([A-Z0-9./-]{3,})/gi },
};
const hu: Adapter = {
  language: 'hu',
  score: t => (t.match(/(?:számla|határidő|fizetés|fellebbezés|felmondás|összeg|ügyszám|határozat|hatóság|szerződés|orvos|időpont)/gi) || []).length,
  category: [[/\b(?:számla|fizet|felszólítás)\b/i, 'finance', 'invoice_or_payment', 'payment'], [/\b(?:határozat|hatóság|fellebbezés)\b/i, 'authority', 'official_notice', 'decision'], [/\b(?:szerződés|felmondás)\b/i, 'contract', 'contract_notice', 'contract'], [/\b(?:időpont|orvos)\b/i, 'health', 'appointment', 'appointment']],
  labels: { sender: /\b(?:feladó|küldő)\s*[:\-]\s*(.+)/i, recipient: /\b(?:címzett|részére)\s*[:\-]\s*(.+)/i, department: /\b(?:osztály|ügyosztály)\s*[:\-]\s*(.+)/i, contact: /\b(?:kapcsolat|ügyintéző|telefon|e-mail)\s*[:\-]\s*(.+)/i, documentDate: /\b(?:számla\s+kelte|kiállítás(?:\s+kelte)?|kelte|kelt|dokumentum\s+dátuma)\s*[:\-]\s*((?:\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}|\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}))/i, reference: /\b(?:ügyszám|azonosító|számlaszám|hivatkozási szám)\s*[:#\-]?\s*([A-Z0-9./-]{3,})/gi },
};
const en: Adapter = {
  language: 'en',
  score: t => (t.match(/(?:invoice|payment|due date|appeal|contract|appointment|decision|notice)/gi) || []).length,
  category: [[/\b(?:invoice|payment|collection|bank|tax)\b/i, 'finance', 'invoice_or_payment', 'payment'], [/\b(?:decision|authority|appeal|notice)\b/i, 'authority', 'official_notice', 'decision'], [/\b(?:contract|cancellation|subscription|rental)\b/i, 'contract', 'contract_notice', 'contract'], [/\b(?:doctor|medical|prescription|appointment|lab)\b/i, 'health', 'medical_document', 'medical']],
  labels: { sender: /\b(?:sender|from|company)\s*[:\-]\s*(.+)/i, recipient: /\b(?:recipient|to)\s*[:\-]\s*(.+)/i, department: /\b(?:department)\s*[:\-]\s*(.+)/i, contact: /\b(?:contact|phone|e-mail)\s*[:\-]\s*(.+)/i, documentDate: /\b(?:invoice date|issue date|document date|date)\s*[:\-]\s*((?:\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}|\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}))/i, reference: /\b(?:reference|case number|invoice number)\s*[:#\-]?\s*([A-Z0-9./-]{3,})/gi },
};
const unknownEvidence = (): Evidence[] => [];
const unknown = <T>(): Fact<T> => ({ confidence: 'unknown', evidence: unknownEvidence() });
const clean = (v: string) => v.replace(/\s+/g, ' ').replace(/^[\s:–-]+|[\s;,]+$/g, '').trim();
const ev = (text: string, source: Evidence['source'], confidence: Confidence): Evidence => ({ text: clean(text).slice(0, 240), source, confidence });
const fact = <T>(value: T | undefined, evidence: Evidence[], confidence: Confidence): Fact<T> => value === undefined ? unknown<T>() : { value, evidence, confidence };
const linesOf = (text: string) => text.replace(/\0/g, '').split(/\r?\n/).map(clean).filter(Boolean);
const confidenceFor = (source: Evidence['source']) => source === 'structured' ? 'high' as const : 'medium' as const;

export function detectDocumentLanguage(text: string): Fact<Language> {
  const scores: Array<[Language, number]> = [['de', de.score(text)], ['hu', hu.score(text)], ['en', en.score(text)]];
  const highest = Math.max(...scores.map(x => x[1]));
  const candidates = scores.filter(x => x[1] === highest);
  if (!highest || candidates.length !== 1) return unknown<Language>();
  const language = candidates[0][0];
  const names: Record<Language, string> = { de: 'German', hu: 'Hungarian', en: 'English', unknown: 'Unknown' };
  return fact(language, [ev(`${names[language]} document terms`, 'ocr', 'medium')], highest >= 2 ? 'high' : 'medium');
}
function adapterFor(language: Language): Adapter | undefined { return language === 'de' ? de : language === 'hu' ? hu : language === 'en' ? en : undefined; }
function valueFrom(input: IntelligenceInput, key: string, label?: RegExp): Fact<string> {
  const supplied = input.structuredFields?.[key];
  if (typeof supplied === 'string' && clean(supplied)) return fact(clean(supplied), [ev(`${key}: ${supplied}`, 'structured', 'high')], 'high');
  const match = label ? input.text.match(label) : undefined;
  return match?.[1] ? fact(clean(match[1]), [ev(match[0], 'ocr', 'medium')], 'medium') : unknown<string>();
}
function extractTaxonomy(text: string, adapter?: Adapter): DocumentIntelligenceResult['taxonomy'] {
  const hit = adapter?.category.find(([pattern]) => pattern.test(text));
  const evidence = hit ? [ev(hit[0].source, 'ocr', 'medium')] : [];
  return { mainCategory: hit ? fact(hit[1], evidence, 'medium') : unknown(), subtype: hit ? fact(hit[2], evidence, 'medium') : unknown(), purpose: hit ? fact(hit[3], evidence, 'medium') : unknown(), roles: fact(hit ? [hit[3]] : undefined, evidence, hit ? 'medium' : 'unknown') };
}
function extractDates(text: string, input: IntelligenceInput, adapter?: Adapter) {
  const supplied = input.structuredFields?.documentDate;
  const structuredDate = typeof supplied === 'string' ? normalizeDocumentDate(supplied) : undefined;
  const labelled = adapter?.labels.documentDate ? text.match(adapter.labels.documentDate) : undefined;
  const labelledDate = labelled?.[1] ? normalizeDocumentDate(labelled[1]) : undefined;
  // An unlabeled date may be a deadline, appointment, or reference: never call it document date.
  const documentDate = structuredDate ? fact(structuredDate, [ev(`documentDate: ${supplied}`, 'structured', 'high')], 'high') : labelledDate ? fact(labelledDate, [ev(labelled![0], 'ocr', 'high')], 'high') : unknown<string>();
  const periods = [...text.matchAll(/\b(?:von|vom|für|időszak)\s+(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})\s*(?:bis|[-–])\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/gi)]
    .map(m => [normalizeDocumentDate(m[1]), normalizeDocumentDate(m[2])])
    .filter((m): m is [string, string] => !!m[0] && !!m[1])
    .map(m => `${m[0]} – ${m[1]}`);
  return { documentDate, periods: fact(periods.length ? periods : undefined, periods.map(x => ev(x, 'ocr', 'medium')), periods.length ? 'medium' as const : 'unknown' as const), references: unknown<string[]>() };
}
function extractReferences(text: string, adapter?: Adapter): Fact<string[]> {
  if (!adapter) return unknown<string[]>();
  const refs = [...text.matchAll(adapter.labels.reference)].map(m => m[1]).filter(Boolean);
  return fact(refs.length ? [...new Set(refs)] : undefined, refs.map(x => ev(x, 'ocr', 'high')), refs.length ? 'high' : 'unknown');
}
function extractAmounts(text: string, input?: IntelligenceInput): { items: MoneyAmount[]; main: MoneyAmount } {
  const matches = [...text.matchAll(/(?:€|EUR|Ft|HUF)?\s*(\d{1,3}(?:[ .]\d{3})*(?:[,.]\d{2})|\d+[,.]\d{2})\s*(€|EUR|Ft|HUF)?/gi)]
    .filter(m => !isDateSpan(text, m.index!, m.index! + m[0].length));
  const items: MoneyAmount[] = matches.map(m => {
    const lineStart = text.lastIndexOf('\n', m.index!) + 1;
    const lineEnd = text.indexOf('\n', m.index!);
    const context = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd);
    const role: AmountRole = /(?:zu zahlen|zahlbar|fällig|fizetendő)/i.test(context) ? 'payable' : /(?:gesamt|végösszeg|total)/i.test(context) ? 'total' : /(?:netto|nettó)/i.test(context) ? 'net' : /(?:brutto|bruttó)/i.test(context) ? 'gross' : /(?:gutschrift|jóváírás)/i.test(context) ? 'credit' : /(?:gebühr|díj)/i.test(context) ? 'fee' : 'unknown';
    return { value: clean(m[0]), role, currency: m[2] || (/\b(?:Ft|HUF)\b/i.test(m[0]) ? 'HUF' : undefined), confidence: role === 'unknown' ? 'low' : 'medium', evidence: [ev(context, 'ocr', role === 'unknown' ? 'low' : 'medium')] };
  });
  const supplied = input?.structuredFields?.amount;
  const structuredAmount = typeof supplied === 'string' && clean(supplied)
    ? {
        value: clean(supplied),
        role: /(?:payment|payable|zahlung|fizet)/i.test(String(input?.structuredFields?.status ?? input?.structuredFields?.paymentStatus ?? '')) ? 'payable' as const : 'total' as const,
        confidence: 'high' as const,
        evidence: [ev(`amount: ${supplied}`, 'structured', 'high')],
      }
    : undefined;
  const main = structuredAmount || items.find(x => x.role === 'payable') || items.find(x => x.role === 'total');
  return { items, main: main ?? { role: 'unknown', confidence: 'unknown', evidence: [] } };
}
function parseRelativeDays(text: string, referenceDate?: string): { value?: string; basis: string } {
  const m = text.match(/\b(?:within|innerhalb von|binnen|legkésőbb)\s+(\d+)\s+(?:days|tagen|napon)\b/i);
  if (!m) return { basis: '' };
  const basis = m[0];
  const normalizedReference = referenceDate ? normalizeDocumentDate(referenceDate) : undefined;
  if (!normalizedReference) return { basis };
  const [year, month, day] = normalizedReference.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day)); d.setUTCDate(d.getUTCDate() + Number(m[1]));
  return { value: d.toISOString().slice(0, 10), basis };
}
function extractDeadlines(text: string, input: IntelligenceInput): TypedDeadline[] {
  const datePattern = '(\\d{4}[.\\\\/-]\\d{1,2}[.\\\\/-]\\d{1,2}|\\d{1,2}[.\\\\/-]\\d{1,2}[.\\\\/-]\\d{4})';
  const kinds: Array<[DeadlineKind, RegExp]> = [
    ['payment', new RegExp(`(?:zahlbar|fällig|fizetendő|fizetési\\s+határidő|payment\\s+due)[^\\n]{0,40}?${datePattern}`, 'gi')],
    ['response', new RegExp(`(?:antwort|stellungnahme|válasz)[^\\n]{0,40}?${datePattern}`, 'gi')],
    ['appeal', new RegExp(`(?:widerspruch|einspruch|fellebbezés)[^\\n]{0,45}?${datePattern}`, 'gi')],
    ['cancellation', new RegExp(`(?:kündigung|felmondás)[^\\n]{0,45}?${datePattern}`, 'gi')],
    ['appointment', new RegExp(`(?:termin|időpont)[^\\n]{0,40}?${datePattern}`, 'gi')],
  ];
  const found: TypedDeadline[] = [];
  kinds.forEach(([kind, re]) => [...text.matchAll(re)].forEach(m => {
    const value = normalizeDocumentDate(m[1]);
    if (value) found.push({ kind, value, source: m[0], relative: false, confidence: 'high', evidence: [ev(m[0], 'ocr', 'high')] });
  }));
  const relative = parseRelativeDays(text, input.referenceDate);
  if (relative.basis) {
    const normalizedReference = input.referenceDate ? normalizeDocumentDate(input.referenceDate) : undefined;
    found.push({ kind: /widerspruch|fellebbezés/i.test(text) ? 'appeal' : 'other', value: relative.value, source: relative.basis, calculationBasis: normalizedReference ? `${relative.basis}; referenceDate ${normalizedReference}` : `${relative.basis}; reference date missing`, relative: true, confidence: relative.value ? 'low' : 'unknown', evidence: [ev(relative.basis, 'ocr', 'low')] });
  }
  const supplied = input.structuredFields?.dueDate;
  if (typeof supplied === 'string' && clean(supplied)) {
    const dueDate = normalizeDocumentDate(supplied);
    if (dueDate) {
      // A confirmed field is a correction, not an additional competing OCR deadline.
      for (let index = found.length - 1; index >= 0; index -= 1) if (found[index].kind === 'payment') found.splice(index, 1);
      found.unshift({ kind: 'payment', value: dueDate, source: `dueDate: ${supplied}`, relative: false, confidence: 'high', evidence: [ev(`dueDate: ${supplied}`, 'structured', 'high')] });
    }
  }
  return found;
}
function findDeadlineConflicts(deadlines: TypedDeadline[]): DeadlineConflict[] {
  const conflicts: DeadlineConflict[] = [];
  for (const kind of ['payment', 'response', 'appeal', 'cancellation', 'appointment', 'other'] as DeadlineKind[]) {
    const indexes = deadlines.map((d, i) => ({ d, i })).filter(x => x.d.kind === kind && !!x.d.value);
    const values = [...new Set(indexes.map(x => x.d.value))];
    if (values.length > 1) conflicts.push({ kind, deadlineIndexes: indexes.map(x => x.i), reason: `Conflicting ${kind} deadlines: ${values.join(', ')}`, evidence: indexes.flatMap(x => x.d.evidence) });
  }
  return conflicts;
}
function extractObligations(text: string, deadlines: TypedDeadline[]) {
  const sourceLines = linesOf(text);
  const requirementLines = sourceLines.filter(x => /\b(?:please|must|submit|send|pay|bitte|müssen|reichen sie|zahlen sie|küldje|fizesse|köteles)\b/i.test(x)).slice(0, 6);
  const actions = requirementLines.map(line => ({ requirement: line, priority: /(?:sofort|unverzüglich|immediately|haladéktalanul)/i.test(line) ? 'high' as const : deadlines.length ? 'medium' as const : 'low' as const, deadlineIndex: deadlines.length ? 0 : undefined, responseNecessary: /(?:antwort|submit|send|bitte|reichen|küldje|válasz)/i.test(line), evidence: [ev(line, 'ocr', 'medium')] }));
  const missing = sourceLines.filter(x => /\b(?:fehlend|beifügen|nachreichen|missing|csatolja|hiányzó)\b/i.test(x)).slice(0, 5).map(line => ({ requirement: line, type: /unterschrift|aláírás/i.test(line) ? 'signature' as const : /nachweis|igazolás/i.test(line) ? 'proof' as const : /dokument|unterlage|irat/i.test(line) ? 'document' as const : 'data' as const, evidence: [ev(line, 'ocr', 'medium')] }));
  return { actions, missing };
}
function extractConsequencesAndRights(text: string, deadlines: TypedDeadline[]) {
  const lines = linesOf(text);
  const consequences = lines.filter(x => /\b(?:sonst|otherwise|folge|mahn\w*|sperr\w*|vollstreck\w*|legal enforcement|konsequenz|ellenkező esetben)\b/i.test(x)).slice(0, 4).map(x => fact(x, [ev(x, 'ocr', 'medium')], 'medium'));
  const rights = lines.filter(x => /\b(?:widerspruch|einspruch|recht|können sie|fellebbez|jogosult|appeal|you may|entitled)\b/i.test(x)).slice(0, 4).map(x => {
    const conditional = /(?:wenn|sofern|ha|amennyiben|if|provided that)/i.test(x);
    return { option: x, conditions: conditional ? x : undefined, conditional, deadlineIndex: deadlines.findIndex(d => d.kind === 'appeal') >= 0 ? deadlines.findIndex(d => d.kind === 'appeal') : undefined, evidence: [ev(x, 'ocr', 'medium')] };
  });
  const alternatives = lines.filter(x => /\b(?:alternativ|stattdessen|oder\s+sie|alternative|instead|or you may)\b/i.test(x)).slice(0, 4).map(x => ({ option: x, conditional: /(?:wenn|if|sofern)/i.test(x), evidence: [ev(x, 'ocr', 'medium')] }));
  const classify = (value: string): ConsequenceKind => /(?:vollstreck|gericht|strafe|legal|appeal)/i.test(value) ? 'legal' : /(?:mahn|zahlung|fee|betrag)/i.test(value) ? 'financial' : /(?:kündig|vertrag|contract)/i.test(value) ? 'contractual' : /(?:termin|arzt|medical)/i.test(value) ? 'medical_appointment' : /(?:amt|behörd|authority)/i.test(value) ? 'administrative' : consequences.length ? 'informational' : 'unknown';
  const explicitItems: ExplicitConsequence[] = consequences.map(item => ({ ...item, kind: classify(item.value || ''), explicit: true }));
  const critical = consequences.some(x => /(?:lebensgefahr|notfall|immediate.*danger|prison)/i.test(x.value ?? ''));
  const high = consequences.some(x => /(?:vollstreck|sperr|gericht)/i.test(x.value ?? ''));
  const level: RiskLevel = critical ? 'critical' : high ? 'high' : consequences.length ? 'medium' : 'none';
  const warnings = consequences.filter(x => /(?:warn|achtung|sonst|ellenkező)/i.test(x.value ?? ''));
  const warningDetails: TypedWarning[] = warnings.map(item => ({ ...item, kind: /(?:vollstreck|gericht)/i.test(item.value || '') ? 'legal' : /(?:zahlung|mahn)/i.test(item.value || '') ? 'payment' : 'general', severity: level }));
  return { items: consequences, riskLevel: fact<RiskLevel>(level, consequences.flatMap(x => x.evidence), consequences.length ? 'medium' : 'low'), warnings, explicitItems, warningDetails, rights, alternatives };
}
function assessRisk(
  input: IntelligenceInput,
  deadlines: TypedDeadline[],
  conflicts: DeadlineConflict[],
  actions: Action[],
  missing: MissingRequirement[],
  consequence: ReturnType<typeof extractConsequencesAndRights>,
  criticalUnknowns: Array<{ field: string; fact: Fact<unknown> }>,
) {
  const warnings: TypedWarning[] = [];
  const add = (text: string, kind: TypedWarning['kind'], severity: RiskLevel, confidence: Confidence, evidence: Evidence[]) => {
    if (evidence.length) warnings.push({ value: text, kind, severity, confidence, evidence });
  };
  const normalizedReference = input.referenceDate ? normalizeDocumentDate(input.referenceDate) : undefined;
  const referenceParts = normalizedReference?.split('-').map(Number);
  const referenceMs = referenceParts ? Date.UTC(referenceParts[0], referenceParts[1] - 1, referenceParts[2]) : undefined;
  let highFactors = 0;
  const eligible = deadlines.map((deadline, index) => ({ deadline, index })).filter(({ deadline, index }) =>
    !!deadline.value && !deadline.relative && (deadline.confidence === 'high' || deadline.confidence === 'medium') && !conflicts.some(conflict => conflict.deadlineIndexes.includes(index)));
  eligible.forEach(({ deadline }) => {
    if (referenceMs !== undefined) {
      const [year, month, day] = deadline.value!.split('-').map(Number);
      const days = Math.floor((Date.UTC(year, month - 1, day) - referenceMs) / 86400000);
      if (days >= 0 && days <= 7) { highFactors += 1; add(`Near ${deadline.kind} deadline: ${deadline.value}`, 'deadline', 'high', deadline.confidence, deadline.evidence); }
    }
  });
  actions.filter(action => action.priority === 'high').forEach(action => { highFactors += 1; add(action.requirement, 'general', 'high', 'medium', action.evidence); });
  missing.forEach(item => add(item.requirement, 'general', 'medium', 'medium', item.evidence));
  conflicts.forEach(conflict => add(conflict.reason, 'deadline', 'medium', 'medium', conflict.evidence));
  consequence.explicitItems.forEach(item => {
    if (item.kind === 'financial' || item.kind === 'legal' || item.kind === 'contractual') {
      highFactors += item.kind === 'legal' ? 2 : 1;
      add(item.value!, item.kind === 'financial' ? 'payment' : item.kind === 'legal' ? 'legal' : 'general', item.kind === 'legal' ? 'high' : 'medium', item.confidence, item.evidence);
    }
  });
  consequence.rights.filter(item => /(?:frist|deadline|verlust|loss|termination|kündigung)/i.test(item.option)).forEach(item => {
    highFactors += 1; add(item.option, 'legal', 'high', 'medium', item.evidence);
  });
  criticalUnknowns.filter(item => item.fact.confidence === 'low' || item.fact.confidence === 'unknown').forEach(item =>
    add(`${item.field} requires review`, 'general', 'low', item.fact.confidence, item.fact.evidence));
  const severe = consequence.explicitItems.some(item => /(?:lebensgefahr|notfall|immediate.*danger|prison)/i.test(item.value || ''));
  const level: RiskLevel = severe || highFactors >= 4 ? 'critical' : highFactors >= 2 ? 'high' : highFactors === 1 ? 'medium' : (missing.length || conflicts.length ? 'low' : 'none');
  return { riskLevel: fact(level, warnings.flatMap(warning => warning.evidence), warnings.length ? 'medium' : 'low'), warningDetails: warnings };
}
function relationSuggestions(input: IntelligenceInput, refs: string[], sender?: string, subject?: string): RelationSuggestion[] {
  const normalized = (x?: string) => (x || '').toLocaleLowerCase().replace(/[^a-z0-9áéíóöőúüűäöüß]+/gi, ' ').trim();
  return (input.relatedDocuments || []).map(d => {
    const docText = `${d.title || ''} ${d.text || ''} ${d.sender || ''}`;
    const sharedRefs = refs.filter(r => docText.includes(r));
    const sharedSender = !!sender && normalized(docText).includes(normalized(sender));
    const sharedSubject = !!subject && normalized(d.title).includes(normalized(subject));
    const reasons = [...sharedRefs.map(r => `shared reference ${r}`), ...(sharedSender ? ['shared sender'] : []), ...(sharedSubject ? ['shared subject'] : [])];
    const relation = /\b(?:antwort|reply|válasz)\b/i.test(input.text) ? 'response' : /\b(?:mahnung|erinnerung|follow.?up)\b/i.test(input.text) ? 'chain' : 'same_case';
    const contradictions: string[] = [];
    const changes: string[] = [];
    if (d.date && input.referenceDate && d.date > input.referenceDate) contradictions.push('related document date is later than reference date');
    if (/\b(?:geändert|änderung|módosít)/i.test(input.text)) changes.push('document explicitly indicates a change');
    return reasons.length ? { documentId: d.id, relation, confidence: sharedRefs.length ? 'high' : 'medium', reasons, contradictions, changes } : undefined;
  }).filter((x): x is RelationSuggestion => !!x);
}
export function compareDocumentIntelligence(a: DocumentIntelligenceResult, b: DocumentIntelligenceResult) {
  const changes: string[] = [];
  const typedChanges: Array<{ kind: ChangeKind; before?: string; after?: string; evidence: { before: Evidence[]; after: Evidence[] } }> = [];
  const add = (kind: ChangeKind, label: string, before: Fact<string>, after: Fact<string>) => {
    if (before.value !== after.value) { changes.push(label); typedChanges.push({ kind, before: before.value, after: after.value, evidence: { before: before.evidence, after: after.evidence } }); }
  };
  add('amount', 'main amount differs', a.amounts.main, b.amounts.main);
  add('deadline', 'document date differs', a.dates.documentDate, b.dates.documentDate);
  const aDeadline = a.deadlines.find(x => x.kind === 'payment') ?? unknown<string>();
  const bDeadline = b.deadlines.find(x => x.kind === 'payment') ?? unknown<string>();
  add('deadline', 'payment deadline differs', aDeadline, bDeadline);
  add('status', 'case status differs', a.case.status, b.case.status);
  const aContract = a.changes.find(x => x.kind === 'contract_term');
  const bContract = b.changes.find(x => x.kind === 'contract_term');
  if ((aContract?.description || '') !== (bContract?.description || '')) typedChanges.push({ kind: 'contract_term', before: aContract?.description, after: bContract?.description, evidence: { before: aContract?.evidence || [], after: bContract?.evidence || [] } }), changes.push('contract term differs');
  if ((a.dates.references.value || []).join('|') !== (b.dates.references.value || []).join('|')) changes.push('references differ'), typedChanges.push({ kind: 'reference', before: (a.dates.references.value || []).join(', '), after: (b.dates.references.value || []).join(', '), evidence: { before: a.dates.references.evidence, after: b.dates.references.evidence } });
  return { changes, typedChanges, conflicts: changes.map(change => ({ description: change, evidence: { before: typedChanges.find(item => change.includes(item.kind === 'amount' ? 'amount' : item.kind === 'deadline' ? 'date' : item.kind === 'status' ? 'status' : item.kind === 'reference' ? 'references' : 'contract'))?.evidence.before || [], after: typedChanges.find(item => change.includes(item.kind === 'amount' ? 'amount' : item.kind === 'deadline' ? 'date' : item.kind === 'status' ? 'status' : item.kind === 'reference' ? 'references' : 'contract'))?.evidence.after || [] } })), hasContradictions: changes.length > 0 };
}
export function checklistFromIntelligence(result: DocumentIntelligenceResult) { return result.checklist.map((x, i) => ({ id: `di-${i}`, title: x.requirement, type: x.type, evidence: x.evidence })); }
export function downstreamDocumentFacts(result: DocumentIntelligenceResult) { return { sender: result.parties.sender.value, references: result.dates.references.value || [], dueDates: eligibleDeadlines(result).map(x => x.value!).filter(Boolean), mainAmount: isMainAmountEligible(result) ? result.amounts.main.value : undefined, reviewRequired: result.reviewRequired }; }
export function localizedExplanationSections(
  result: DocumentIntelligenceResult,
  language: ExplanationLanguage,
): LocalizedExplanationSections {
  const copy = {
    de: {
      document: 'Dokument',
      sender: 'Absender',
      action: 'Nächster Schritt',
      deadline: 'Frist',
      amount: 'Betrag',
      consequences: 'Mögliche Folge',
      options: 'Möglichkeiten',
      uncertain: 'Zu prüfen',
      unknown: 'nicht eindeutig erkannt',
      noAction: 'Keine eindeutig belegte Aufgabe gefunden.',
      actionFound: 'Im Dokument ist eine Aufgabe belegt',
      noDeadline: 'Keine eindeutige Frist gefunden.',
      noAmount: 'Der Hauptbetrag konnte nicht zuverlässig erkannt werden.',
      impactUnknown: 'Die persönliche Bedeutung konnte ohne belegte Aufgabe, Frist oder Summe nicht zuverlässig bestimmt werden.',
    },
    hu: {
      document: 'Dokumentum',
      sender: 'Feladó',
      action: 'Következő lépés',
      deadline: 'Határidő',
      amount: 'Összeg',
      consequences: 'Lehetséges következmény',
      options: 'Lehetőségek',
      uncertain: 'Ellenőrizendő',
      unknown: 'nem azonosítható egyértelműen',
      noAction: 'Nem találtam egyértelműen alátámasztott teendőt.',
      actionFound: 'A dokumentum alátámasztott teendőt tartalmaz',
      noDeadline: 'Nem találtam egyértelmű határidőt.',
      noAmount: 'Nem tudtam megbízhatóan azonosítani a fő összeget.',
      impactUnknown: 'Alátámasztott teendő, határidő vagy összeg nélkül nem állapítható meg megbízhatóan a személyes hatás.',
    },
    en: {
      document: 'Document',
      sender: 'Sender',
      action: 'Next step',
      deadline: 'Deadline',
      amount: 'Amount',
      consequences: 'Possible consequence',
      options: 'Options',
      uncertain: 'Needs review',
      unknown: 'not clearly identified',
      noAction: 'No clearly evidenced action was found.',
      actionFound: 'The document contains an evidenced action',
      noDeadline: 'No clear deadline was found.',
      noAmount: 'The main amount could not be reliably identified.',
      impactUnknown: 'Personal impact cannot be reliably determined without an evidenced action, deadline, or amount.',
    },
  }[language];
  const type = result.taxonomy.subtype.value ?? copy.unknown;
  const sender = result.parties.sender.value ?? copy.unknown;
  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  const actions = [...result.actions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const action = actions[0] ? `${copy.actionFound}: „${actions[0].requirement}“` : copy.noAction;
  const deadlines = eligibleDeadlines(result);
  const deadlineKinds: Record<ExplanationLanguage, Record<DeadlineKind, string>> = {
    de: { payment: 'Zahlung', response: 'Antwort', appeal: 'Widerspruch', cancellation: 'Kündigung', appointment: 'Termin', other: 'Sonstige Frist' },
    hu: { payment: 'Fizetés', response: 'Válasz', appeal: 'Fellebbezés', cancellation: 'Felmondás', appointment: 'Időpont', other: 'Egyéb határidő' },
    en: { payment: 'Payment', response: 'Response', appeal: 'Appeal', cancellation: 'Cancellation', appointment: 'Appointment', other: 'Other deadline' },
  };
  const deadline = deadlines.length ? deadlines.map((item) => `${deadlineKinds[language][item.kind]}: ${item.value}`).join(' · ') : copy.noDeadline;
  const amount = isMainAmountEligible(result) && result.amounts.main.value ? result.amounts.main.value : copy.noAmount;
  const hasSupportedImpact = !!actions.length || !!deadlines.length || isMainAmountEligible(result);
  const personalImpact = hasSupportedImpact
    ? `${copy.action}: ${action} ${copy.deadline}: ${deadline} ${copy.amount}: ${amount}`
    : copy.impactUnknown;
  return {
    summary: `${copy.document}: ${type}. ${copy.sender}: ${sender}.`,
    action,
    deadline,
    amount,
    personalImpact,
  };
}

export function explanationFor(
  result: DocumentIntelligenceResult,
  language: ExplanationLanguage,
  mode: ExplanationMode,
): string {
  const copy = {
    de: { consequences: 'Mögliche Folge', options: 'Möglichkeiten', uncertain: 'Zu prüfen', evidence: 'Beleg', reviewNeeded: 'Menschliche Prüfung erforderlich' },
    hu: { consequences: 'Lehetséges következmény', options: 'Lehetőségek', uncertain: 'Ellenőrizendő', evidence: 'Forrás', reviewNeeded: 'Felhasználói ellenőrzés szükséges' },
    en: { consequences: 'Possible consequence', options: 'Options', uncertain: 'Needs review', evidence: 'Evidence', reviewNeeded: 'Human review required' },
  }[language];
  const sections = localizedExplanationSections(result, language);
  const optionText = [...result.rightsOptions, ...result.alternatives].map((item) => item.option).join(' · ');
  const consequenceText = result.consequences.explicitItems.map((item) => item.value).filter(Boolean).join(' · ');
  if (mode === 'short') return sections.summary;
  if (mode === 'plain') return `${sections.summary} ${sections.personalImpact}`;
  const normal = `${sections.summary} ${sections.personalImpact}`;
  if (mode === 'normal') return normal;
  const evidence = result.keyPoints.flatMap((point) => point.evidence).slice(0, 3).map((item) => `„${item.text}“`).join(' · ');
  const fieldLabels: Record<ExplanationLanguage, Record<string, string>> = {
    de: { documentType: 'Dokumenttyp', subtype: 'Untertyp', purpose: 'Zweck', sender: 'Absender', recipient: 'Empfänger', mainAmount: 'Hauptbetrag', deadlines: 'Fristen', actions: 'Aufgaben', consequences: 'Folgen', rightsOptions: 'Rechte und Möglichkeiten', caseRelation: 'Fallzuordnung', riskLevel: 'Risiko' },
    hu: { documentType: 'dokumentumtípus', subtype: 'altípus', purpose: 'cél', sender: 'feladó', recipient: 'címzett', mainAmount: 'fő összeg', deadlines: 'határidők', actions: 'teendők', consequences: 'következmények', rightsOptions: 'jogok és lehetőségek', caseRelation: 'ügykapcsolat', riskLevel: 'kockázat' },
    en: { documentType: 'document type', subtype: 'subtype', purpose: 'purpose', sender: 'sender', recipient: 'recipient', mainAmount: 'main amount', deadlines: 'deadlines', actions: 'actions', consequences: 'consequences', rightsOptions: 'rights and options', caseRelation: 'case relation', riskLevel: 'risk level' },
  };
  const reviewFields = result.reviewRecords
    .filter((record) => record.decision === 'pending' || record.decision === 'edit')
    .map((record) => fieldLabels[language][record.field] ?? record.field);
  const reviewText = result.reviewRequired
    ? `${copy.reviewNeeded}${reviewFields.length ? `: ${reviewFields.join(', ')}` : ''}`
    : '';
  return [
    normal,
    consequenceText ? `${copy.consequences}: ${consequenceText}` : '',
    optionText ? `${copy.options}: ${optionText}` : '',
    reviewText ? `${copy.uncertain}: ${reviewText}` : '',
    evidence ? `${copy.evidence}: ${evidence}` : '',
  ].filter(Boolean).join(' ');
}
/** True only for an unambiguous, calendar-valid absolute deadline. */
export function isDeadlineEligible(result: DocumentIntelligenceResult, index: number): boolean {
  const deadline = result.deadlines[index];
  if (!deadline || deadline.relative || !deadline.value || !normalizeDocumentDate(deadline.value)) return false;
  if (deadline.confidence !== 'high' && deadline.confidence !== 'medium') return false;
  const decision = result.reviewRecords.find(record => record.field === 'deadlines')?.decision;
  if (decision === 'reject' || decision === 'unknown') return false;
  return !result.deadlineConflicts.some(conflict => conflict.deadlineIndexes.includes(index));
}
export function eligibleDeadlines(result: DocumentIntelligenceResult): TypedDeadline[] {
  return result.deadlines.filter((_, index) => isDeadlineEligible(result, index));
}
/** A main amount must be a supported payable/total value, never a date-like OCR span. */
export function isMainAmountEligible(result: DocumentIntelligenceResult): boolean {
  const amount = result.amounts.main;
  const decision = result.reviewRecords.find(record => record.field === 'mainAmount')?.decision;
  if (decision === 'reject' || decision === 'unknown') return false;
  return !!amount.value && (amount.role === 'payable' || amount.role === 'total') &&
    (amount.confidence === 'high' || amount.confidence === 'medium') && !normalizeDocumentDate(amount.value);
}
/** Immutably records a human review without ever replacing OCR/structured evidence. */
export function applyReviewDecision(result: DocumentIntelligenceResult, field: string, decision: ReviewDecision): DocumentIntelligenceResult {
  const reviewRecords = result.reviewRecords.map(record => record.field === field
      ? { ...record, decision, origin: decision === 'accept' || decision === 'edit' ? 'confirmed' : record.origin,
          reason: decision === 'reject' ? `${record.reason}; rejected by review` : decision === 'unknown' ? `${record.reason}; marked unknown by review` : record.reason }
      : record);
  const baseReasons = result.reviewReasons.filter(reason => !reason.startsWith('Critical '));
  const unresolved = reviewRecords
    .filter(record => (record.confidence === 'low' || record.confidence === 'unknown') && (record.decision === 'pending' || record.decision === 'edit'))
    .map(record => `Critical ${record.field} requires review`);
  const reviewReasons = [...new Set([...baseReasons, ...unresolved])];
  return {
    ...result,
    reviewRecords,
    reviewReasons,
    reviewRequired: reviewReasons.length > 0,
  };
}
export function applyReviewDecisions(
  result: DocumentIntelligenceResult,
  decisions: Partial<Record<string, ReviewDecision>>,
): DocumentIntelligenceResult {
  return Object.entries(decisions).reduce(
    (current, [field, decision]) => decision ? applyReviewDecision(current, field, decision) : current,
    result,
  );
}
function extractChanges(text: string): TypedChange[] {
  const map: Array<[ChangeKind, RegExp]> = [
    ['amount', /(?:betrag|amount|összeg).{0,35}(?:geändert|neu|increased|változ)/i], ['deadline', /(?:frist|deadline|határidő).{0,35}(?:geändert|neu|changed|változ)/i],
    ['status', /(?:status|genehmigt|abgelehnt|approved|rejected)/i], ['contract_term', /(?:vertrag|contract|szerződés).{0,35}(?:geändert|changed|módosít)/i],
    ['fee', /(?:gebühr|fee|díj)/i], ['address', /(?:adresse|address|cím)/i], ['person', /(?:person|name|ügyintéző)/i],
    ['reference', /(?:aktenzeichen|reference|ügyszám)/i], ['requirement', /(?:bitte|müssen|must|köteles)/i], ['decision', /(?:bescheid|entscheidung|decision|határozat)/i],
  ];
  return map.flatMap(([kind, pattern]) => {
    const match = text.match(pattern);
    const line = match ? linesOf(text).find(value => pattern.test(value)) || match[0] : undefined;
    return line ? [{ kind, description: clean(line), evidence: [ev(line, 'ocr', 'medium')], confidence: 'medium' as const }] : [];
  });
}

export function analyzeDocumentIntelligence(input: IntelligenceInput): DocumentIntelligenceResult {
  const text = input.text.replace(/\0/g, '').trim();
  const language = detectDocumentLanguage(text);
  const adapter = adapterFor(language.value ?? 'unknown');
  const taxonomy = extractTaxonomy(text, adapter);
  const parties = { sender: valueFrom(input, 'sender', adapter?.labels.sender), senderDepartment: valueFrom(input, 'senderDepartment', adapter?.labels.department), senderContact: valueFrom(input, 'senderContact', adapter?.labels.contact), recipient: valueFrom(input, 'recipient', adapter?.labels.recipient) };
  const dates = extractDates(text, input, adapter); dates.references = extractReferences(text, adapter);
  const amounts = extractAmounts(text, input), deadlines = extractDeadlines(text, input), deadlineConflicts = findDeadlineConflicts(deadlines), obligations = extractObligations(text, deadlines);
  let consequenceRights = extractConsequencesAndRights(text, deadlines);
  const responseNecessary = fact(obligations.actions.some(x => x.responseNecessary) || deadlines.some(x => x.kind === 'response'), [...obligations.actions.flatMap(x => x.evidence), ...deadlines.filter(x => x.kind === 'response').flatMap(x => x.evidence)], obligations.actions.length || deadlines.some(x => x.kind === 'response') ? 'medium' : 'unknown');
  const keyPoints = [...obligations.actions.map(x => fact(x.requirement, x.evidence, 'medium')), ...deadlines.slice(0, 2).map(x => fact(`${x.kind}: ${x.value || x.source}`, x.evidence, x.confidence))].slice(0, 5);
  const reviewReasons: string[] = [];
  if (!text) reviewReasons.push('No OCR text supplied');
  if (language.confidence === 'unknown') reviewReasons.push('Document language is unknown');
  if (taxonomy.mainCategory.confidence === 'unknown') reviewReasons.push('Main category is unknown');
  if (parties.sender.confidence === 'unknown') reviewReasons.push('Sender is unknown');
  if (deadlines.some(x => x.relative && x.confidence !== 'high')) reviewReasons.push('Relative deadline needs date verification');
  if (typeof input.structuredFields?.dueDate === 'string' && clean(input.structuredFields.dueDate) && !normalizeDocumentDate(input.structuredFields.dueDate)) reviewReasons.push('Structured due date is invalid');
  if (deadlineConflicts.length) reviewReasons.push('Conflicting deadlines need verification');
  if (amounts.items.some(x => x.role === 'unknown')) reviewReasons.push('Unlabelled amount needs verification');
  const riskAssessment = assessRisk(input, deadlines, deadlineConflicts, obligations.actions, obligations.missing, consequenceRights, [
    { field: 'documentType', fact: taxonomy.mainCategory }, { field: 'sender', fact: parties.sender },
    { field: 'recipient', fact: parties.recipient }, { field: 'mainAmount', fact: amounts.main },
  ]);
  consequenceRights = {
    ...consequenceRights,
    riskLevel: riskAssessment.riskLevel,
    warningDetails: [...consequenceRights.warningDetails, ...riskAssessment.warningDetails],
  };
  const reviewRecords: ReviewRecord[] = [
    ['documentType', taxonomy.mainCategory], ['subtype', taxonomy.subtype], ['purpose', taxonomy.purpose],
    ['sender', parties.sender], ['recipient', parties.recipient], ['mainAmount', amounts.main],
    ['deadlines', fact(deadlines.length ? 'detected' : undefined, deadlines.flatMap(x => x.evidence), deadlines.length ? deadlines.some(x => x.confidence === 'high') ? 'high' : 'low' : 'unknown')],
    ['actions', fact(obligations.actions.length ? 'detected' : undefined, obligations.actions.flatMap(x => x.evidence), obligations.actions.length ? 'medium' : 'unknown')],
    ['consequences', fact(consequenceRights.items.length ? 'detected' : undefined, consequenceRights.items.flatMap(x => x.evidence), consequenceRights.items.length ? 'medium' : 'unknown')],
    ['rightsOptions', fact(consequenceRights.rights.length ? 'detected' : undefined, consequenceRights.rights.flatMap(x => x.evidence), consequenceRights.rights.length ? 'medium' : 'unknown')],
    ['caseRelation', fact(taxonomy.mainCategory.value ? 'new' : undefined, taxonomy.mainCategory.evidence, taxonomy.mainCategory.value ? 'low' : 'unknown')],
    ['riskLevel', consequenceRights.riskLevel],
  ].map(([field, value]) => {
    const item = value as Fact<unknown>;
    const confirmed = item.evidence.some(e => e.source === 'structured');
    return { field: field as string, confidence: item.confidence, reason: item.confidence === 'unknown' ? `${field} is unknown` : confirmed ? 'User-confirmed structured value' : 'Automatically extracted; confirm before relying on it', recommendedAction: item.confidence === 'high' ? 'accept' : item.confidence === 'unknown' ? 'unknown' : 'edit', origin: confirmed ? 'confirmed' : 'automatic', decision: confirmed && item.confidence === 'high' ? 'accept' : 'pending', evidence: item.evidence };
  });
  reviewRecords.filter(record => record.confidence === 'low' || record.confidence === 'unknown').forEach(record => reviewReasons.push(`Critical ${record.field} requires review`));
  const summary = taxonomy.mainCategory.value && parties.sender.value ? fact(`${taxonomy.mainCategory.value} document from ${parties.sender.value}`, [...taxonomy.mainCategory.evidence, ...parties.sender.evidence], 'medium') : unknown<string>();
  const nextStep = obligations.actions[0] ? fact(obligations.actions[0].requirement, obligations.actions[0].evidence, 'medium') : unknown<string>();
  const closable = fact(obligations.actions.length === 0 && obligations.missing.length === 0 && deadlines.length === 0 ? true : undefined, [], obligations.actions.length === 0 && obligations.missing.length === 0 && deadlines.length === 0 ? 'low' : 'unknown');
  const priority = { high: 0, medium: 1, low: 2 };
  const sortedActions = [...obligations.actions].sort((a, b) => priority[a.priority] - priority[b.priority]);
  const actionSummary = sortedActions.length ? sortedActions.map(x => x.requirement).join(' ') : 'No action is evidenced.';
  const deadlineDecision = reviewRecords.find(record => record.field === 'deadlines')?.decision;
  const eligibleDeadlineValues = deadlines.filter((deadline, index) => !!deadline.value && !deadline.relative && (deadline.confidence === 'high' || deadline.confidence === 'medium') && deadlineDecision !== 'reject' && deadlineDecision !== 'unknown' && !deadlineConflicts.some(conflict => conflict.deadlineIndexes.includes(index)));
  const deadlineSummary = eligibleDeadlineValues.length ? eligibleDeadlineValues.map(x => `${x.kind}: ${x.value}`).join('; ') : 'No clear deadline was found.';
  const amountDecision = reviewRecords.find(record => record.field === 'mainAmount')?.decision;
  const eligibleAmount = !!amounts.main.value && (amounts.main.role === 'payable' || amounts.main.role === 'total') && (amounts.main.confidence === 'high' || amounts.main.confidence === 'medium') && !normalizeDocumentDate(amounts.main.value) && amountDecision !== 'reject' && amountDecision !== 'unknown';
  const moneySummary = eligibleAmount ? `Main supported amount: ${amounts.main.value}.` : 'The main amount could not be reliably identified.';
  const normal = [summary.value || 'Document details could not be safely classified.', actionSummary, deadlineSummary, moneySummary].join(' ');
  const relations = relationSuggestions(input, dates.references.value || [], parties.sender.value, taxonomy.subtype.value);
  const changes = extractChanges(text);
  const caseRelation: CaseRelation = relations.length ? 'existing' : taxonomy.mainCategory.value ? 'new' : 'uncertain';
  const caseStatus = consequenceRights.riskLevel.value === 'critical' ? 'urgent_review' : obligations.actions.length ? 'action_required' : 'unknown';
  const chain = relations.filter((x): x is RelationSuggestion & { relation: 'response' | 'chain' } => x.relation === 'response' || x.relation === 'chain').map(x => ({ relation: x.relation, evidence: x.reasons.map(reason => ev(reason, 'ocr', x.confidence)), confidence: x.confidence }));
  const plainLanguageExplanation = [summary.value || 'This document could not be clearly classified.', sortedActions[0] ? `Next step: ${sortedActions[0].requirement}` : '', deadlineSummary, moneySummary].filter(Boolean).join(' ');
  const eligibleActionEvidence = sortedActions.some(action => action.evidence.length > 0);
  return { version: DOCUMENT_INTELLIGENCE_VERSION, language, documentLanguage: language, taxonomy, parties, dates, amounts, deadlines, deadlineConflicts, actions: obligations.actions, responseNecessary, missingRequirements: obligations.missing, checklist: obligations.missing, consequences: consequenceRights, rightsOptions: consequenceRights.rights, alternatives: consequenceRights.alternatives, keyPoints, relations, changes, case: { summary, nextStep, closable, relation: fact(caseRelation, relations.flatMap(x => x.reasons.map(reason => ev(reason, 'ocr', x.confidence))), relations.length ? 'medium' : taxonomy.mainCategory.value ? 'low' : 'unknown'), status: fact(caseStatus, [...obligations.actions.flatMap(x => x.evidence), ...consequenceRights.riskLevel.evidence], caseStatus === 'unknown' ? 'unknown' : 'medium'), chain }, explanations: { short: `${summary.value || 'Unknown document.'} ${deadlineSummary}`, normal, detailed: `${normal} Review: ${reviewReasons.length ? reviewReasons.join('; ') : 'no critical unknowns detected.'}` }, plainLanguageExplanation, personalImpact: eligibleAmount || eligibleDeadlineValues.length || eligibleActionEvidence ? normal : 'Personal impact is unknown because no supported obligation, deadline, or amount was found.', actionSummary, deadlineSummary, moneySummary, reviewRequired: reviewReasons.length > 0, reviewReasons, reviewRecords };
}