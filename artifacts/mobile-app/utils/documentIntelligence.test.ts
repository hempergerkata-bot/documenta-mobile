import { analyzeDocumentIntelligence, applyReviewDecision, applyReviewDecisions, checklistFromIntelligence, compareDocumentIntelligence, downstreamDocumentFacts, eligibleDeadlines, explanationFor, isCurrentDocumentIntelligence, isDeadlineEligible, isMainAmountEligible, localizedExplanationSections, normalizeDocumentDate, validateDocumentAmount, validateDocumentIdentifier, validateIban } from './documentIntelligence';

// Avoid a project-wide @types/node dependency while still using node's test runner.
declare function require(name: string): any;
const test: (name: string, body: () => void) => void = require('node:test');
const assert = require('node:assert/strict');

test('classifies all German taxonomy groups with evidence', () => {
  const fixtures: Array<[string, string]> = [
    ['Rechnung\nZu zahlen: 10,00 EUR', 'finance'],
    ['Behörde: Bescheid', 'authority'],
    ['Vertrag Kündigung', 'contract'],
    ['Arzt Termin', 'health'],
  ];
  fixtures.forEach(([text, category]) => {
    const result = analyzeDocumentIntelligence({ text });
    assert.equal(result.language.value, 'de');
    assert.equal(result.taxonomy.mainCategory.value, category);
    assert.ok(result.taxonomy.mainCategory.evidence.length);
  });
});

test('classifies all Hungarian taxonomy groups independently of UI language', () => {
  const fixtures: Array<[string, string]> = [
    ['Számla fizetendő', 'finance'],
    ['Határozat hatóság', 'authority'],
    ['Szerződés felmondás', 'contract'],
    ['Orvos időpont', 'health'],
  ];
  fixtures.forEach(([text, category]) => {
    const result = analyzeDocumentIntelligence({ text });
    assert.equal(result.language.value, 'hu');
    assert.equal(result.taxonomy.mainCategory.value, category);
  });
});

test('extracts labeled Hungarian payment deadline and role-based amounts', () => {
  const result = analyzeDocumentIntelligence({ text: 'Feladó: Minta Kft.\nBruttó: 20 000,00 Ft\nNettó: 16 000,00 Ft\nDíj: 500,00 Ft\nFizetendő összeg: 12 500,00 Ft\nFizetési határidő: 2025.05.10.' });
  assert.equal(result.parties.sender.value, 'Minta Kft.');
  assert.deepEqual(result.amounts.items.map(x => x.role), ['gross', 'net', 'fee', 'payable']);
  assert.equal(result.amounts.main.value, '12 500,00 Ft');
  assert.equal(result.deadlines[0].kind, 'payment');
  assert.equal(result.deadlines[0].value, '2025-05-10');
});

test('links response actions, extracts typed deadlines, and reports same-kind conflicts', () => {
  const result = analyzeDocumentIntelligence({ text: 'Bitte antworten Sie bis 01.05.2025.\nAntwort bis 02.05.2025.\nWiderspruch bis 03.05.2025.\nKündigung bis 04.05.2025.\nTermin 05.05.2025.' });
  assert.ok(result.actions.some(x => x.responseNecessary && x.deadlineIndex === 0));
  assert.deepEqual([...new Set(result.deadlines.map(x => x.kind))], ['response', 'appeal', 'cancellation', 'appointment']);
  assert.equal(result.deadlineConflicts.length, 1);
  assert.equal(result.deadlineConflicts[0].kind, 'response');
  assert.equal(isDeadlineEligible(result, 0), false);
  assert.equal(eligibleDeadlines(result).some(x => x.kind === 'response'), false);
  assert.equal(result.reviewRequired, true);
});

test('calculates relative deadlines only with valid basis and preserves missing basis', () => {
  const dated = analyzeDocumentIntelligence({ text: 'Widerspruch innerhalb von 14 Tagen.', referenceDate: '2025-01-01' });
  const undated = analyzeDocumentIntelligence({ text: 'Widerspruch innerhalb von 14 Tagen.', referenceDate: 'bad-date' });
  assert.equal(dated.deadlines[0].value, '2025-01-15');
  assert.equal(dated.deadlines[0].confidence, 'low');
  assert.match(dated.deadlines[0].calculationBasis!, /referenceDate 2025-01-01/);
  assert.equal(undated.deadlines[0].value, undefined);
  assert.equal(undated.deadlines[0].confidence, 'unknown');
  assert.match(undated.deadlines[0].calculationBasis!, /reference date missing/);
});

