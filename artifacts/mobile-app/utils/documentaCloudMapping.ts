import type { DocumentIntelligenceResult, Evidence, Fact } from './documentIntelligence';

export type CloudEvidence = { text: string; start: number; end: number; pageIndex?: number };
export type CloudFact = { value: string; normalizedValue?: string; confidence: number; validationState: string; provenance?: 'model' | 'deterministic' | 'model+deterministic'; evidence: CloudEvidence[] };
export type CloudOcrPage = { pageIndex: number; text: string };
export type CloudOcrResult = { text: string; pages: CloudOcrPage[] };
export type CloudIntelligence = { family: string; type: string; summary?: string; confidence: number; validationState?: string; model?: string; fields?: Record<string, CloudFact>; ocrPages?: CloudOcrPage[]; sourceText?: string; canonical?: import('./documentaCloud').CanonicalCloudDocument };
export type CloudPipelineStageState = 'not_requested' | 'pending' | 'running' | 'skipped' | 'succeeded' | 'failed';
export type CloudPipelineFailureReason = 'quota' | 'service_unavailable' | 'no_readable_text' | 'local_ocr_failed' | 'invalid_response';
export type CloudPipelineFailure = {
  stage: 'local_ocr' | 'document_ai_ocr' | 'gemini';
  reason: CloudPipelineFailureReason;
  message: string;
};
export type ScanCloudPipelineState = {
  optedIn: boolean;
  localOcr: { state: 'succeeded' | 'empty' | 'failed'; textAvailable: boolean };
  documentAiOcr: { state: CloudPipelineStageState };
  gemini: { state: CloudPipelineStageState; input?: 'document_ai_ocr' | 'local_ocr' };
  fallbackUsed: boolean;
  failures: CloudPipelineFailure[];
  /** First normalized failure, retained as a convenient persisted/UI summary. */
  failureReason?: CloudPipelineFailureReason;
  finalProvider: 'local_only' | 'cloud_processing' | 'document_ai_gemini' | 'local_ocr_gemini' | 'local_unavailable';
  cloudState: 'offline' | 'cloud' | 'unavailable' | 'quota';
};
export type ScanCloudPipelineResult = {
  pipeline: ScanCloudPipelineState;
  cloudIntelligence?: CloudIntelligence;
};

type ScanCloudPipelineInput = {
  optedIn: boolean;
  localText: string;
  localOcrStatus: 'complete' | 'partial' | 'empty' | 'failed';
  title: string;
  pageUris: string[];
};

type ScanCloudPipelineDependencies = {
  uploadDocumentAiOcr: (pageUris: string[]) => Promise<CloudOcrResult | undefined>;
  processGemini: (text: string, title: string) => Promise<CloudIntelligence>;
};

function normalizedPipelineFailure(stage: CloudPipelineFailure['stage'], error: unknown): CloudPipelineFailure {
  const value = error && typeof error === 'object' ? error as { state?: unknown; message?: unknown } : {};
  const reason: CloudPipelineFailureReason =
    value.state === 'quota'
      ? 'quota'
      : typeof value.message === 'string' && /no readable text/i.test(value.message)
        ? 'no_readable_text'
        : typeof value.message === 'string' && /safely read|invalid response/i.test(value.message)
          ? 'invalid_response'
          : 'service_unavailable';
  return {
    stage,
    reason,
    message: typeof value.message === 'string' && value.message.trim()
      ? value.message.trim()
      : stage === 'document_ai_ocr'
        ? 'Document AI OCR is unavailable.'
        : 'Gemini processing is unavailable.',
  };
}

/**
 * Testable scan-cloud state machine. It never invokes either remote dependency
 * without opt-in. Document AI failure is recorded even when Gemini can
 * explicitly continue from local OCR.
 */
