import type { ParsedField } from "./documentaFields";

const ESSENTIALS = new Set(["sender", "recipient", "invoiceNumber", "customerNumber", "documentDate", "dueDate", "amount", "netAmount", "vatAmount", "paymentTerms"]);

function field(name: string, source: string, start: number, end: number): ParsedField | undefined {
  const value = source.slice(start, end);
  return value && value === value.trim() && ESSENTIALS.has(name)
    ? { name, value, confidence: 0.92, validationState: "PARTIALLY_VALIDATED", provenance: "deterministic", evidence: [{ text: value, start, end, pageIndex: 0 }] }
    : undefined;
}

/** Conservative invoice-only extraction. Every returned value is an unmodified OCR span. */
export function extractInvoiceEssentials(source: string): ParsedField[] {
  if (!/\b(invoice|rechnung|factu(?:re|ra)|számla)\b/i.test(source)) return [];
  const result: ParsedField[] = [];
  const add = (name: string, expression: RegExp) => {
    const match = expression.exec(source);
    if (!match || match.index === undefined) return;
    const value = match[1];
    const valueStart = match.index + match[0].lastIndexOf(value);
    const parsed = field(name, source, valueStart, valueStart + value.length);
    if (parsed) result.push(parsed);
  };
  // Labels make these captures reproducible; unlabelled candidates are deliberately omitted.
  add("invoiceNumber", /(?:invoice\s*(?:no\.?|nr\.?|number)|rechnungs?\s*(?:nummer|nr\.?)|számla\s*(?:szám|no\.?|nr\.?))\s*[:#]?\s*([A-Z0-9][A-Z0-9._/-]{1,80})/i);
  add("customerNumber", /(?:customer\s*(?:no\.?|nr\.?|number)|client\s*(?:no\.?|nr\.?|number)|kunden?(?:nummer|nr\.?)|vevő\s*(?:szám|no\.?|nr\.?))\s*[:#]?\s*([A-Z0-9][A-Z0-9._/-]{1,80})/i);
  add("documentDate", /(?:invoice\s+date|rechnungsdatum|date|datum)\s*[:#]?\s*((?:\d{4}-\d{2}-\d{2})|(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}))/i);
  add("dueDate", /(?:due\s+date|fällig(?:keitsdatum)?|zahlbar\s+bis|esedékesség)\s*[:#]?\s*((?:\d{4}-\d{2}-\d{2})|(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}))/i);
  add("amount", /(?:total|grand\s+total|gesamt(?:betrag)?|zu\s+zahlen|endbetrag)\s*[:#]?\s*(\d{1,3}(?:[ .]\d{3})*(?:[,.]\d{2})\s?(?:EUR|USD|HUF|Ft|€))/i);
  add("netAmount", /(?:net(?:to)?|subtotal|zwischenbetrag)\s*[:#]?\s*(\d{1,3}(?:[ .]\d{3})*(?:[,.]\d{2})\s?(?:EUR|USD|HUF|Ft|€))/i);
  add("vatAmount", /(?:vat|mwst|ust|umsatzsteuer|áfa)\s*(?:\(?\d{1,2}\s?%\)?)?\s*[:#]?\s*(\d{1,3}(?:[ .]\d{3})*(?:[,.]\d{2})\s?(?:EUR|USD|HUF|Ft|€))/i);
  add("paymentTerms", /(?:payment\s+terms|zahlungsziel|zahlungsbedingungen|payment\s+condition)\s*[:#]?\s*([^\r\n\f]{2,160})/i);
  // Parties require explicit labels and use the following non-empty line.
  add("sender", /(?:sender|from|absender|rechnungssteller)\s*[:#]?\s*\r?\n?\s*([^\r\n\f]{2,160})/i);
  add("recipient", /(?:recipient|bill\s+to|empfänger|rechnung\s+an)\s*[:#]?\s*\r?\n?\s*([^\r\n\f]{2,160})/i);
  return result;
}

/** Same name/value/span is one fact; deterministic provenance is retained when both agree. */
export function mergeEvidenceFields(model: ParsedField[], deterministic: ParsedField[]): ParsedField[] {
  const merged = new Map<string, ParsedField>();
  for (const candidate of [...model, ...deterministic]) {
    const evidence = candidate.evidence[0];
    const key = `${candidate.name}\u0000${candidate.value}\u0000${evidence.start}\u0000${evidence.end}`;
    const existing = merged.get(key);
    merged.set(key, existing
      ? { ...existing, provenance: existing.provenance === candidate.provenance ? existing.provenance : "model+deterministic" }
      : candidate);
  }
  return [...merged.values()];
}