test('builds missing document, proof, and signature checklist with consequences and conditioned rights', () => {
  const result = analyzeDocumentIntelligence({ text: 'Dokument fehlend.\nNachweis fehlend.\nUnterschrift fehlend.\nSonst droht Vollstreckung.\nSie können Widerspruch einlegen, wenn Sie betroffen sind.' });
  assert.deepEqual(checklistFromIntelligence(result).map(x => x.type), ['document', 'proof', 'signature']);
  assert.equal(result.consequences.riskLevel.value, 'high');
  assert.equal(result.rightsOptions[0].conditions, result.rightsOptions[0].option);
  assert.ok(result.rightsOptions[0].evidence.length);
});

test('represents medium consequence and never invents unknown OCR facts', () => {
  const consequence = analyzeDocumentIntelligence({ text: 'Bei Nichtzahlung folgt eine Mahnung.' });
  const empty = analyzeDocumentIntelligence({ text: '' });
  assert.equal(consequence.consequences.riskLevel.value, 'medium');
  assert.equal(empty.parties.sender.value, undefined);
  assert.equal(empty.amounts.main.value, undefined);
  assert.equal(empty.case.summary.value, undefined);
  assert.equal(empty.reviewRequired, true);
});

test('suggests same-reference, response, and chain relations and compare changes', () => {
  const related = [{ id: 'old', text: 'Aktenzeichen X-9', title: 'Bescheid' }];
  const same = analyzeDocumentIntelligence({ text: 'Aktenzeichen: X-9\nBescheid', relatedDocuments: related });
  const response = analyzeDocumentIntelligence({ text: 'Aktenzeichen: X-9\nAntwort', relatedDocuments: related });
  const chain = analyzeDocumentIntelligence({ text: 'Aktenzeichen: X-9\nMahnung', relatedDocuments: related });
  assert.equal(same.relations[0].relation, 'same_case');
  assert.equal(same.relations[0].confidence, 'high');
  assert.equal(response.relations[0].relation, 'response');
  assert.equal(chain.relations[0].relation, 'chain');
  assert.ok(compareDocumentIntelligence(same, analyzeDocumentIntelligence({ text: 'Aktenzeichen: Y-1\nZu zahlen 20,00 EUR' })).changes.length);
});

test('provides all explanation levels and caps key points at five', () => {
  const result = analyzeDocumentIntelligence({ text: 'Bitte zahlen Sie.\nBitte senden Sie Unterlagen.\nBitte antworten Sie.\nBitte reichen Sie Daten ein.\nBitte müssen Sie handeln.\nFällig bis 01.05.2025.\nAntwort bis 02.05.2025.' });
  assert.ok(result.explanations.short.length && result.explanations.normal.length && result.explanations.detailed.length);
  assert.ok(result.keyPoints.length >= 3);
  assert.ok(result.keyPoints.length <= 5);
});

test('normalizes only valid calendar dates and requires explicit document-date labels', () => {
  assert.equal(normalizeDocumentDate('29.02.2024'), '2024-02-29');
  assert.equal(normalizeDocumentDate('2025-02-29'), undefined);
  assert.equal(normalizeDocumentDate('31-04-2025'), undefined);
  const unlabeled = analyzeDocumentIntelligence({ text: 'Fällig bis 10.05.2025.' });
  const labeled = analyzeDocumentIntelligence({ text: 'Rechnungsdatum: 10.05.2025\nFällig bis 11.05.2025.' });
  const invalid = analyzeDocumentIntelligence({ text: 'Datum: 31.02.2025\nFällig bis 31.02.2025.' });
  assert.equal(unlabeled.dates.documentDate.value, undefined);
  assert.equal(labeled.dates.documentDate.value, '2025-05-10');
  assert.equal(labeled.deadlines[0].value, '2025-05-11');
  assert.equal(invalid.dates.documentDate.value, undefined);
  assert.equal(invalid.deadlines.length, 0);
});

