export type ParsedField = {
  name: string;
  /** Literal OCR value. This remains safe for exact-span consumers. */
  value: string;
  /**
   * A review-only model/deterministic normalization of `value`. It is never
   * used as evidence: `evidence.text` is always the literal OCR span.
   */
  normalizedValue?: string;
  confidence: number;
  validationState: "UNVALIDATED" | "PARTIALLY_VALIDATED" | "VALIDATED" | "INVALID";
  evidence: Array<{ text: string; start: number; end: number; pageIndex: number }>;
  provenance?: "model" | "deterministic" | "model+deterministic";
};

const STATES = new Set<ParsedField["validationState"]>(["UNVALIDATED", "PARTIALLY_VALIDATED", "VALIDATED", "INVALID"]);
const FIELD_ALIASES: Record<string, string> = {
  vendor_name: "sender", sender_name: "sender", institution_name: "sender",
  recipient_name: "recipient", customer_name: "recipient",
  invoice_number: "invoiceNumber", customer_number: "customerNumber",
  reference_number: "referenceNumber", document_date: "documentDate",
  invoice_date: "documentDate", due_date: "dueDate", total_amount: "amount",
  gross_amount: "amount", net_amount: "netAmount", vat_amount: "vatAmount",
  payment_terms: "paymentTerms", bank_iban: "iban", bank_bic: "bic",
};

/** API names are canonicalized to the mobile structured-field contract. */
export function canonicalFieldName(name: string) {
  return FIELD_ALIASES[name.trim().toLowerCase()] ?? name.trim();
}

/** Rejects, rather than repairs, model evidence that does not point into the OCR source. */
export function parseGeminiFields(value: unknown, source: string): ParsedField[] {
  if (!Array.isArray(value) || value.length > 100) return [];
  const fields: ParsedField[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const evidence = Array.isArray(raw.evidence) ? raw.evidence[0] as Record<string, unknown> | undefined : undefined;
    const name = typeof raw.name === "string" ? canonicalFieldName(raw.name) : "";
    const fieldValue = typeof raw.value === "string" ? raw.value : "";
    const normalizedValue = typeof raw.normalizedValue === "string" ? raw.normalizedValue : undefined;
    const confidence = raw.confidence;
    const state = raw.validationState;
    const startOffset = evidence?.start;
    const endOffset = evidence?.end;
    const evidenceText = evidence?.text;
    const pageIndex = evidence?.pageIndex;
    if (!/^[a-z][a-z0-9_]{0,63}$/i.test(name) || !fieldValue || fieldValue.length > 4000 ||
       (normalizedValue !== undefined && (!normalizedValue || normalizedValue.length > 4000)) ||
      typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 ||
      typeof state !== "string" || !STATES.has(state as ParsedField["validationState"]) ||
      typeof startOffset !== "number" || !Number.isInteger(startOffset) || startOffset < 0 ||
      typeof endOffset !== "number" || !Number.isInteger(endOffset) || endOffset <= startOffset || endOffset > source.length ||
        typeof evidenceText !== "string" || evidenceText !== source.slice(startOffset, endOffset) || evidenceText !== fieldValue ||
      (pageIndex !== undefined && (typeof pageIndex !== "number" || !Number.isInteger(pageIndex) || pageIndex < 0))) continue;
    // Passing every exact-span check proves that the value occurs in the OCR
    // source, but it does not prove the model's semantic label. Promote only to
    // PARTIALLY_VALIDATED so clients may show it for human review, never as a
    // canonical automatically accepted fact.
    const validationState = state === "INVALID" ? "INVALID" : "PARTIALLY_VALIDATED";
    fields.push({
      name, value: evidenceText,
      ...(normalizedValue !== undefined && normalizedValue !== evidenceText ? { normalizedValue } : {}),
      confidence, validationState, provenance: "model",
      evidence: [{ text: evidenceText, start: startOffset, end: endOffset, pageIndex: typeof pageIndex === "number" ? pageIndex : 0 }],
    });
  }
  return fields;
}

export const OCR_PAGE_SEPARATOR = "\n\f\n";

/** Converts joined-text offsets to stored page-local offsets; separator/cross-page spans are rejected. */
export function mapFieldsToPages(fields: ParsedField[], pages: string[]): ParsedField[] {
  const ranges: Array<{ start: number; end: number; pageIndex: number }> = [];
  let cursor = 0;
  for (const [pageIndex, page] of pages.entries()) {
    ranges.push({ start: cursor, end: cursor + page.length, pageIndex });
    cursor += page.length + (pageIndex < pages.length - 1 ? OCR_PAGE_SEPARATOR.length : 0);
  }
  return fields.flatMap((field) => {
    const evidence = field.evidence[0];
    const range = ranges.find((candidate) => evidence.start >= candidate.start && evidence.end <= candidate.end);
    if (!range) return [];
    const page = pages[range.pageIndex];
    const start = evidence.start - range.start;
    const end = evidence.end - range.start;
    if (page.slice(start, end) !== evidence.text) return [];
    return [{ ...field, evidence: [{ text: evidence.text, start, end, pageIndex: range.pageIndex }] }];
  });
}