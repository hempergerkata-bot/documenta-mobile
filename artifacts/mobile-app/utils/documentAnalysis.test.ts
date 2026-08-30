import { analyzeGermanDocumentText } from './documentAnalysis';

// Avoid a project-wide @types/node dependency while still using node's test runner.
declare function require(name: string): any;
const test: (name: string, body: () => void) => void = require('node:test');
const assert = require('node:assert/strict');

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

test('classifies and extracts an insurance document through its profile', () => {
  const result = analyzeGermanDocumentText(`
    Nordstern Versicherung AG
    Versicherungsschein
    Versicherungsnummer: VS-2026-88421
    Vertragsnummer: V-193844
    Versicherte: Erika Mustermann
    Ausstellungsdatum: 12.08.2026
  `);

  assert.equal(result.fields.documentType?.value, 'Versicherungsbrief');
  assert.equal(result.fields.insuranceNumber?.value, 'VS-2026-88421');
  assert.equal(result.fields.contractNumber?.value, 'V-193844');
  assert.equal(result.fields.person?.value, 'Erika Mustermann');
});

test('classifies a medical report and extracts the patient reference', () => {
  const result = analyzeGermanDocumentText(`
    Gemeinschaftspraxis am Markt
    Befundbericht
    Patientin: Erika Mustermann
    Patientennummer: P-481516
    Ausstellungsdatum: 20.08.2026
    Diagnose: Kontrolluntersuchung
  `);

  assert.equal(result.fields.documentType?.value, 'Arztbrief / Befund');
  assert.equal(result.fields.patientNumber?.value, 'P-481516');
  assert.equal(result.fields.person?.value, 'Erika Mustermann');
});

test('extracts invoice identifiers without payroll-specific assumptions', () => {
  const result = analyzeGermanDocumentText(`
    Beispielhandel GmbH
    Rechnung
    Rechnungsnummer: RE-2026-991
    Kundennummer: K-44028
    Rechnungsdatum: 18.08.2026
    Gesamtbetrag: 149,90 EUR
    Zahlbar bis: 01.09.2026
    IBAN: DE02120300000000202051
  `);

  assert.equal(result.fields.documentType?.value, 'Rechnung');
  assert.equal(result.fields.invoiceNumber?.value, 'RE-2026-991');
  assert.equal(result.fields.customerNumber?.value, 'K-44028');
  assert.equal(result.fields.iban?.value, 'DE02120300000000202051');
  assert.equal(result.fields.amount?.value, '149,90 EUR');
});

test('classifies the Rosenhof invoice as finance instead of payroll', () => {
  const rosenhofText = `
    Rosenhof Schultheis e.K.
    Katalin Hemperger
    Weberstraße 25
    89597 Munderkingen
    Rechnung
    Rechnungs-Nr. 400123
    Kunden-Nr. 1276556
    Rechnungsdatum 14.07.2026
    Abrechnung
    Netto 30.65 EUR
    MwSt. 2.15 EUR
    Gesamtbetrag 32.80 EUR
    zahlbar sofort ohne Abzug
  `;
  const result = analyzeGermanDocumentText(rosenhofText);

  assert.equal(result.fields.documentType?.value, 'Rechnung');
  assert.equal(result.fields.category?.value, 'Finanzen');
  assert.notEqual(result.fields.documentType?.value, 'Lohnabrechnung / Gehaltsabrechnung');
  assert.equal(result.fields.sender?.value, 'Rosenhof Schultheis e.K.');
  assert.equal(result.fields.person?.value, 'Katalin Hemperger');
  assert.equal(result.fields.invoiceNumber?.value, '400123');
  assert.equal(result.fields.customerNumber?.value, '1276556');
  assert.equal(result.fields.documentDate?.value, '14.07.2026');
  assert.equal(result.fields.amount?.value, '32.80 EUR');
  assert.match(result.text, /Netto 30\.65 EUR/);
  assert.match(result.text, /MwSt\. 2\.15 EUR/);
  assert.match(result.text, /zahlbar sofort ohne Abzug/);
});

test('does not classify incidental Netto and Abrechnung as payroll evidence', () => {
  const result = analyzeGermanDocumentText(`
    Abrechnung
    Netto 30.65 EUR
    MwSt. 2.15 EUR
  `);

  assert.equal(result.fields.documentType, undefined);
  assert.ok(result.unresolvedFields.includes('documentType'));
});

test('classifies school documents and extracts their own reference', () => {
  const result = analyzeGermanDocumentText(`
    Grundschule am Stadtpark
    Elternbrief
    Schülerin: Mia Mustermann
    Schülernummer: S-2026-77
    Datum: 27.08.2026
  `);

  assert.equal(result.fields.documentType?.value, 'Schule / Kindergarten');
  assert.equal(result.fields.schoolReference?.value, 'S-2026-77');
});