test('never turns date spans or date prefixes into money and exposes amount eligibility', () => {
  const onlyDate = analyzeDocumentIntelligence({ text: 'Fällig bis 10.05.2025.' });
  const payable = analyzeDocumentIntelligence({ text: 'Fällig bis 10.05.2025.\nZu zahlen: 10,50 EUR' });
  assert.equal(onlyDate.amounts.items.length, 0);
  assert.equal(onlyDate.amounts.main.value, undefined);
  assert.equal(isMainAmountEligible(onlyDate), false);
  assert.equal(payable.amounts.main.value, '10,50 EUR');
  assert.equal(isMainAmountEligible(payable), true);
});

test('confirmed structured amount and due date override stale OCR values with structured evidence', () => {
  const result = analyzeDocumentIntelligence({
    text: 'Zu zahlen: 99,99 EUR\nFällig bis 10.05.2025.',
    structuredFields: { amount: '12,34 EUR', dueDate: '15.05.2025', status: 'payment correction' },
  });
  assert.equal(result.amounts.main.value, '12,34 EUR');
  assert.equal(result.amounts.main.role, 'payable');
  assert.equal(result.amounts.main.confidence, 'high');
  assert.equal(result.amounts.main.evidence[0].source, 'structured');
  assert.equal(result.deadlines.filter(x => x.kind === 'payment').length, 1);
  assert.equal(result.deadlines[0].value, '2025-05-15');
  assert.equal(result.deadlines[0].evidence[0].source, 'structured');
  assert.equal(isDeadlineEligible(result, 0), true);
});

test('invalid confirmed due date is absent, ineligible, and requires review', () => {
  const result = analyzeDocumentIntelligence({ text: '', structuredFields: { dueDate: '31.02.2025' } });
  assert.equal(result.deadlines.length, 0);
  assert.equal(eligibleDeadlines(result).length, 0);
  assert.ok(result.reviewReasons.includes('Structured due date is invalid'));
});

test('independent English adapter and explicit review/consequence extensions remain evidence backed', () => {
  const result = analyzeDocumentIntelligence({ text: 'Sender: Example Ltd\nInvoice date: 2025-01-10\nPayment due 2025-02-01.\nYou may appeal if affected. Otherwise legal enforcement applies.' });
  assert.equal(result.documentLanguage.value, 'en');
  assert.equal(result.dates.documentDate.value, '2025-01-10');
  assert.equal(result.consequences.explicitItems[0].explicit, true);
  assert.equal(result.consequences.explicitItems[0].kind, 'legal');
  assert.equal(result.rightsOptions[0].conditional, true);
  assert.ok(result.reviewRecords.every(x => x.origin === 'automatic'));
});

