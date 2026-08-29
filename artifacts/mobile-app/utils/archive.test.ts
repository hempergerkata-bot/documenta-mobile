import {
  applyArchiveReview,
  buildArchiveIndex,
  buildCaseTimeline,
  buildDocumentTimeline,
  deriveArchiveDate,
  filterArchiveDocuments,
  filterTimelineEvents,
  isBulkAcceptable,
  migrateArchiveDocument,
  relevantPeriodYears,
  sortArchiveDocuments,
  type ArchiveDocument,
} from './archive';
import type { ActionRecord } from './actionEngine';
import type { CaseRecord } from './documentDomain';

function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
function equal(actual: unknown, expected: unknown, message?: string) { assert(actual === expected, message ?? `Expected ${String(expected)}, received ${String(actual)}`); }
function deepEqual(actual: unknown, expected: unknown, message?: string) { assert(JSON.stringify(actual) === JSON.stringify(expected), message ?? `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`); }

const base = (id: string, documentDate: string): ArchiveDocument => ({
  id,
  title: `Dokument ${id}`,
  sender: 'Behörde',
  category: 'Authority',
  documentType: 'Bescheid',
  documentDate,
  createdAt: '2026-08-20T10:00:00.000Z',
  lifecycle: 'aktiv',
});
const now = new Date('2026-08-29T10:00:00.000Z');

for (const year of [1998, 2004, 2011, 2017, 2021]) {
  const result = deriveArchiveDate(base(String(year), `${year}-04-17`), now);
  equal(result.year, year, `old archive year ${year} remains supported`);
  equal(result.status, 'confirmed');
}

const textual = deriveArchiveDate(base('textual', '12. Dezember 2025'), now);
equal(textual.year, 2025, 'localized textual date produces its own archive year');
equal(deriveArchiveDate(base('abbreviated-de', '12. Dez 2025'), now).year, 2025, 'persisted German abbreviated month is recognized');
equal(deriveArchiveDate(base('abbreviated-en', 'Aug 12, 2021'), now).year, 2021, 'English abbreviated month is recognized');

const future = deriveArchiveDate(base('future', '2099-01-01'), now);
equal(future.year, undefined, 'implausibly future document date stays unknown');
equal(future.status, 'unknown');

const invalid = deriveArchiveDate(base('invalid', '31.02.2021'), now);
equal(invalid.year, undefined, 'invalid date never becomes a certain year');

const conflicted = deriveArchiveDate({
  ...base('conflict', '2021-05-10'),
  intelligence: { dates: { documentDate: { value: '2020-05-10', confidence: 'high', evidence: [{ text: 'Datum: 10.05.2020', source: 'ocr', confidence: 'high' }] } } },
}, now);
equal(conflicted.year, undefined, 'conflicting document dates do not select a year');
equal(conflicted.status, 'conflicted');

const receivedFallback = deriveArchiveDate({ ...base('received', ''), receivedDate: '2021-01-12' }, now);
equal(receivedFallback.year, 2021);
equal(receivedFallback.confidence, 'low', 'received date is only a low-confidence proposal');
equal(receivedFallback.source, 'receivedDate');

const manuallyCorrected = applyArchiveReview(migrateArchiveDocument(base('manual', '2021-01-12'), now), {
  archiveYear: 2017,
  documentDate: '2017-12-20',
  reviewStatus: 'corrected',
  at: '2026-08-29T11:00:00.000Z',
});
const reloaded = migrateArchiveDocument(JSON.parse(JSON.stringify(manuallyCorrected)), now);
equal(reloaded.archiveYear, 2017, 'manual archive year survives migration and recalculation');
equal(reloaded.archiveYearSource, 'manual');
equal(reloaded.documentDate, '2017-12-20');

const periodDocument = { ...base('period', '2021-02-01'), relevantPeriodStart: '2017-01-01', relevantPeriodEnd: '2021-12-31' };
deepEqual(relevantPeriodYears(periodDocument, now), [2017, 2018, 2019, 2020, 2021], 'relevant period is searchable across years');
const index = buildArchiveIndex([periodDocument, { ...periodDocument, id: 'period-2' }, { ...periodDocument, id: 'trash', lifecycle: 'papierkorb' }], now);
equal(index.total, 2, 'overview counts unique document records once and excludes trash');
equal(index.years.find((item) => item.year === 2021)?.count, 2, 'multi-year period never duplicates archive count');

