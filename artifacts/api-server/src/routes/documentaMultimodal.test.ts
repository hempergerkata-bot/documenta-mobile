import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { canonicalQualityGate, evidenceSupportsCanonicalFact, multimodalPageCount, selectCanonicalWithFallback } from "./documentaIntelligence";

async function routeSource() {
  try { return await readFile("src/routes/documentaIntelligence.ts", "utf8"); }
  catch { return readFile("artifacts/api-server/src/routes/documentaIntelligence.ts", "utf8"); }
}

test("multimodal production route is Flash-primary and excludes Document AI", async () => {
  const source = await routeSource();
  const section = source.slice(source.indexOf('router.post("/documenta/documents/multimodal"'), source.indexOf('router.post("/documenta/documents/process"'));
  assert.match(section, /callGeminiMultimodal/);
  assert.match(source, /gemini-3-flash-preview/);
  assert.doesNotMatch(section, /documentAiOcr|DocumentProcessorServiceClient/);
});

test("Pro is guarded by canonical quality validation", async () => {
  const source = await routeSource();
  const section = source.slice(source.indexOf('router.post("/documenta/documents/multimodal"'), source.indexOf('router.post("/documenta/documents/process"'));
  assert.match(section, /selectCanonicalWithFallback\(expectedPageCount/);
  assert.match(source, /gemini-3\.1-pro-preview/);
  assert.match(source, /export function canonicalQualityGate/);
});

const canonical = (sourcePages: Array<{ pageIndex: number; text: string }>) => ({
  title: "Notice", family: "authority", confidence: .9, summary: "A dated notice",
  sourcePages, evidence: [{ field: "documentDate", text: "2025-01-01", pageIndex: 0 }],
  documentDate: "2025-01-01", amounts: [], references: [],
});

test("quality gate rejects duplicate, missing, and out-of-range source indexes", () => {
  assert.deepEqual(canonicalQualityGate(canonical([{ pageIndex: 0, text: "2025-01-01" }]), 1), []);
  assert.ok(canonicalQualityGate(canonical([{ pageIndex: 0, text: "2025-01-01" }, { pageIndex: 0, text: "duplicate" }]), 2).includes("source_pages"));
  assert.ok(canonicalQualityGate(canonical([{ pageIndex: 2, text: "2025-01-01" }]), 1).includes("source_pages"));
  assert.ok(canonicalQualityGate(canonical([]), 1).includes("source_pages"));
});

test("real PDF parser counts compressed multipage PDFs", async () => {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < 6; index += 1) pdf.addPage();
  const bytes = await pdf.save({ useObjectStreams: true });
  const count = await multimodalPageCount([{ mimeType: "application/pdf", contentBase64: Buffer.from(bytes).toString("base64") }]);
  assert.equal(count, 6);
});

function grounded(overrides: Record<string, unknown>, evidence: Array<{ field: string; text: string; pageIndex: number }>) {
  const text = evidence.map(item => item.text).join(" | ");
  return {
    title: "Document", family: "finance", confidence: .91, summary: "Summary",
    sourcePages: [{ pageIndex: 0, text }], evidence, amounts: [], references: [],
    dueDates: [], actions: [], documentDate: null, iban: null, sender: null, recipient: null,
    ...overrides,
  };
}

test("every populated high-impact fact requires identity-matched literal evidence", () => {
  const cases: Array<[string, Record<string, unknown>, string, string]> = [
    ["amount", { amounts: [{ literal: "125.00 EUR" }] }, "amount", "999.00 EUR"],
    ["reference", { references: [{ value: "REF-123" }] }, "reference_number", "REF-999"],
    ["document_date", { documentDate: "2025-02-03" }, "document_date", "2025-02-04"],
    ["due_date", { dueDates: [{ value: "2025-03-01" }] }, "due_date", "2025-03-02"],
    ["iban", { iban: "DE02120300000000202051" }, "iban", "DE02120300000000202052"],
    ["sender", { sender: "Example Sender" }, "sender", "Different Sender"],
    ["recipient", { recipient: "Example Recipient" }, "recipient", "Different Recipient"],
    ["action", { actions: ["Submit the signed form"] }, "action", "Ignore the signed form"],
  ];
  for (const [failure, facts, field, quote] of cases) {
    const candidate = grounded(facts, [{ field, text: quote, pageIndex: 0 }]);
    assert.ok(canonicalQualityGate(candidate, 1).includes(`${failure}_evidence`), failure);
    assert.equal(evidenceSupportsCanonicalFact(candidate.evidence[0], candidate), false);
  }
});

test("matching evidence validates only its exact corresponding fact", () => {
  const candidate = grounded({ amounts: [{ literal: "125.00 EUR" }], references: [{ value: "REF-123" }] }, [
    { field: "amount", text: "Total 125.00 EUR", pageIndex: 0 },
    { field: "reference_number", text: "Reference REF-123", pageIndex: 0 },
  ]);
  assert.deepEqual(canonicalQualityGate(candidate, 1), []);
  assert.equal(evidenceSupportsCanonicalFact(candidate.evidence[0], candidate), true);
  assert.equal(evidenceSupportsCanonicalFact({ field: "reference_number", text: "Reference 125.00 EUR", pageIndex: 0 }, candidate), false);
});