test('24 anonymous document fixtures stay deterministic and evidence-first', () => {
  const fixtures: Array<[string, string, string]> = [
    ['invoice', 'Absender: Beispiel GmbH\nEmpfänger: Person A\nRechnung\nZu zahlen: 10,00 EUR\nFällig bis 10.05.2025.', 'invoice'],
    ['warning', 'Absender: Beispiel GmbH\nEmpfänger: Person A\nMahnung\nBitte zahlen Sie.', 'payment_reminder'],
    ['insurance', 'Absender: Beispiel Versicherung\nEmpfänger: Person A\nVersicherungsschreiben', 'insurance_letter'],
    ['increase', 'Absender: Beispiel Versicherung\nEmpfänger: Person A\nBeitragserhöhung', 'premium_increase'],
    ['authority decision', 'Absender: Amt Musterstadt\nEmpfänger: Person A\nBescheid', 'authority_decision'],
    ['rejection', 'Absender: Amt Musterstadt\nEmpfänger: Person A\nBescheid abgelehnt', 'rejection'],
    ['approval', 'Absender: Amt Musterstadt\nEmpfänger: Person A\nBewilligung genehmigt', 'approval'],
    ['work', 'Absender: Arbeitgeber GmbH\nEmpfänger: Person A\nArbeitsbescheinigung', 'work_document'],
    ['payroll', 'Absender: Arbeitgeber GmbH\nEmpfänger: Person A\nLohnabrechnung\nNetto: 100,00 EUR', 'payroll'],
    ['contract', 'Absender: Beispiel GmbH\nEmpfänger: Person A\nVertrag', 'contract'],
    ['contract change', 'Absender: Beispiel GmbH\nEmpfänger: Person A\nVertragsänderung', 'contract_change'],
    ['cancellation', 'Absender: Beispiel GmbH\nEmpfänger: Person A\nKündigung', 'cancellation'],
    ['doctor letter', 'Absender: Praxis Muster\nEmpfänger: Person A\nArztbrief', 'doctor_letter'],
    ['lab report', 'Absender: Labor Muster\nEmpfänger: Person A\nLaborbefund', 'lab_report'],
    ['prescription medical order', 'Absender: Praxis Muster\nEmpfänger: Person A\nRezept Verordnung', 'prescription_order'],
    ['appointment', 'Absender: Praxis Muster\nEmpfänger: Person A\nTerminbestätigung', 'appointment_confirmation'],
    ['school kita', 'Absender: Kita Muster\nEmpfänger: Person A\nSchule Kita Information', 'school_kita'],
    ['bank', 'Absender: Bank Muster\nEmpfänger: Person A\nKontoauszug', 'bank_document'],
    ['subscription', 'Absender: Beispiel GmbH\nEmpfänger: Person A\nAbonnement', 'subscription'],
    ['utilities', 'Absender: Stadtwerke\nEmpfänger: Person A\nStrom Rechnung', 'utility_invoice'],
    ['tax', 'Absender: Finanzamt Muster\nEmpfänger: Person A\nSteuerbescheid', 'tax_document'],
    ['collection', 'Absender: Inkasso Muster\nEmpfänger: Person A\nInkasso', 'collection_letter'],
    ['rental', 'Absender: Vermieter\nEmpfänger: Person A\nMietvertrag', 'rental_housing'],
    ['auto insurance', 'Absender: Versicherung\nEmpfänger: Person A\nKfz-Versicherung', 'auto_insurance'],
  ];
  fixtures.forEach(([name, text, subtype]) => {
    const result = analyzeDocumentIntelligence({ text });
    assert.equal(result.version, '2.0.0', name);
    assert.equal(result.taxonomy.subtype.value, subtype, name);
    assert.ok(result.taxonomy.subtype.evidence.length, name);
    assert.ok(result.reviewRecords.length >= 4, name);
  });
});

test('critical review records cover all protected areas and decisions gate downstream facts', () => {
  const result = analyzeDocumentIntelligence({ text: 'Absender: Test GmbH\nEmpfänger: Person\nRechnung\nZu zahlen: 20,00 EUR\nFällig bis 10.05.2025.' });
  const required = ['documentType', 'subtype', 'purpose', 'sender', 'recipient', 'mainAmount', 'deadlines', 'actions', 'consequences', 'rightsOptions', 'caseRelation', 'riskLevel'];
  assert.deepEqual(result.reviewRecords.map(x => x.field), required);
  assert.ok(result.reviewRecords.filter(x => x.origin === 'automatic').every(x => x.decision === 'pending'));
  const rejected = applyReviewDecision(result, 'mainAmount', 'reject');
  const unknownDeadline = applyReviewDecision(result, 'deadlines', 'unknown');
  assert.equal(isMainAmountEligible(rejected), false);
  assert.equal(downstreamDocumentFacts(rejected).mainAmount, undefined);
  assert.equal(isDeadlineEligible(unknownDeadline, 0), false);
  assert.equal(eligibleDeadlines(unknownDeadline).length, 0);
  assert.equal(rejected.amounts.main.evidence[0].source, 'ocr');
  assert.equal(rejected.reviewRecords.find(x => x.field === 'mainAmount')!.decision, 'reject');
});

test('confirmed high structured review defaults to accept and edit remains confirmed', () => {
  const result = analyzeDocumentIntelligence({ text: '', structuredFields: { amount: '11,00 EUR' } });
  const amountReview = result.reviewRecords.find(x => x.field === 'mainAmount')!;
  assert.equal(amountReview.origin, 'confirmed');
  assert.equal(amountReview.decision, 'accept');
  const edited = applyReviewDecision(result, 'mainAmount', 'edit');
  assert.equal(edited.reviewRecords.find(x => x.field === 'mainAmount')!.origin, 'confirmed');
  assert.equal(isMainAmountEligible(edited), true);
});