const mixed = [
  migrateArchiveDocument(base('2017', '2017-03-01'), now),
  migrateArchiveDocument(base('2021', '2021-03-01'), now),
  migrateArchiveDocument(base('unknown', ''), now),
];
deepEqual(filterArchiveDocuments(mixed, { year: 'unknown' }, [], [], now).map((item) => item.id), ['unknown']);
deepEqual(sortArchiveDocuments(mixed, now).map((item) => item.id), ['2021', '2017', 'unknown'], 'archive sorting is deterministic with unknown last');

const safe = migrateArchiveDocument(base('safe', '2021-03-02'), now);
equal(isBulkAcceptable(safe), true);
equal(isBulkAcceptable({ ...safe, duplicateCandidateStatus: 'warning' }), false, 'duplicate warning blocks mass acceptance');
equal(isBulkAcceptable({ ...safe, archiveDateStatus: 'conflicted' }), false, 'conflict blocks mass acceptance');
equal(isBulkAcceptable({ ...safe, archiveYearConfidence: 'low' }), false, 'low confidence blocks mass acceptance');

const duplicateReviewed = applyArchiveReview({ ...safe, duplicateCandidateStatus: 'warning', title: 'Protected', intelligence: { reviewRequired: true } }, {
  duplicateDecision: 'separate',
  reviewStatus: 'corrected',
  at: '2026-08-29T12:00:00.000Z',
});
equal(duplicateReviewed.duplicateDecision, 'separate');
equal(duplicateReviewed.title, 'Protected', 'duplicate decision does not mutate document data');
equal(duplicateReviewed.intelligence?.reviewRequired, true, 'duplicate review does not mutate intelligence');

const action: ActionRecord = {
  schemaVersion: '1.0.0', id: 'action-1', documentId: '2021', caseId: 'case-1', type: 'review', title: 'Review',
  description: 'Review document', status: 'completed', priority: 'normal', source: 'user', confidence: 'high', evidence: [],
  createdAt: '2021-03-03T09:00:00.000Z', updatedAt: '2021-03-04T09:00:00.000Z', completedAt: '2021-03-04T09:00:00.000Z',
  userConfirmed: true, dedupeKey: 'user|2021|review', history: [
    { id: 'history-created', event: 'created', at: '2021-03-03T09:00:00.000Z' },
    { id: 'history-complete', event: 'completed', at: '2021-03-04T09:00:00.000Z' },
  ],
};
const timelineA = buildDocumentTimeline(mixed[1], [action]);
const timelineB = buildDocumentTimeline(mixed[1], [action]);
deepEqual(timelineA, timelineB, 'timeline IDs and ordering are deterministic');
equal(new Set(timelineA.map((event) => event.id)).size, timelineA.length, 'timeline events are deduplicated');
assert(timelineA.every((event) => !('document' in event.metadata)), 'timeline metadata never embeds a document copy');
equal(filterTimelineEvents(timelineA, { eventTypes: ['action.completed'] }).length, 1, 'timeline filters by event type');

const caseItem: CaseRecord = {
  id: 'case-1', title: 'Cross-year case', status: 'in_bearbeitung', profileIds: [], documentIds: ['2017', '2021'],
  missingData: [], checklist: [], timelineEvents: [], taskIds: [], createdAt: '2017-03-02T09:00:00.000Z', updatedAt: '2021-03-04T09:00:00.000Z',
};
const caseEvents = buildCaseTimeline(caseItem, mixed, [], [action]);
assert(caseEvents.some((event) => event.documentId === '2017') && caseEvents.some((event) => event.documentId === '2021'), 'cross-year case has one shared timeline');
equal(documentArchiveCounts(caseEvents, ['2017', '2021']), 2, 'case timeline includes both unique linked documents');
equal(caseEvents.filter((event) => event.eventType === 'action.completed' && event.actionId === action.id).length, 1, 'document-and-case-linked action completion appears once');

function documentArchiveCounts(events: ReturnType<typeof buildCaseTimeline>, ids: string[]): number {
  return ids.filter((id) => events.some((event) => event.documentId === id)).length;
}

const migrationSource = { ...base('migration', '2004-06-12'), ocrText: 'immutable OCR', evidence: { keep: true }, customManualField: 'keep' };
const migrationSnapshot = JSON.stringify(migrationSource);
const migrated = migrateArchiveDocument(migrationSource, now);
equal(JSON.stringify(migrationSource), migrationSnapshot, 'migration does not mutate the persisted source object');
equal((migrated as typeof migrationSource).ocrText, 'immutable OCR');
deepEqual((migrated as typeof migrationSource).evidence, { keep: true });

console.log('Archive and timeline tests passed');