export async function runScanCloudPipeline(
  input: ScanCloudPipelineInput,
  dependencies: ScanCloudPipelineDependencies,
): Promise<ScanCloudPipelineResult> {
  const localText = input.localText.trim();
  const localState = input.localOcrStatus === 'failed'
    ? 'failed'
    : localText
      ? 'succeeded'
      : 'empty';
  const failures: CloudPipelineFailure[] = localState === 'failed'
    ? [{ stage: 'local_ocr', reason: 'local_ocr_failed', message: 'Local OCR failed.' }]
    : [];
  const base = {
    optedIn: input.optedIn,
    localOcr: { state: localState, textAvailable: !!localText },
  } as const;
  if (!input.optedIn) {
    return {
      pipeline: {
        ...base,
        documentAiOcr: { state: 'not_requested' },
        gemini: { state: 'not_requested' },
        fallbackUsed: false,
        failures,
        ...(failures[0] ? { failureReason: failures[0].reason } : {}),
        finalProvider: localText ? 'local_only' : 'local_unavailable',
        cloudState: 'offline',
      },
    };
  }

  let cloudOcr: CloudOcrResult | undefined;
  try {
    cloudOcr = await dependencies.uploadDocumentAiOcr(input.pageUris);
    if (!cloudOcr?.text.trim()) throw new Error('Document AI OCR returned no readable text.');
  } catch (error) {
    failures.push(normalizedPipelineFailure('document_ai_ocr', error));
  }
  const sourceText = cloudOcr?.text.trim() || localText;
  if (!sourceText) {
    const first = failures[0];
    return {
      pipeline: {
        ...base,
        documentAiOcr: { state: 'failed' },
        gemini: { state: 'skipped' },
        fallbackUsed: false,
        failures,
        ...(first ? { failureReason: first.reason } : {}),
        finalProvider: 'local_unavailable',
        cloudState: failures.some((failure) => failure.reason === 'quota') ? 'quota' : 'unavailable',
      },
    };
  }

  const inputProvider = cloudOcr ? 'document_ai_ocr' : 'local_ocr';
  try {
    const processed = await dependencies.processGemini(sourceText, input.title);
    return {
      pipeline: {
        ...base,
        documentAiOcr: { state: cloudOcr ? 'succeeded' : 'failed' },
        gemini: { state: 'succeeded', input: inputProvider },
        fallbackUsed: !cloudOcr,
        failures,
        ...(failures[0] ? { failureReason: failures[0].reason } : {}),
        finalProvider: cloudOcr ? 'document_ai_gemini' : 'local_ocr_gemini',
        cloudState: 'cloud',
      },
      cloudIntelligence: {
        ...processed,
        sourceText,
        ...(cloudOcr ? { ocrPages: cloudOcr.pages } : {}),
      },
    };
  } catch (error) {
    failures.push(normalizedPipelineFailure('gemini', error));
    const first = failures[0];
    return {
      pipeline: {
        ...base,
        documentAiOcr: { state: cloudOcr ? 'succeeded' : 'failed' },
        gemini: { state: 'failed', input: inputProvider },
        fallbackUsed: !cloudOcr,
        failures,
        ...(first ? { failureReason: first.reason } : {}),
        finalProvider: localText ? 'local_only' : 'local_unavailable',
        cloudState: failures.some((failure) => failure.reason === 'quota') ? 'quota' : 'unavailable',
      },
    };
  }
}

export function planCloudOcrChunks<T>(pages: T[], maximum = 5): T[][] {
  if (!Number.isInteger(maximum) || maximum < 1) throw new Error('Cloud OCR chunk size must be positive.');
  const chunks: T[][] = [];
  for (let index = 0; index < pages.length; index += maximum) chunks.push(pages.slice(index, index + maximum));
  return chunks;
}