test("valid Flash is returned without Pro; mismatched Flash invokes Pro exactly once", async () => {
  const valid = grounded({ amounts: [{ literal: "125.00 EUR" }] }, [{ field: "amount", text: "Total 125.00 EUR", pageIndex: 0 }]);
  let proCalls = 0;
  const flashOnly = await selectCanonicalWithFallback(1, async () => ({ raw: valid, model: "flash" }), async () => {
    proCalls += 1; return { raw: valid, model: "pro" };
  });
  assert.equal(flashOnly?.provider, "gemini_flash");
  assert.equal(proCalls, 0);
  const invalid = grounded({ amounts: [{ literal: "125.00 EUR" }] }, [{ field: "amount", text: "Total 999.00 EUR", pageIndex: 0 }]);
  const recovered = await selectCanonicalWithFallback(1, async () => ({ raw: invalid, model: "flash" }), async () => {
    proCalls += 1; return { raw: valid, model: "pro" };
  });
  assert.equal(recovered?.provider, "gemini_pro");
  assert.equal(proCalls, 1);
});

test("mismatched Pro fails safely and exposes no validated canonical facts", async () => {
  const invalid = grounded({ references: [{ value: "REF-123" }] }, [{ field: "reference_number", text: "Reference REF-999", pageIndex: 0 }]);
  let proCalls = 0;
  const result = await selectCanonicalWithFallback(1, async () => ({ raw: invalid, model: "flash" }), async () => {
    proCalls += 1; return { raw: invalid, model: "pro" };
  });
  assert.equal(proCalls, 1);
  assert.equal(result, undefined);
});

test("numeric evidence uses true literal boundaries instead of substring matches", () => {
  const amount = grounded({ amounts: [{ literal: "125" }] }, [{ field: "amount", text: "Total: 1,125", pageIndex: 0 }]);
  assert.equal(evidenceSupportsCanonicalFact(amount.evidence[0], amount), false);
  assert.ok(canonicalQualityGate(amount, 1).includes("amount_evidence"));

  const reference = grounded({ references: [{ value: "123" }] }, [{ field: "reference_number", text: "Reference: 1234", pageIndex: 0 }]);
  assert.equal(evidenceSupportsCanonicalFact(reference.evidence[0], reference), false);
  assert.ok(canonicalQualityGate(reference, 1).includes("reference_evidence"));
});

test("contextual amount punctuation and whitespace remain valid", () => {
  const candidate = grounded({ amounts: [{ literal: "125.00 EUR" }] }, [{ field: "amount", text: "Total:  125.00   EUR.", pageIndex: 0 }]);
  assert.equal(evidenceSupportsCanonicalFact(candidate.evidence[0], candidate), true);
  assert.deepEqual(canonicalQualityGate(candidate, 1), []);
});

test("dates, references, and IBANs reject embedded digit or identifier matches", () => {
  const date = grounded({ documentDate: "2025-01-01" }, [{ field: "document_date", text: "Date 12025-01-01", pageIndex: 0 }]);
  assert.equal(evidenceSupportsCanonicalFact(date.evidence[0], date), false);
  assert.ok(canonicalQualityGate(date, 1).includes("document_date_evidence"));

  const reference = grounded({ references: [{ value: "REF-123" }] }, [{ field: "reference_number", text: "Reference REF-1234", pageIndex: 0 }]);
  assert.equal(evidenceSupportsCanonicalFact(reference.evidence[0], reference), false);

  const iban = grounded({ iban: "DE02120300000000202051" }, [{ field: "iban", text: "IBAN XDE02 1203 0000 0000 2020 51", pageIndex: 0 }]);
  assert.equal(evidenceSupportsCanonicalFact(iban.evidence[0], iban), false);
  assert.ok(canonicalQualityGate(iban, 1).includes("iban_evidence"));

  const validIban = grounded({ iban: "DE02120300000000202051" }, [{ field: "iban", text: "IBAN: DE02 1203 0000 0000 2020 51", pageIndex: 0 }]);
  assert.equal(evidenceSupportsCanonicalFact(validIban.evidence[0], validIban), true);
});

test("numeric evidence preserves explicit signs and common Unicode minus", () => {
  const amountEvidence = (literal: string, text: string) => {
    const candidate = grounded({ amounts: [{ literal }] }, [{ field: "amount", text, pageIndex: 0 }]);
    return evidenceSupportsCanonicalFact(candidate.evidence[0], candidate);
  };

  assert.equal(amountEvidence("125.00 EUR", "Total: -125.00 EUR"), false, "unsigned must not match negative");
  assert.equal(amountEvidence("125.00 EUR", "Total: +125.00 EUR"), false, "unsigned must not match explicit positive");
  assert.equal(amountEvidence("+125.00 EUR", "Total: -125.00 EUR"), false, "positive must not match negative");
  assert.equal(amountEvidence("-125.00 EUR", "Total: -125.00 EUR"), true, "matching negative remains valid");
  assert.equal(amountEvidence("-125.00 EUR", "Total: \u2212125.00 EUR"), true, "Unicode minus matches canonical negative");
  assert.equal(amountEvidence("125.00 EUR", "Total: \u2212125.00 EUR"), false, "Unicode negative cannot validate unsigned");
});

test("numeric evidence normalizes fullwidth and small Unicode plus signs", () => {
  const amountEvidence = (literal: string, text: string) => {
    const candidate = grounded({ amounts: [{ literal }] }, [{ field: "amount", text, pageIndex: 0 }]);
    return evidenceSupportsCanonicalFact(candidate.evidence[0], candidate);
  };

  assert.equal(amountEvidence("125.00 EUR", "Total: \uFF0B125.00 EUR"), false, "unsigned must not match fullwidth positive");
  assert.equal(amountEvidence("125.00 EUR", "Total: \uFE62125.00 EUR"), false, "unsigned must not match small positive");
  assert.equal(amountEvidence("+125.00 EUR", "Total: \uFF0B125.00 EUR"), true, "ASCII positive matches fullwidth plus");
  assert.equal(amountEvidence("+125.00 EUR", "Total: \uFE62125.00 EUR"), true, "ASCII positive matches small plus");
  assert.equal(amountEvidence("+125.00 EUR", "Total: -125.00 EUR"), false, "positive must not match negative");
});