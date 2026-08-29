import type { DocumentIntelligenceResult, Evidence, Fact } from './documentIntelligence';

export type CloudEvidence = { text: string; start: number; end: number; pageIndex?: number };
export type CloudFact = { value: string; confidence: number; validationState: string; evidence: CloudEvidence[] };
export type CloudOcrPage = { pageIndex: number; text: string };
export type CloudOcrResult = { text: string; pages: CloudOcrPage[] };
export type CloudIntelligence = { family: string; type: string; summary?: string; confidence: number; validationState?: string; model?: string; fields?: Record<string, CloudFact>; ocrPages?: CloudOcrPage[]; sourceText?: string };

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
  const entries = Array.isArray(value)
    ? value.map((item) => {
      const field = item && typeof item === 'object' ? item as { name?: unknown; value?: unknown; confidence?: unknown; validationState?: unknown; evidence?: unknown } : {};
      return [field.name, field] as const;
    })
    : value && typeof value === 'object'
      ? Object.entries(value as Record<string, unknown>)
      : [];
  const fields: Record<string, CloudFact> = {};
  for (const [name, raw] of entries) {
    if (typeof name !== 'string' || !name || !raw || typeof raw !== 'object') continue;
    const field = raw as { value?: unknown; confidence?: unknown; validationState?: unknown; evidence?: unknown };
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
    fields[name] = { value: field.value, confidence: field.confidence, validationState: field.validationState, evidence };
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
    typeof span?.text === 'string' && Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0 && span.end > span.start && span.end <= ocrText.length && ocrText.slice(span.start, span.end) === span.text
      ? [{ text: span.text, start: span.start, end: span.end, source: 'ocr' as const, confidence: 'high' as const }]
      : [],
  );
  return evidence.length ? { value: item.value, confidence: 'high', evidence, validation: 'valid' } : undefined;
}

/** Model prose is never canonical. Only trusted evidence-backed non-sensitive facts may refine local intelligence. */
export function mergeCloudEvidence(local: DocumentIntelligenceResult, cloud: CloudIntelligence | undefined, ocrText: string): DocumentIntelligenceResult {
  const subtype = safeCloudFact(cloud?.fields?.subtype, ocrText);
  const purpose = safeCloudFact(cloud?.fields?.purpose, ocrText);
  if (/medical|health|legal|financial|finance|insurance|tax/i.test(cloud?.family ?? '') || (!subtype && !purpose)) return local;
  return { ...local, taxonomy: { ...local.taxonomy, ...(subtype ? { subtype } : {}), ...(purpose ? { purpose } : {}) } };
}