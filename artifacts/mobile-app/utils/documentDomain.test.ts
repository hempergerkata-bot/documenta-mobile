import { documentFingerprint, findDuplicates, generatedNotifications, searchEverything, selectActiveDocuments } from './documentDomain';
const base = { id: 'a', title: 'Rechnung März', sender: 'Stadtwerke', category: 'Wohnen', documentType: 'Rechnung', documentDate: '2026-03-01', person: 'Ich', tags: ['Strom'], createdAt: '2026-03-01' };
function assert(value: unknown, message: string) { if (!value) throw new Error(message); }
assert(documentFingerprint({ ...base, amount: '12,00 €' }) === documentFingerprint({ ...base, title: ' rechnung  marz ', amount: '12,00 €' }), 'fingerprint normalizes text');
assert(findDuplicates(base, [base, { ...base, id: 'b' }]).length === 1, 'duplicate detected');
const results = searchEverything([{ ...base, ocrText: 'Kundennummer 42' }], [{ id: 'c', title: 'Widerspruch', status: 'offen', profileIds: [], documentIds: [], taskIds: [], timelineEvents: [], missingData: [], checklist: [], createdAt: '', updatedAt: '' }], [], 'kundennummer');
assert(results.documents.length === 1 && results.cases.length === 0, 'OCR gets searched');
const lifecycleDocuments = [
  { ...base, id: 'active', lifecycle: 'aktiv' as const },
  { ...base, id: 'archived', lifecycle: 'archiviert' as const },
  { ...base, id: 'trashed', lifecycle: 'papierkorb' as const },
];
assert(
  selectActiveDocuments(lifecycleDocuments).map((document) => document.id).join(',') === 'active',
  'archived and trashed documents are excluded from active navigation',
);
const deadlineNow = new Date('2025-05-05T12:00:00.000Z');
const soonNotices = generatedNotifications(
  [{ ...base, id: 'soon', dueDate: '10.05.2025', createdAt: '2025-01-01' }],
  [],
  [],
  deadlineNow,
);
assert(soonNotices.some((notice) => notice.id === 'due-doc-soon'), 'German locale due date is normalized for soon notification');
const overdueNotices = generatedNotifications(
  [{ ...base, id: 'late', dueDate: '01.05.2025', createdAt: '2025-01-01' }],
  [],
  [],
  deadlineNow,
);
assert(overdueNotices.some((notice) => notice.id === 'overdue-late'), 'German locale due date is normalized for overdue notification');
const invalidNotices = generatedNotifications(
  [{ ...base, id: 'invalid', dueDate: '31.02.2025', createdAt: '2025-01-01' }],
  [],
  [],
  deadlineNow,
);
assert(!invalidNotices.some((notice) => notice.id.includes('invalid') && notice.kind === 'frist'), 'invalid due date never creates a deadline notification');