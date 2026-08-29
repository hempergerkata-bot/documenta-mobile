import { SUPPORTED_LANGUAGES, t } from './localization';
import { buildSearchIndex, classifySearchIntent, emptySearchContext, isConfirmedAssistantAction, nextConversationContext, searchLocal, type SearchIntent, type SearchLibrary } from './semanticSearch';
declare function require(name: string): any;
const assert = require('node:assert').strict;
const evidence = [{ text: 'Absender: Debitor', source: 'ocr' as const, confidence: 'high' as const }];
const docs = [
  { id: 'new', title: 'Neue Inkassomitteilung', sender: 'Debitor GmbH', category: 'Behörde', documentType: 'Brief', documentDate: '2026-08-20', receivedDate: '2026-08-20', amount: '500 EUR', person: 'Amy', tags: ['Forderung'], lifecycle: 'aktiv', caseOriginYear: 2021, relevantPeriodStart: '2021-01-01', ocrText: 'Absender: Debitor GmbH Forderung aus 2021 Zahlbar bis 2026-09-01', intelligence: { parties: { sender: { value: 'Debitor GmbH', evidence } }, taxonomy: { mainCategory: { value: 'authority', evidence } }, amounts: { main: { value: '500 EUR', role: 'payable', confidence: 'high', evidence } }, deadlines: [{ value: '2026-09-01', evidence, confidence: 'high' }], actions: [{ requirement: 'Reply', evidence }], reviewRequired: false } } as any,
  { id: 'medical', title: 'Dr. Amy Befund', sender: 'Dr. Keller', category: 'Gesundheit', documentType: 'Brief', documentDate: '2026-07-01', amount: '59 EUR', person: 'Amy', tags: ['Arzt'], lifecycle: 'archiviert', ocrText: 'Arztbrief von Dr. Keller', intelligence: { parties: { sender: { value: 'Dr. Keller', evidence } }, taxonomy: { mainCategory: { value: 'health', evidence } }, amounts: { main: { value: '59 EUR', role: 'fee', confidence: 'medium', evidence } }, deadlines: [], actions: [], reviewRequired: false } } as any,
  { id: 'other', title: 'Bankauszug', sender: 'Bank', category: 'Bank', documentType: 'Auszug', documentDate: '2025-02-01', amount: '100 EUR', person: 'József', lifecycle: 'aktiv', ocrText: 'Kontobewegung' } as any,
] as const;
const library: SearchLibrary = { documents: docs, profiles: [{ id: 'amy', name: 'Amy' }], cases: [{ id: 'case-21', title: '2021 tartozás', documentIds: ['new'] }], relationships: [], actions: [] };
assert.equal(classifySearchIntent('Hol van az a levél, amiben 2021-es tartozásról írtak?'), 'find_document_by_period');
assert.equal(classifySearchIntent('Mennyi volt az összeg?'), 'find_document_by_amount');
assert.equal(classifySearchIntent('Mi változott 2024 és 2025 között?'), 'compare_documents');
assert.equal(classifySearchIntent('Ki volt a feladó?'), 'find_document_by_sender');
assert.equal(classifySearchIntent('Mutasd az Amy-s papírt'), 'find_document_by_person');
assert.equal(classifySearchIntent('Mit kell ezzel csinálnom?'), 'next_action');
assert.equal(classifySearchIntent('Melyik ügyhöz tartozik?'), 'find_case');
assert.equal(classifySearchIntent('Van előző levél?'), 'find_related_documents');
assert.equal(classifySearchIntent('Mit jelent ez?'), 'explain_document');
assert.equal(classifySearchIntent('Mi volt benne?'), 'summarize_document');
assert.equal(classifySearchIntent('Múlt héten érkezett'), 'find_document_by_date');
assert.equal(classifySearchIntent('Meddig kell válaszolni?'), 'find_document_by_deadline');
assert.equal(classifySearchIntent('Melyik feladat nyitott?'), 'find_document_by_action');
const localizedIntents: readonly [Parameters<typeof t>[1], SearchIntent][] = [
  ['assistant.questionSummary', 'summarize_document'], ['assistant.questionDeadline', 'find_document_by_deadline'],
  ['assistant.questionAction', 'next_action'], ['assistant.questionRelated', 'find_related_documents'],
  ['assistant.questionChange', 'compare_documents'], ['assistant.questionUncertainty', 'explain_document'],
];
for (const language of SUPPORTED_LANGUAGES) for (const [key, intent] of localizedIntents) assert.equal(classifySearchIntent(t(language, key)), intent, `${language} ${key}`);
assert.equal(searchLocal(library, 'Hol van az a bankos izé?').topResults[0].id, 'other');
assert.equal(searchLocal(library, 'Mutasd az Amy-s orvosos papírt.').topResults[0].id, 'medical');
assert.equal(searchLocal(library, 'Melyik levélben kértek kb. 500 eurót?', { referenceDate: '2026-08-29' }).topResults[0].id, 'new');
const crossYear = searchLocal(library, 'Hol van a 2021-es tartozásos levél, amit idén küldtek?', { referenceDate: '2026-08-29' });
assert.equal(crossYear.topResults[0].id, 'new');
assert.equal(crossYear.topResults[0].archived, false);
const ambiguous = searchLocal({ ...library, documents: [...docs, { ...docs[0], id: 'new-2', title: 'Másik Inkassólevél', documentDate: '2026-05-11' }] }, 'inkasszólevél');
assert.equal(ambiguous.ambiguous, true);
assert.equal(searchLocal(library, 'nem létező papír').zeroResult, true);
const first = searchLocal(library, 'Hol van a Debitor levele?');
const second = searchLocal(library, 'Mi volt benne?', { context: nextConversationContext(emptySearchContext, first) });
assert.equal(second.referenceResolved, true); assert.equal(second.topResults[0].id, 'new');
assert.equal(buildSearchIndex({ ...library, documents: docs.filter(doc => doc.id !== 'other') }).some(item => item.id === 'other'), false);
assert.equal(searchLocal({ documents: [{ id: 'localized-money', title: 'Grouped amount', amount: '1.234,56 EUR', lifecycle: 'aktiv' }] }, '1 234,56 euró').topResults[0]?.id, 'localized-money');
assert.equal(searchLocal({ documents: [{ id: 'localized-date', title: 'German date', documentDate: '01. Dez 2025', lifecycle: 'aktiv' }] }, 'last month', { referenceDate: '2026-01-15' }).topResults[0]?.id, 'localized-date');
assert.equal(isConfirmedAssistantAction({ id: 'a', title: 'Pay', documentId: 'new', status: 'suggested', userConfirmed: false }), false);
assert.equal(isConfirmedAssistantAction({ id: 'a', title: 'Pay', documentId: 'new', status: 'confirmed', userConfirmed: true }), true);
const linkedLibrary: SearchLibrary = {
  documents: [{ id: 'seed', title: 'First letter', lifecycle: 'aktiv' }, { id: 'reply', title: 'Reply letter', lifecycle: 'aktiv' }],
  relationships: [{ fromDocumentId: 'seed', toDocumentId: 'reply', kind: 'reply' }],
};
const linkedContext = { mode: 'document' as const, documentId: 'seed', lastResultDocumentIds: ['seed'] };
assert.equal(searchLocal(linkedLibrary, 'Van kapcsolódó dokumentum?', { context: linkedContext }).topResults[0]?.id, 'reply');
const comparisonResponse = searchLocal(linkedLibrary, 'Mi változott?', { context: linkedContext });
assert.deepEqual(comparisonResponse.comparisonDocumentIds, ['seed', 'reply']);
const insuranceLibrary: SearchLibrary = { documents: [{ id: 'insurance', title: 'Policy', category: 'insurance', lifecycle: 'aktiv' }] };
for (const word of ['biztosítás', 'Versicherung', 'insurance', 'asigurare', 'ubezpieczenie', 'poisťovňa', 'страхування', 'sigorta', 'تأمين', 'pojištění', 'застраховка', 'osiguranje', 'осигурање', 'assicurazione', 'assurance']) {
  assert.equal(searchLocal(insuranceLibrary, word).topResults[0]?.id, 'insurance', `multilingual insurance query: ${word}`);
}
const performanceFixtures = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `fixture-${count}-${index}`, title: index === count - 1 ? 'Debitor special invoice' : `Document ${index}`,
  sender: index === count - 1 ? 'Debitor GmbH' : `Sender ${index % 50}`, category: index % 7 === 0 ? 'insurance' : 'letter',
  documentDate: `${2020 + (index % 7)}-01-01`, amount: `${index} EUR`, lifecycle: index % 11 === 0 ? 'archiviert' : 'aktiv', ocrText: `Local OCR fixture ${index}`,
}));
for (const count of [100, 500, 1200]) {
  const fixtureLibrary = { documents: performanceFixtures(count) }; const started = Date.now();
  const index = buildSearchIndex(fixtureLibrary); const result = searchLocal(fixtureLibrary, 'Debitor special invoice', { index });
  assert.equal(index.length, count); assert.equal(result.topResults[0]?.id, `fixture-${count}-${count - 1}`); assert.ok(Date.now() - started < 5000, `${count} document search performance`);
}
console.log('semanticSearch tests passed');