export function mergeCloudOcrChunks(chunks: Array<{ requestedPageIndexes: number[]; result: CloudOcrResult }>): CloudOcrResult | undefined {
  const pages = chunks.flatMap(({ requestedPageIndexes, result }) =>
    result.pages.flatMap((page, position): CloudOcrPage[] => {
      const pageIndex = requestedPageIndexes.includes(page.pageIndex)
        ? page.pageIndex
        : requestedPageIndexes[page.pageIndex] ?? requestedPageIndexes[position];
      return typeof pageIndex === 'number' ? [{ pageIndex, text: page.text }] : [];
    }),
  ).sort((a, b) => a.pageIndex - b.pageIndex);
  return pages.length ? { pages, text: pages.map((page) => page.text).join('\n') } : undefined;
}

/** Converts the API's evidence-field array to the keyed form used by the mobile merger. */
export function normalizeCloudFields(value: unknown): Record<string, CloudFact> | undefined {
  const canonicalFieldName = (name: string) => ({
    vendor_name: 'sender',
    sender_name: 'sender',
    recipient_name: 'recipient',
    invoice_number: 'invoiceNumber',
    customer_number: 'customerNumber',
    reference_number: 'referenceNumber',
    contract_number: 'contractNumber',
    insurance_number: 'insuranceNumber',
    tax_number: 'taxNumber',
    patient_number: 'patientNumber',
    school_reference: 'schoolReference',
    invoice_date: 'documentDate',
    document_date: 'documentDate',
    due_date: 'dueDate',
    total_amount: 'amount',
    net_amount: 'netAmount',
    vat_amount: 'vatAmount',
    payment_terms: 'paymentTerms',
    document_type: 'documentType',
    document_category: 'category',
    sub_category: 'subcategory',
    payroll_period: 'payrollPeriod',
  } as Record<string, string>)[name] ?? name;
  const entries = Array.isArray(value)
    ? value.map((item) => {
       const field = item && typeof item === 'object' ? item as { name?: unknown; value?: unknown; normalizedValue?: unknown; confidence?: unknown; validationState?: unknown; provenance?: unknown; evidence?: unknown } : {};
      return [typeof field.name === 'string' ? canonicalFieldName(field.name) : field.name, field] as const;
    })
    : value && typeof value === 'object'
      ? Object.entries(value as Record<string, unknown>).map(([name, field]) => [canonicalFieldName(name), field] as const)
      : [];
  const fields: Record<string, CloudFact> = {};
  for (const [name, raw] of entries) {
    if (typeof name !== 'string' || !name || !raw || typeof raw !== 'object') continue;
    const field = raw as { value?: unknown; normalizedValue?: unknown; confidence?: unknown; validationState?: unknown; provenance?: unknown; evidence?: unknown };
    if (typeof field.value !== 'string' || typeof field.confidence !== 'number' || typeof field.validationState !== 'string' || !Array.isArray(field.evidence)) continue;
    const evidence = field.evidence.flatMap((item): CloudEvidence[] => {
      if (!item || typeof item !== 'object') return [];
      const span = item as { text?: unknown; start?: unknown; end?: unknown; pageIndex?: unknown };
      if (typeof span.text !== 'string' || !Number.isInteger(span.start) || !Number.isInteger(span.end)) return [];
      return [{
        text: span.text, start: span.start as number, end: span.end as number,
        ...(typeof span.pageIndex === 'number' && Number.isInteger(span.pageIndex) ? { pageIndex: span.pageIndex } : {}),
      }];
    });
    fields[name] = {
      value: field.value, confidence: field.confidence, validationState: field.validationState, evidence,
      ...(typeof field.normalizedValue === 'string' && field.normalizedValue.trim() ? { normalizedValue: field.normalizedValue.trim() } : {}),
      ...(field.provenance === 'model' || field.provenance === 'deterministic' || field.provenance === 'model+deterministic' ? { provenance: field.provenance } : {}),
    };
  }
  return Object.keys(fields).length ? fields : undefined;
}

/**
 * Accepts the documented pages response and the transitional ocrText array
 * response. Page indexes stay attached to their text; `text` is only the
 * ordered concatenation used as an optional cloud-processing input.
 */