test('slash dates normalize, cannot become money, and normalize relative bases without Date.parse', () => {
  const result = analyzeDocumentIntelligence({ text: 'Rechnungsdatum: 29/02/2024\nFällig bis 10/05/2025.', referenceDate: '01/01/2025' });
  const relative = analyzeDocumentIntelligence({ text: 'Widerspruch innerhalb von 14 Tagen.', referenceDate: '01/01/2025' });
  assert.equal(result.dates.documentDate.value, '2024-02-29');
  assert.equal(result.deadlines[0].value, '2025-05-10');
  assert.equal(result.amounts.items.length, 0);
  assert.equal(relative.deadlines[0].value, '2025-01-15');
  assert.equal(normalizeDocumentDate('31/04/2025'), undefined);
});

test('safe summaries exclude conflicted or unknown facts and plain language does not invent facts', () => {
  const conflict = analyzeDocumentIntelligence({ text: 'Fällig bis 10.05.2025.\nFällig bis 11.05.2025.\nZu zahlen: 10,00 EUR' });
  const unknown = analyzeDocumentIntelligence({ text: '' });
  assert.equal(conflict.deadlineSummary, 'No clear deadline was found.');
  assert.equal(unknown.moneySummary, 'The main amount could not be reliably identified.');
  assert.ok(conflict.plainLanguageExplanation.length > 0);
  assert.equal(unknown.plainLanguageExplanation.includes('diagnosis'), false);
  assert.equal(unknown.plainLanguageExplanation.includes('legal right'), false);
});

test('comparison returns typed changes and paired evidence without selecting a truth', () => {
  const before = analyzeDocumentIntelligence({ text: 'Vertrag geändert: Laufzeit 12 Monate', structuredFields: { amount: '10,00 EUR', dueDate: '10.05.2025' } });
  const after = analyzeDocumentIntelligence({ text: 'Vertrag geändert: Laufzeit 24 Monate\nBitte zahlen Sie.', structuredFields: { amount: '20,00 EUR', dueDate: '11.05.2025' } });
  const comparison = compareDocumentIntelligence(before, after);
  assert.ok(comparison.typedChanges.some(x => x.kind === 'amount'));
  assert.ok(comparison.typedChanges.some(x => x.kind === 'deadline'));
  assert.ok(comparison.typedChanges.some(x => x.kind === 'status'));
  assert.ok(comparison.typedChanges.some(x => x.kind === 'contract_term'));
  assert.ok(comparison.conflicts.every(x => Array.isArray(x.evidence.before) && Array.isArray(x.evidence.after)));
});

test('risk combines only evidenced eligible factors and produces evidenced warnings', () => {
  const high = analyzeDocumentIntelligence({
    text: 'Zu zahlen: 100,00 EUR\nFällig bis 2025-01-05.\nBitte zahlen Sie sofort.\nSonst droht Vollstreckung.\nSonst folgt eine Mahnung.',
    referenceDate: '2025-01-01',
  });
  assert.equal(high.consequences.riskLevel.value, 'critical');
  assert.ok(high.consequences.warningDetails.some(x => x.kind === 'deadline'));
  assert.ok(high.consequences.warningDetails.some(x => x.kind === 'payment'));
  assert.ok(high.consequences.warningDetails.every(x => x.evidence.length > 0));
});

test('conflicting or relative dates are not certain urgency, and no evidence has no risk', () => {
  const conflict = analyzeDocumentIntelligence({ text: 'Fällig bis 2025-01-02.\nFällig bis 2025-01-03.', referenceDate: '2025-01-01' });
  const relative = analyzeDocumentIntelligence({ text: 'Widerspruch innerhalb von 2 Tagen.', referenceDate: '2025-01-01' });
  const empty = analyzeDocumentIntelligence({ text: '' });
  assert.equal(conflict.consequences.warningDetails.some(x => x.kind === 'deadline' && x.severity === 'high'), false);
  assert.equal(relative.consequences.warningDetails.some(x => x.kind === 'deadline' && x.severity === 'high'), false);
  assert.equal(empty.consequences.riskLevel.value, 'none');
  assert.equal(empty.consequences.warningDetails.length, 0);
});

test('legacy persisted intelligence is rejected before rendering and current schema is accepted', () => {
  const legacy = { version: '1.0.0', reviewRequired: false, explanations: {} };
  const current = analyzeDocumentIntelligence({ text: 'Rechnung\nAbsender: Beispiel GmbH' });
  assert.equal(isCurrentDocumentIntelligence(legacy), false);
  assert.equal(isCurrentDocumentIntelligence(current), true);
});

