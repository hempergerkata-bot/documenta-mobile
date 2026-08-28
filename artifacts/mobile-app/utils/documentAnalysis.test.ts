import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeGermanDocumentText } from './documentAnalysis';

test('extracts evidence-backed fields from a German payroll statement', () => {
  const result = analyzeGermanDocumentText(`
    Mustertechnik GmbH
    Gehaltsabrechnung
    Abrechnungsmonat: Juli 2026
    Arbeitgeber: Mustertechnik GmbH
    Arbeitnehmer: Erika Mustermann
    Abrechnungsdatum: 31.07.2026
    Bruttoentgelt 4.200,00 EUR
    Nettoauszahlung 2.734,18 EUR
  `);

  assert.equal(
    result.fields.documentType?.value,
    'Lohnabrechnung / Gehaltsabrechnung',
  );
  assert.equal(result.fields.category?.value, 'Arbeit & Bildung');
  assert.equal(result.fields.sender?.value, 'Mustertechnik GmbH');
  assert.equal(result.fields.person?.value, 'Erika Mustermann');
  assert.equal(result.fields.documentDate?.value, '31.07.2026');
  assert.equal(result.fields.amount?.value, '2.734,18 EUR');
  assert.equal(
    result.fields.title?.value,
    'Lohnabrechnung Juli 2026 – Mustertechnik GmbH',
  );
  assert.equal(result.fields.status, undefined);
});

test('does not invent metadata from unreadable or ambiguous text', () => {
  const result = analyzeGermanDocumentText('Kundennummer 48291\\nSeite 1 von 2');

  assert.deepEqual(result.fields, {});
  assert.deepEqual(result.uncertainFields, []);
});

test('marks a one-signal classification as uncertain', () => {
  const result = analyzeGermanDocumentText(`
    Muster GmbH
    Rechnung
    Datum: 12.08.2026
    Gesamtbetrag: 129,90 EUR
    Fälligkeitsdatum: 28.08.2026
  `);

  assert.equal(result.fields.documentType?.value, 'Rechnung');
  assert.equal(result.fields.amount?.value, '129,90 EUR');
  assert.equal(result.fields.dueDate?.value, '28.08.2026');
  assert.equal(result.fields.status, undefined);
  assert.ok(result.uncertainFields.includes('documentType'));
});