export function parseCloudOcrResponse(value: unknown): CloudOcrResult | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const body = value as { pages?: unknown; ocrText?: unknown; text?: unknown };
  const source = Array.isArray(body.pages) ? body.pages : Array.isArray(body.ocrText) ? body.ocrText : undefined;
  if (!source) return typeof body.text === 'string' && body.text.trim()
    ? { text: body.text.trim(), pages: [{ pageIndex: 0, text: body.text.trim() }] }
    : undefined;
  const pages = source.flatMap((item, fallbackIndex): CloudOcrPage[] => {
    if (typeof item === 'string') return item.trim() ? [{ pageIndex: fallbackIndex, text: item.trim() }] : [];
    if (!item || typeof item !== 'object') return [];
    const page = item as { pageIndex?: unknown; text?: unknown };
    return typeof page.text === 'string' && page.text.trim() && typeof page.pageIndex === 'number' && Number.isInteger(page.pageIndex) && page.pageIndex >= 0
      ? [{ pageIndex: page.pageIndex, text: page.text.trim() }]
      : [];
  }).sort((a, b) => a.pageIndex - b.pageIndex);
  return pages.length ? { pages, text: pages.map((page) => page.text).join('\n') } : undefined;
}

function safeCloudFact(value: unknown, ocrText: string): Fact<string> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Partial<CloudFact>;
  if (typeof item.value !== 'string' || typeof item.confidence !== 'number' || item.confidence < 0.85 || item.validationState !== 'VALIDATED' || !Array.isArray(item.evidence)) return undefined;
  const evidence: Evidence[] = item.evidence.flatMap((span) =>
    typeof span?.text === 'string' && span.text === item.value && Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0 && span.end > span.start && span.end <= ocrText.length && ocrText.slice(span.start, span.end) === span.text
      ? [{ text: span.text, start: span.start, end: span.end, source: 'ocr' as const, confidence: 'high' as const }]
      : [],
  );
  return evidence.length ? { value: item.value, confidence: 'high', evidence, validation: 'valid' } : undefined;
}

export type CloudReviewSuggestion = { value: string; provenance: 'cloud_evidence' | 'cloud_classification'; autoFill?: true };

const CLOUD_CATEGORY_TO_REVIEW_CATEGORY: Record<string, string> = {
  finance: 'Finanzen',
  insurance: 'Versicherung',
  authority: 'Behörden',
  work: 'Arbeit & Bildung',
  education: 'Arbeit & Bildung',
  contract: 'Verträge',
  health: 'Gesundheit',
  housing: 'Wohnen',
  banking: 'Bank',
  tax: 'Steuern',
  utilities: 'Wohnen',
  telecom: 'Verträge',
  transport: 'Auto',
  legal: 'Behörden',
  identity: 'Behörden',
  family: 'Familie',
  correspondence: 'Sonstiges',
};

const CLOUD_TYPE_TO_REVIEW_TYPE: Record<string, string> = {
  invoice: 'Rechnung',
  payroll: 'Lohnabrechnung / Gehaltsabrechnung',
  bank_document: 'Kontoauszug',
  insurance_letter: 'Versicherungsbrief',
  authority_decision: 'Bescheid',
  contract: 'Vertrag',
  notice: 'Brief',
  letter: 'Brief',
};

function safeCloudReviewFact(value: unknown, ocrText: string): value is CloudFact {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CloudFact>;
  if (typeof item.value !== 'string' || typeof item.confidence !== 'number' || item.confidence < 0.85 ||
      !['VALIDATED', 'PARTIALLY_VALIDATED'].includes(item.validationState ?? '') || !Array.isArray(item.evidence)) return false;
  return item.evidence.some((span) =>
    typeof span?.text === 'string' && span.text === item.value &&
    Number.isInteger(span.start) && Number.isInteger(span.end) &&
    span.start >= 0 && span.end > span.start && span.end <= ocrText.length &&
    ocrText.slice(span.start, span.end) === span.text,
  );
}