test('validates money, identifiers, and IBAN deterministically without a network service', () => {
  assert.equal(validateDocumentAmount('1.234,56 EUR'), 'valid');
  assert.equal(validateDocumentAmount('10.05.2025'), 'invalid');
  assert.equal(validateDocumentIdentifier('AZ-2025/09'), 'valid');
  assert.equal(validateDocumentIdentifier('01'), 'invalid');
  assert.equal(validateIban('DE89 3704 0044 0532 0130 00'), 'valid');
  assert.equal(validateIban('DE89 3704 0044 0532 0130 01'), 'invalid');
});

test('keeps unfamiliar documents open-world and attaches spans and validation to critical extraction', () => {
  const result = analyzeDocumentIntelligence({
    text: 'Alien ledger\nIBAN: DE89 3704 0044 0532 0130 00\nReference: A-2025',
    structuredFields: { person: 'Ada' },
  });
  assert.equal(result.taxonomy.mainCategory.value, 'unknown_novel');
  assert.equal(result.parties.affectedPerson.value, 'Ada');
  assert.equal(result.identifiers.value?.[0].kind, 'iban');
  assert.equal(result.identifiers.value?.[0].validation, 'valid');
  assert.ok((result.identifiers.value?.[0].evidence[0].start ?? -1) >= 0);
});

test('review decisions survive recomputation and accepted critical fields stop requesting review', () => {
  const initial = analyzeDocumentIntelligence({ text: 'Rechnung\nZu zahlen: 20,00 EUR\nFällig bis 10.05.2025.' });
  const decisions = { mainAmount: 'reject', deadlines: 'unknown', sender: 'accept' } as const;
  const reviewed = applyReviewDecisions(initial, decisions);
  const recalculated = analyzeDocumentIntelligence({
    text: 'Rechnung\nZu zahlen: 20,00 EUR\nFällig bis 10.05.2025.',
    structuredFields: { sender: 'Bestätigte GmbH' },
  });
  const restored = applyReviewDecisions(recalculated, decisions);
  assert.equal(isMainAmountEligible(reviewed), false);
  assert.equal(eligibleDeadlines(reviewed).length, 0);
  assert.equal(restored.reviewRecords.find(record => record.field === 'mainAmount')?.decision, 'reject');
  assert.equal(restored.reviewRecords.find(record => record.field === 'deadlines')?.decision, 'unknown');
  assert.equal(restored.reviewRecords.find(record => record.field === 'sender')?.decision, 'accept');
  assert.equal(restored.reviewReasons.some(reason => reason === 'Critical sender requires review'), false);
});

test('localized explanation fallbacks and body text stay in the selected language', () => {
  const unknown = analyzeDocumentIntelligence({ text: '' });
  const hu = localizedExplanationSections(unknown, 'hu');
  const de = localizedExplanationSections(unknown, 'de');
  assert.equal(hu.action, 'Nem találtam egyértelműen alátámasztott teendőt.');
  assert.equal(hu.deadline, 'Nem találtam egyértelmű határidőt.');
  assert.equal(hu.amount, 'Nem tudtam megbízhatóan azonosítani a fő összeget.');
  assert.equal(explanationFor(unknown, 'hu', 'normal').includes('No clear deadline'), false);
  assert.equal(de.deadline, 'Keine eindeutige Frist gefunden.');
});

test('detailed explanations localize generated labels, review text, and deadline kinds', () => {
  const result = analyzeDocumentIntelligence({
    text: 'Rechnung\nBitte zahlen Sie 20,00 EUR.\nFällig bis 10.05.2025.',
  });
  const huSections = localizedExplanationSections(result, 'hu');
  const huDetailed = explanationFor(result, 'hu', 'detailed');
  const enDetailed = explanationFor(result, 'en', 'detailed');
  assert.ok(huSections.deadline.startsWith('Fizetés:'));
  assert.equal(huDetailed.includes('Evidence:'), false);
  assert.equal(huDetailed.includes('requires review'), false);
  assert.ok(huDetailed.includes('Felhasználói ellenőrzés szükséges'));
  assert.ok(enDetailed.includes('Human review required'));
  assert.equal(enDetailed.includes('Critical mainAmount requires review'), false);
});