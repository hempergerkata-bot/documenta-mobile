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
  assert.equal(result.fields.subcategory?.value, 'Lohn & Gehalt');
  assert.equal(result.fields.payrollPeriod?.value, 'Juli 2026');
  assert.equal(
    result.fields.title?.value,
    'Lohnabrechnung Juli 2026 – Mustertechnik GmbH',
  );
  assert.deepEqual(result.fields.tags?.value, [
    'lohnabrechnung',
    'gehalt',
    'Mustertechnik GmbH',
    'Juli 2026',
  ]);
  assert.equal(result.fields.status, undefined);
});

test('does not invent metadata from unreadable or ambiguous text', () => {
  const result = analyzeGermanDocumentText('Kundennummer 48291\\nSeite 1 von 2');

  assert.deepEqual(result.fields, {});
  assert.deepEqual(result.uncertainFields, []);
  assert.ok(result.unresolvedFields.includes('documentType'));
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

test('extracts payroll fields when OCR splits labels and values across lines', () => {
  const result = analyzeGermanDocumentText(`
    Nordlicht Logistik GmbH
    Entgeltabrechnung für 08/2026
    Arbeitgeber
    Nordlicht Logistik GmbH
    Arbeitnehmername
    Tobias Beispiel
    Abrechnungsdatum
    31.08.2026
    Brutto-Bezüge 3.920,00
    Nettoauszahlung
    2.548,77 EUR
  `);

  assert.equal(
    result.fields.documentType?.value,
    'Lohnabrechnung / Gehaltsabrechnung',
  );
  assert.equal(result.fields.category?.value, 'Arbeit & Bildung');
  assert.equal(result.fields.subcategory?.value, 'Lohn & Gehalt');
  assert.equal(result.fields.sender?.value, 'Nordlicht Logistik GmbH');
  assert.equal(result.fields.person?.value, 'Tobias Beispiel');
  assert.equal(result.fields.documentDate?.value, '31.08.2026');
  assert.equal(result.fields.payrollPeriod?.value, '08/2026');
  assert.equal(result.fields.amount?.value, '2.548,77 EUR');
  assert.equal(
    result.fields.title?.value,
    'Lohnabrechnung 08/2026 – Nordlicht Logistik GmbH',
  );
});

test('uses a labelled amount without currency but does not use an unrelated amount', () => {
  const result = analyzeGermanDocumentText(`
    Beispiel Handel AG
    Gehaltsabrechnung
    Arbeitnehmer: Nora Muster
    Personalnummer 4711
    Bruttoentgelt 4.100,00
    Auszahlungsbetrag 2.611,42
  `);

  assert.equal(result.fields.amount?.value, '2.611,42');
  assert.notEqual(result.fields.amount?.value, '4.100,00');
});

test('does not infer a payroll period from the document date', () => {
  const result = analyzeGermanDocumentText(`
    Beispiel Handel AG
    Gehaltsabrechnung
    Arbeitgeber: Beispiel Handel AG
    Arbeitnehmer: Nora Muster
    Abrechnungsdatum: 31.08.2026
    Auszahlungsbetrag: 2.611,42 EUR
  `);

  assert.equal(
    result.fields.title?.value,
    'Lohnabrechnung – Beispiel Handel AG',
  );
  assert.deepEqual(result.fields.tags?.value, [
    'lohnabrechnung',
    'gehalt',
    'Beispiel Handel AG',
  ]);
  assert.ok(result.uncertainFields.includes('title'));
});

test('does not mistake a generic contact name for the employee', () => {
  const result = analyzeGermanDocumentText(`
    Nordlicht Logistik GmbH
    Gehaltsabrechnung
    Name: Petra Personalbüro
    Telefon: 040 123456
    Arbeitnehmer: Tobias Beispiel
    Nettoauszahlung: 2.548,77 EUR
  `);

  assert.equal(result.fields.person?.value, 'Tobias Beispiel');
  assert.notEqual(result.fields.person?.value, 'Petra Personalbüro');
});

test('extracts compact DATEV-style payroll OCR with an ungrouped payout', () => {
  const result = analyzeGermanDocumentText(`
    Lohn- und Gehaltsabrechnung für den Monat August 2026
    Arbeitgeber: Nordlicht Logistik GmbH Arbeitnehmer: Tobias Beispiel
    Abrechnung vom 31.08.2026
    Steuer-Brutto 3920,00
    Netto-Auszahlungsbetrag 2548,77 EUR
  `);

  assert.equal(result.fields.sender?.value, 'Nordlicht Logistik GmbH');
  assert.equal(result.fields.person?.value, 'Tobias Beispiel');
  assert.equal(result.fields.documentDate?.value, '31.08.2026');
  assert.equal(result.fields.payrollPeriod?.value, 'August 2026');
  assert.equal(result.fields.amount?.value, '2548,77 EUR');
});

test('does not treat generic net or transfer table rows as the payout', () => {
  const result = analyzeGermanDocumentText(`
    Gehaltsabrechnung
    Arbeitgeber: Beispiel Handel AG
    Arbeitnehmer: Nora Muster
    Netto Steuer 611,42
    Überweisung Pfändung 250,00
    Bruttoentgelt 4100,00
  `);

  assert.equal(result.fields.amount, undefined);
  assert.ok(result.unresolvedFields.includes('amount'));
});

test('never consumes a neighboring label as a split employer value', () => {
  const result = analyzeGermanDocumentText(`
    Gehaltsabrechnung
    Arbeitgeber
    Abrechnungsdatum
    31.08.2026
    Arbeitgeber
    Nordlicht Logistik GmbH
    Arbeitnehmer
    Tobias Beispiel
    Auszahlungsbetrag
    2548,77 EUR
  `);

  assert.equal(result.fields.sender?.value, 'Nordlicht Logistik GmbH');
  assert.notEqual(result.fields.sender?.value, 'Abrechnungsdatum');
  assert.equal(result.fields.person?.value, 'Tobias Beispiel');
  assert.equal(result.fields.amount?.value, '2548,77 EUR');
});

test('ignores a generic advance payout and selects the explicit final payout', () => {
  const result = analyzeGermanDocumentText(`
    Gehaltsabrechnung
    Arbeitgeber: Nordlicht Logistik GmbH
    Arbeitnehmer: Tobias Beispiel
    Auszahlungsbetrag Vorschuss 500,00 EUR
    Überweisungsbetrag Pfändung 250,00 EUR
    Netto-Bezüge 2798,77 EUR
    Nettoauszahlung 2548,77 EUR
  `);

  assert.equal(result.fields.amount?.value, '2548,77 EUR');
});

test('leaves amount unresolved when only a generic payout component exists', () => {
  const result = analyzeGermanDocumentText(`
    Gehaltsabrechnung
    Arbeitgeber: Nordlicht Logistik GmbH
    Arbeitnehmer: Tobias Beispiel
    Auszahlungsbetrag Prämie 500,00 EUR
    Überweisungsbetrag Pfändung 250,00 EUR
  `);

  assert.equal(result.fields.amount, undefined);
  assert.ok(result.unresolvedFields.includes('amount'));
});

test('does not use a generic personal date as the payroll document date', () => {
  const result = analyzeGermanDocumentText(`
    Gehaltsabrechnung
    Arbeitgeber: Nordlicht Logistik GmbH
    Arbeitnehmer: Tobias Beispiel
    Geburtsdatum: 01.01.1990
    Eintrittsdatum: 15.03.2020
    Datum: 01.01.1990
    Nettoauszahlung: 2548,77 EUR
  `);

  assert.equal(result.fields.documentDate, undefined);
  assert.ok(result.unresolvedFields.includes('documentDate'));
});

test('keeps an explicit payroll document date high confidence', () => {
  const result = analyzeGermanDocumentText(`
    Gehaltsabrechnung
    Arbeitgeber: Nordlicht Logistik GmbH
    Arbeitnehmer: Tobias Beispiel
    Geburtsdatum: 01.01.1990
    Abrechnung vom 31.08.2026
    Nettoauszahlung: 2548,77 EUR
  `);

  assert.equal(result.fields.documentDate?.value, '31.08.2026');
  assert.equal(result.fields.documentDate?.confidence, 'high');
});

test('uses a direct Netto-Bezüge amount as a reviewable payroll suggestion', () => {
  const result = analyzeGermanDocumentText(`
    Lohnabrechnung
    Arbeitgeber: Nordlicht Logistik GmbH
    Arbeitnehmer: Tobias Beispiel
    Netto-Bezüge 236,32 EUR
  `);

  assert.equal(result.fields.amount?.value, '236,32 EUR');
  assert.equal(result.fields.amount?.confidence, 'medium');
  assert.ok(result.uncertainFields.includes('amount'));
});

test('recognizes an unlabeled payroll recipient from a nearby postal address', () => {
  const result = analyzeGermanDocumentText(`
    Lohn- und Gehaltsabrechnung für den Monat August 2026
    Nordlicht Logistik GmbH
    Katalin Monika Hemperger
    Weberstraße 25
    89597 Beispielstadt
    Abrechnung vom 31.08.2026
    Nettoauszahlung 2548,77 EUR
  `);

  assert.equal(result.fields.person?.value, 'Katalin Monika Hemperger');
  assert.equal(result.fields.person?.confidence, 'medium');
});