export type ParsedField = {
  name: string;
  value: string;
  confidence: number;
  validationState: "UNVALIDATED" | "PARTIALLY_VALIDATED" | "VALIDATED" | "INVALID";
  evidence: Array<{ text: string; start: number; end: number; pageIndex: number }>;
  provenance?: "model" | "deterministic" | "model+deterministic";
};

const STATES = new Set<ParsedField["validationState"]>(["UNVALIDATED", "PARTIALLY_VALIDATED", "VALIDATED", "INVALID"]);

/** Rejects, rather than repairs, model evidence that does not point into the OCR source. */
export function parseGeminiFields(value: unknown, source: string): ParsedField[] {
  if (!Array.isArray(value) || value.length > 100) return [];
  const fields: ParsedField[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const evidence = Array.isArray(raw.evidence) ? raw.evidence[0] as Record<string, unknown> | undefined : undefined;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const fieldValue = typeof raw.value === "string" ? raw.value : "";
    const confidence = raw.confidence;
    const state = raw.validationState;
    const startOffset = evidence?.start;
    const endOffset = evidence?.end;
    const evidenceText = evidence?.text;
    const pageIndex = evidence?.pageIndex;
    if (!/^[a-z][a-z0-9_]{0,63}$/i.test(name) || !fieldValue || fieldValue.length > 4000 ||
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
    fields.push({ name, value: fieldValue, confidence, validationState, provenance: "model", evidence: [{ text: evidenceText, start: startOffset, end: endOffset, pageIndex: typeof pageIndex === "number" ? pageIndex : 0 }] });
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