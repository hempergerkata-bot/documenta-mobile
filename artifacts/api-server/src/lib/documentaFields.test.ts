import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mapFieldsToPages, OCR_PAGE_SEPARATOR, parseGeminiFields } from "./documentaFields";

test("accepts only evidence-backed Gemini fields", () => {
  const source = "Invoice total 42 EUR";
  const result = parseGeminiFields([
    { name: "total", value: "42 EUR", confidence: 0.9, validationState: "VALIDATED", evidence: [{ text: "42 EUR", start: 14, end: 20, pageIndex: 0 }] },
    { name: "invented", value: "99 EUR", confidence: 1, validationState: "VALIDATED", evidence: [{ text: "42 EUR", start: 14, end: 20 }] },
    { name: "bad", value: "Invoice", confidence: 2, validationState: "VALIDATED", evidence: [{ text: "Invoice", start: 0, end: 7 }] },
  ], source);
  assert.deepEqual(result, [{ name: "total", value: "42 EUR", confidence: 0.9, validationState: "PARTIALLY_VALIDATED", provenance: "model", evidence: [{ text: "42 EUR", start: 14, end: 20, pageIndex: 0 }] }]);
});

test("requires an unmodified literal OCR value, including whitespace", () => {
  assert.deepEqual(parseGeminiFields([
    { name: "amount", value: "42 EUR", confidence: 1, validationState: "VALIDATED", evidence: [{ text: " 42 EUR", start: 0, end: 7 }] },
  ], " 42 EUR"), []);
});

test("keeps a normalized candidate separate from literal evidence and canonicalizes mobile aliases", () => {
  const source = "Sender: Example   Bank AG\nDate: 14.07.2026\nTotal: 1.234,50 EUR";
  const senderStart = source.indexOf("Example");
  const dateStart = source.indexOf("14.07.2026");
  const amountStart = source.indexOf("1.234,50");
  const fields = parseGeminiFields([
    { name: "institution_name", value: "Example   Bank AG", normalizedValue: "Example Bank AG", confidence: 0.9, validationState: "VALIDATED", evidence: [{ text: "Example   Bank AG", start: senderStart, end: senderStart + 17 }] },
    { name: "document_date", value: "14.07.2026", normalizedValue: "2026-07-14", confidence: 0.9, validationState: "VALIDATED", evidence: [{ text: "14.07.2026", start: dateStart, end: dateStart + 10 }] },
    { name: "total_amount", value: "1.234,50 EUR", normalizedValue: "1234.50 EUR", confidence: 0.9, validationState: "VALIDATED", evidence: [{ text: "1.234,50 EUR", start: amountStart, end: amountStart + 12 }] },
    { name: "invented", value: "Allianz", confidence: 1, validationState: "VALIDATED", evidence: [{ text: "Allianz", start: 0, end: 7 }] },
    { name: "type", value: "Lohnabrechnung", confidence: 1, validationState: "VALIDATED", evidence: [{ text: "Lohnabrechnung", start: 0, end: 14 }] },
  ], source);
  assert.deepEqual(fields.map(({ name, value, normalizedValue, evidence }) => ({ name, value, normalizedValue, evidence: evidence[0].text })), [
    { name: "sender", value: "Example   Bank AG", normalizedValue: "Example Bank AG", evidence: "Example   Bank AG" },
    { name: "documentDate", value: "14.07.2026", normalizedValue: "2026-07-14", evidence: "14.07.2026" },
    { name: "amount", value: "1.234,50 EUR", normalizedValue: "1234.50 EUR", evidence: "1.234,50 EUR" },
  ]);
  assert.ok(fields.every((field) => source.slice(field.evidence[0].start, field.evidence[0].end) === field.value));
});

test("Document AI to Gemini contract uses mobile categories and only supplied OCR", async () => {
  let route: string;
  try { route = await readFile("src/routes/documentaIntelligence.ts", "utf8"); }
  catch { route = await readFile("artifacts/api-server/src/routes/documentaIntelligence.ts", "utf8"); }
  assert.match(route, /const DOCUMENT_FAMILIES = \["finance", "insurance", "authority", "work"/);
  assert.match(route, /\["work", "payroll",/);
  assert.match(route, /\["banking", "bank_document",/);
  assert.match(route, /OCR:\\n\$\{ocrText\}/);
  assert.doesNotMatch(route, /Allianz/);
});

test("rejects malformed arrays and out-of-range spans", () => {
  assert.deepEqual(parseGeminiFields({}, "abc"), []);
  assert.deepEqual(parseGeminiFields([{ name: "x", value: "abc", confidence: 1, validationState: "VALIDATED", evidence: [{ text: "abc", start: 0, end: 99 }] }], "abc"), []);
});

test("maps joined offsets to page-local offsets and rejects boundary spans", () => {
  const pages = ["alpha 10 EUR", "beta 20 EUR"];
  const joined = pages.join(OCR_PAGE_SEPARATOR);
  const secondStart = pages[0].length + OCR_PAGE_SEPARATOR.length + 5;
  const fields = parseGeminiFields([{ name: "amount", value: "20 EUR", confidence: 1, validationState: "VALIDATED", evidence: [{ text: "20 EUR", start: secondStart, end: secondStart + 6 }] }], joined);
  assert.deepEqual(mapFieldsToPages(fields, pages)[0].evidence[0], { text: "20 EUR", start: 5, end: 11, pageIndex: 1 });
  const crossing = [{ ...fields[0], evidence: [{ text: joined.slice(10, pages[0].length + 2), start: 10, end: pages[0].length + 2, pageIndex: 0 }] }];
  assert.deepEqual(mapFieldsToPages(crossing, pages), []);
});