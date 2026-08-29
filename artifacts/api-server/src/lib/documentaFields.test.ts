import assert from "node:assert/strict";
import test from "node:test";
import { mapFieldsToPages, OCR_PAGE_SEPARATOR, parseGeminiFields } from "./documentaFields";

test("accepts only evidence-backed Gemini fields", () => {
  const source = "Invoice total 42 EUR";
  const result = parseGeminiFields([
    { name: "total", value: "42 EUR", confidence: 0.9, validationState: "VALIDATED", evidence: [{ text: "42 EUR", start: 14, end: 20, pageIndex: 0 }] },
    { name: "invented", value: "99 EUR", confidence: 1, validationState: "VALIDATED", evidence: [{ text: "42 EUR", start: 14, end: 20 }] },
    { name: "bad", value: "Invoice", confidence: 2, validationState: "VALIDATED", evidence: [{ text: "Invoice", start: 0, end: 7 }] },
  ], source);
  assert.deepEqual(result, [{ name: "total", value: "42 EUR", confidence: 0.9, validationState: "VALIDATED", evidence: [{ text: "42 EUR", start: 14, end: 20, pageIndex: 0 }] }]);
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