/** Review-only structured suggestions. They are exact-span checked and never replace an existing local value. */
export function cloudReviewSuggestions(cloud: CloudIntelligence | undefined, ocrText: string): Record<string, CloudReviewSuggestion> {
  const suggestions: Record<string, CloudReviewSuggestion> = {};
  for (const [name, fact] of Object.entries(cloud?.fields ?? {})) {
    // These values are candidates for the review form, never a silent model
    // assertion.  `safeCloudReviewFact` below still requires an exact OCR
    // span, a high confidence score and a validated state.
    if (!/^(title|sender|recipient|category|subcategory|documentType|subtype|purpose|invoiceNumber|customerNumber|referenceNumber|contractNumber|insuranceNumber|iban|bic|taxNumber|patientNumber|schoolReference|documentDate|dueDate|amount|currency|netAmount|vatAmount|paymentTerms|payrollPeriod|person|status)$/i.test(name)) continue;
    if (safeCloudReviewFact(fact, ocrText)) {
      const deterministic = fact.provenance === 'deterministic' || fact.provenance === 'model+deterministic';
      suggestions[name] = {
        value: deterministic && fact.normalizedValue ? fact.normalizedValue : fact.value,
        provenance: 'cloud_evidence',
        ...(deterministic && fact.validationState === 'VALIDATED' ? { autoFill: true as const } : {}),
      };
    }
  }
  // Family/type are semantic classifications rather than literal substrings.
  // They may fill blank review fields but never overwrite a local/user value.
  if ((cloud?.confidence ?? 0) >= 0.75) {
    if (cloud?.family?.trim() && cloud.family !== 'unknown/novel') {
      const value = CLOUD_CATEGORY_TO_REVIEW_CATEGORY[cloud.family.trim().toLowerCase()];
      if (value) suggestions.category = { value, provenance: 'cloud_classification' };
    }
    if (cloud?.type?.trim() && cloud.type !== 'unknown') {
      const value = CLOUD_TYPE_TO_REVIEW_TYPE[cloud.type.trim().toLowerCase()];
      if (value) suggestions.documentType = { value, provenance: 'cloud_classification' };
    }
  }
  return suggestions;
}

/**
 * Applies evidence-backed cloud candidates only to blanks. This is shared by
 * the edit screen and delayed completion handling so a cloud response can
 * enrich a saved scan without replacing a value the person already reviewed.
 */
export function mergeCloudReviewValues<T extends Record<string, string | undefined>>(
  current: T,
  cloud: CloudIntelligence | undefined,
  ocrText: string,
): { values: T; conflicts: string[] } {
  const suggestions = cloudReviewSuggestions(cloud, ocrText);
  const values: Record<string, string | undefined> = { ...current };
  const conflicts: string[] = [];
  for (const [field, suggestion] of Object.entries(suggestions)) {
    const existing = values[field];
    if (!existing?.trim() && suggestion.autoFill) {
      values[field] = suggestion.value;
    } else if ((!existing?.trim() || existing.trim() !== suggestion.value.trim()) && !suggestion.autoFill) {
      conflicts.push(field);
    } else if (existing?.trim() !== suggestion.value.trim()) {
      conflicts.push(field);
    }
  }
  return { values: values as T, conflicts };
}

/** Model prose is never canonical. Only trusted evidence-backed non-sensitive facts may refine local intelligence. */
export function mergeCloudEvidence(local: DocumentIntelligenceResult, cloud: CloudIntelligence | undefined, ocrText: string): DocumentIntelligenceResult {
  const subtype = safeCloudFact(cloud?.fields?.subtype, ocrText);
  const purpose = safeCloudFact(cloud?.fields?.purpose, ocrText);
  if (/medical|health|legal|financial|finance|insurance|tax/i.test(cloud?.family ?? '') || (!subtype && !purpose)) return local;
  return { ...local, taxonomy: { ...local.taxonomy, ...(subtype ? { subtype } : {}), ...(purpose ? { purpose } : {}) } };
}