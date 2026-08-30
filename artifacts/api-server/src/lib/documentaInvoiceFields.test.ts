import assert from "node:assert/strict";
import test from "node:test";
import { extractInvoiceEssentials, mergeEvidenceFields } from "./documentaInvoiceFields";

test("extracts Rosenhof invoice essentials only from labelled literal OCR spans", () => {
  const source = "Rosenhof GmbH\nRechnung Nr.: RH-2024-17\nKundennummer: 4711\nRechnungsdatum: 2024-05-12\nFällig: 2024-06-11\nNetto: 100,00 EUR\nMwSt 19%: 19,00 EUR\nGesamtbetrag: 119,00 EUR\nZahlungsziel: 30 Tage ohne Abzug";
  const fields = extractInvoiceEssentials(source);
  assert.deepEqual(Object.fromEntries(fields.map((item) => [item.name, item.value])), {
    invoiceNumber: "RH-2024-17", customerNumber: "4711", documentDate: "2024-05-12", dueDate: "2024-06-11",
    netAmount: "100,00 EUR", vatAmount: "19,00 EUR", amount: "119,00 EUR", paymentTerms: "30 Tage ohne Abzug",
    sender: "Rosenhof GmbH",
  });
  for (const item of fields) {
    const span = item.evidence[0];
    assert.equal(source.slice(span.start, span.end), item.value);
    assert.equal(item.provenance, "deterministic");
  }
});

test("deduplication retains combined field provenance", () => {
  const source = "Invoice No: INV-7";
  const deterministic = extractInvoiceEssentials(source);
  const duplicate = { ...deterministic[0], provenance: "model" as const };
  assert.equal(mergeEvidenceFields([duplicate], deterministic)[0].provenance, "model+deterministic");
});

test("extracts physical Rosenhof layout parties and separates IBAN from BIC", () => {
  const source = "Rosenhof Schultheis e.K.\nEmpfänger: Katalin Hemperger\nRechnung\nRechnungsdatum: 14.07.2026\nGesamtbetrag: 32,80 EUR\nIBAN DE89 3704 0044 0532 0130 00\nBIC COBADEFFXXX\nVerwendungszweck: 400123 / 1276556";
  const values = Object.fromEntries(extractInvoiceEssentials(source).map((item) => [item.name, item.value]));
  assert.equal(values.sender, "Rosenhof Schultheis e.K.");
  assert.equal(values.recipient, "Katalin Hemperger");
  assert.equal(values.iban, "DE89 3704 0044 0532 0130 00");
  assert.equal(values.bic, "COBADEFFXXX");
  assert.equal(values.referenceNumber, "400123 / 1276556");
  assert.equal(values.documentDate, "14.07.2026");
  assert.equal(values.amount, "32,80 EUR");
});

test("retains literal invoice evidence while offering normalized review candidates", () => {
  const source = "Invoice\nSender:  Example   Institution AG\nDate: 14.07.2026\nTotal: 1.234,50 EUR";
  const fields = extractInvoiceEssentials(source);
  const date = fields.find((field) => field.name === "documentDate");
  const sender = fields.find((field) => field.name === "sender");
  const amount = fields.find((field) => field.name === "amount");
  assert.equal(date?.value, "14.07.2026");
  assert.equal(date?.normalizedValue, "2026-07-14");
  assert.equal(sender?.value, "Example   Institution AG");
  assert.equal(sender?.normalizedValue, "Example Institution AG");
  assert.equal(amount?.value, "1.234,50 EUR");
  for (const field of [date, sender, amount]) assert.equal(source.slice(field!.evidence[0].start, field!.evidence[0].end), field!.value);
});