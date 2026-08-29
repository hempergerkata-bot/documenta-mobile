import { normalizeDocumentDate, type Confidence, type Evidence } from './documentIntelligence';
import type { ActionRecord, FollowUpRecord, ReplyDraftCandidate } from './actionEngine';
import type { CaseRecord, DocumentRelationship } from './documentDomain';

export type ArchiveYearSource = 'documentDate' | 'receivedDate' | 'manual' | 'unknown';
export type ArchiveDateStatus = 'confirmed' | 'proposed' | 'conflicted' | 'unknown';
export type DuplicateDecision = 'same' | 'separate' | 'unknown';

export type ArchiveAuditEntry = {
  id: string;
  at: string;
  field: 'archiveYear' | 'documentDate' | 'receivedDate' | 'relevantPeriod' | 'duplicateDecision' | 'case';
  from?: string;
  to?: string;
  reason: 'automatic' | 'accepted' | 'corrected' | 'duplicate_review' | 'migration';
};

export type ArchiveDocument = {
  id: string;
  title: string;
  sender: string;
  category: string;
  documentType: string;
  documentDate: string;
  createdAt: string;
  lifecycle?: 'aktiv' | 'archiviert' | 'papierkorb';
  profileIds?: string[];
  person?: string;
  status?: string;
  dueDate?: string;
  receivedDate?: string;
  importedAt?: string;
  caseOriginDate?: string;
  caseOriginYear?: number;
  relevantPeriodStart?: string;
  relevantPeriodEnd?: string;
  archiveYear?: number;
  archiveYearConfidence?: Confidence;
  archiveYearEvidence?: Evidence[];
  archiveYearSource?: ArchiveYearSource;
  archiveDateStatus?: ArchiveDateStatus;
  archiveYearManual?: boolean;
  duplicateCandidateStatus?: 'none' | 'warning' | 'confirmed';
  duplicateDecision?: DuplicateDecision;
  archiveReviewStatus?: 'pending' | 'accepted' | 'corrected' | 'unknown' | 'later';
  archiveAuditTrail?: ArchiveAuditEntry[];
  intelligence?: {
    dates?: { documentDate?: { value?: string; confidence: Confidence; evidence: Evidence[] } };
    reviewRequired?: boolean;
    reviewRecords?: Array<{ field: string; decision: string }>;
    deadlines?: Array<{ value?: string; kind?: string; confidence: Confidence; evidence: Evidence[] }>;
  };
};

export type ArchiveDateResult = {
  year?: number;
  date?: string;
  confidence: Confidence;
  evidence: Evidence[];
  source: ArchiveYearSource;
  status: ArchiveDateStatus;
};

export type TimelineEventType =
  | 'document.created'
  | 'document.received'
  | 'document.imported'
  | 'deadline.detected'
  | 'appointment.detected'
  | 'action.created'
  | 'action.completed'
  | 'action.statusChanged'
  | 'review.accepted'
  | 'review.corrected'
  | 'review.rejected'
  | 'reply.draft'
  | 'reply.followUp'
  | 'case.opened'
  | 'case.statusChanged'
  | 'case.closed'
  | 'relationship.created';

export type TimelineEventRecord = {
  id: string;
  eventType: TimelineEventType;
  timestamp: string;
  documentId?: string;
  caseId?: string;
  actionId?: string;
  titleKey: string;
  metadata: Record<string, string | number | boolean | undefined>;
  confidence?: Confidence;
  evidenceRef?: string;
};

export type ArchiveIndex = {
  total: number;
  known: number;
  unknown: number;
  years: Array<{ year: number; count: number; months: Array<{ month: number; count: number }> }>;
  currentYear: number;
  previousYear: number;
  lastThreeYears: number[];
};

const confidenceRank: Record<Confidence, number> = { unknown: 0, low: 1, medium: 2, high: 3 };
const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0).toString(36);
};
const stableId = (key: string) => `timeline-${hash(key)}`;
const evidence = (text: string, confidence: Confidence, source: Evidence['source'] = 'structured'): Evidence[] =>
  text ? [{ text: text.slice(0, 240), confidence, source }] : [];

const monthNames: Record<string, number> = {
  january: 1, februar: 2, february: 2, 'märz': 3, maerz: 3, march: 3, april: 4, may: 5, mai: 5, june: 6, juni: 6,
  july: 7, juli: 7, august: 8, september: 9, october: 10, oktober: 10, november: 11, december: 12, dezember: 12,
  'január': 1, 'február': 2, 'március': 3, 'április': 4, 'május': 5, 'június': 6, 'július': 7, augusztus: 8, szeptember: 9,
  'október': 10,
  jan: 1, feb: 2, mar: 3, 'mär': 3, 'márc': 3, apr: 4, jun: 6, 'jún': 6, jul: 7, 'júl': 7,
  aug: 8, sep: 9, sept: 9, szept: 9, oct: 10, okt: 10, nov: 11, dec: 12, dez: 12,
};

function parseDate(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const numeric = normalizeDocumentDate(value);
  if (numeric) return numeric;
  const monthFirst = value.trim().match(/^([A-Za-zÄÖÜäöüßÁÉÍÓÖŐÚÜŰáéíóöőúüű]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/i);
  const dayFirst = value.trim().match(/^(\d{1,2})[.\s]+([A-Za-zÄÖÜäöüßÁÉÍÓÖŐÚÜŰáéíóöőúüű]+)\.?\s+(\d{4})\.?$/i);
  const match = monthFirst ? { day: Number(monthFirst[2]), month: monthNames[monthFirst[1].toLocaleLowerCase()], year: Number(monthFirst[3]) }
    : dayFirst ? { day: Number(dayFirst[1]), month: monthNames[dayFirst[2].toLocaleLowerCase()], year: Number(dayFirst[3]) } : undefined;
  if (!match?.month || match.year < 1 || match.day < 1 || match.day > new Date(Date.UTC(match.year, match.month, 0)).getUTCDate()) return undefined;
  return `${String(match.year).padStart(4, '0')}-${String(match.month).padStart(2, '0')}-${String(match.day).padStart(2, '0')}`;
}

function yearFrom(value: string | undefined): number | undefined {
  const date = parseDate(value);
  if (date) return Number(date.slice(0, 4));
  const year = value?.trim().match(/^(19\d{2}|20\d{2})$/)?.[1];
  return year ? Number(year) : undefined;
}

function futureUnsafe(year: number, now: Date): boolean {
  return year > now.getUTCFullYear() + 1;
}

export function deriveArchiveDate(document: ArchiveDocument, now = new Date()): ArchiveDateResult {
  if (document.archiveYearManual && Number.isInteger(document.archiveYear)) {
    return {
      year: document.archiveYear,
      date: parseDate(document.documentDate),
      confidence: 'high',
      evidence: document.archiveYearEvidence ?? evidence(`manual archive year ${document.archiveYear}`, 'high'),
      source: 'manual',
      status: 'confirmed',
    };
  }

  const candidates: Array<{ year: number; date?: string; confidence: Confidence; evidence: Evidence[]; source: ArchiveYearSource }> = [];
  const addCandidate = (value: string | undefined, source: ArchiveYearSource, confidence: Confidence, sourceEvidence: Evidence[]) => {
    const date = parseDate(value);
    const year = yearFrom(value);
    if (year && !futureUnsafe(year, now)) candidates.push({ year, date, confidence, evidence: sourceEvidence.length ? sourceEvidence : evidence(value ?? '', confidence), source });
  };
  addCandidate(document.documentDate, 'documentDate', 'high', evidence(document.documentDate, 'high'));
  const intelligenceDate = document.intelligence?.dates?.documentDate;
  if (intelligenceDate?.value) addCandidate(intelligenceDate.value, 'documentDate', intelligenceDate.confidence, intelligenceDate.evidence);
  if (!candidates.length && document.receivedDate) addCandidate(document.receivedDate, 'receivedDate', 'low', evidence(document.receivedDate, 'low'));

  const distinctYears = [...new Set(candidates.map((candidate) => candidate.year))];
  if (distinctYears.length > 1) {
    return { confidence: 'unknown', evidence: candidates.flatMap((candidate) => candidate.evidence), source: 'unknown', status: 'conflicted' };
  }
  const selected = candidates.sort((a, b) => confidenceRank[b.confidence] - confidenceRank[a.confidence])[0];
  if (!selected) return { confidence: 'unknown', evidence: [], source: 'unknown', status: 'unknown' };
  const isYearOnly = !selected.date;
  return {
    ...selected,
    confidence: isYearOnly ? (selected.confidence === 'high' ? 'medium' : selected.confidence) : selected.confidence,
    status: selected.confidence === 'high' && !isYearOnly ? 'confirmed' : 'proposed',
  };
}

export function migrateArchiveDocument<T extends ArchiveDocument>(document: T, now = new Date()): T {
  const derived = deriveArchiveDate(document, now);
  return {
    ...document,
    importedAt: document.importedAt ?? document.createdAt,
    archiveYear: document.archiveYearManual ? document.archiveYear : derived.year,
    archiveYearConfidence: document.archiveYearManual ? 'high' : derived.confidence,
    archiveYearEvidence: document.archiveYearManual ? (document.archiveYearEvidence ?? []) : derived.evidence,
    archiveYearSource: document.archiveYearManual ? 'manual' : derived.source,
    archiveDateStatus: document.archiveYearManual ? 'confirmed' : derived.status,
    duplicateDecision: document.duplicateDecision ?? (document.duplicateCandidateStatus === 'confirmed' ? 'unknown' : undefined),
  };
}

export function documentArchiveYear(document: ArchiveDocument, now = new Date()): number | undefined {
  return migrateArchiveDocument(document, now).archiveYear;
}

export function relevantPeriodYears(document: ArchiveDocument, now = new Date()): number[] {
  const start = yearFrom(document.relevantPeriodStart);
  const end = yearFrom(document.relevantPeriodEnd);
  if (!start || !end || futureUnsafe(start, now) || futureUnsafe(end, now) || end < start || end - start > 100) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function buildArchiveIndex(documents: ArchiveDocument[], now = new Date()): ArchiveIndex {
  const currentYear = now.getUTCFullYear();
  const counts = new Map<number, Map<number, number>>();
  let unknown = 0;
  documents.filter((document) => document.lifecycle !== 'papierkorb').forEach((document) => {
    const year = documentArchiveYear(document, now);
    if (!year) {
      unknown += 1;
      return;
    }
    const month = parseDate(document.documentDate)?.slice(5, 7);
    const months = counts.get(year) ?? new Map<number, number>();
    const monthNumber = month ? Number(month) : 0;
    months.set(monthNumber, (months.get(monthNumber) ?? 0) + 1);
    counts.set(year, months);
  });
  const years = [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([year, months]) => ({
    year,
    count: [...months.values()].reduce((sum, value) => sum + value, 0),
    months: [...months.entries()].filter(([month]) => month > 0).sort((a, b) => a[0] - b[0]).map(([month, count]) => ({ month, count })),
  }));
  return { total: documents.filter((document) => document.lifecycle !== 'papierkorb').length, known: years.reduce((sum, item) => sum + item.count, 0), unknown, years, currentYear, previousYear: currentYear - 1, lastThreeYears: [currentYear, currentYear - 1, currentYear - 2] };
}

export type ArchiveFilters = {
  year?: number | 'unknown' | 'all';
  month?: number;
  category?: string;
  documentType?: string;
  profileId?: string;
  caseId?: string;
  sender?: string;
  status?: string;
  actionState?: string;
  reviewState?: 'needs_review' | 'reviewed';
  deadlineYear?: number;
  query?: string;
};

export function filterArchiveDocuments<T extends ArchiveDocument>(documents: T[], filters: ArchiveFilters, cases: CaseRecord[] = [], actions: ActionRecord[] = [], now = new Date()): T[] {
  const caseIdsByDocument = new Map<string, string[]>();
  cases.forEach((item) => item.documentIds.forEach((documentId) => caseIdsByDocument.set(documentId, [...(caseIdsByDocument.get(documentId) ?? []), item.id])));
  const matches = (value: string | undefined, query: string | undefined) => !query || (value ?? '').toLocaleLowerCase().includes(query.toLocaleLowerCase());
  return documents.filter((document) => {
    if (document.lifecycle === 'papierkorb') return false;
    const archiveYear = documentArchiveYear(document, now);
    if (filters.year !== undefined && filters.year !== 'all' && (filters.year === 'unknown' ? archiveYear !== undefined : archiveYear !== filters.year)) return false;
    const month = parseDate(document.documentDate)?.slice(5, 7);
    if (filters.month && Number(month) !== filters.month) return false;
    if (filters.category && document.category !== filters.category) return false;
    if (filters.documentType && document.documentType !== filters.documentType) return false;
    if (filters.profileId && !document.profileIds?.includes(filters.profileId)) return false;
    if (filters.caseId && !caseIdsByDocument.get(document.id)?.includes(filters.caseId)) return false;
    if (!matches(document.sender, filters.sender) || (filters.status && document.status !== filters.status)) return false;
    if (filters.query && ![document.title, document.sender, document.category, document.documentType, document.person].some((value) => matches(value, filters.query))) return false;
    if (filters.reviewState === 'needs_review' && document.archiveDateStatus === 'confirmed' && !document.intelligence?.reviewRequired) return false;
    if (filters.reviewState === 'reviewed' && (document.archiveDateStatus !== 'confirmed' || document.intelligence?.reviewRequired)) return false;
    const documentActions = actions.filter((action) => action.documentId === document.id);
    if (filters.actionState && !documentActions.some((action) => action.status === filters.actionState)) return false;
    if (filters.deadlineYear && !documentActions.some((action) => action.dueDate?.startsWith(`${filters.deadlineYear}-`)) && !document.dueDate?.startsWith(`${filters.deadlineYear}-`)) return false;
    return true;
  });
}

export function sortArchiveDocuments<T extends ArchiveDocument>(documents: T[], now = new Date()): T[] {
  return [...documents].sort((a, b) => {
    const yearDifference = (documentArchiveYear(b, now) ?? -Infinity) - (documentArchiveYear(a, now) ?? -Infinity);
    return yearDifference || (parseDate(b.documentDate) ?? b.createdAt).localeCompare(parseDate(a.documentDate) ?? a.createdAt) || a.id.localeCompare(b.id);
  });
}

export function isBulkAcceptable(document: ArchiveDocument): boolean {
  return document.archiveDateStatus === 'confirmed'
    && document.archiveYearConfidence === 'high'
    && document.archiveYearSource === 'documentDate'
    && document.duplicateCandidateStatus !== 'warning'
    && document.duplicateCandidateStatus !== 'confirmed'
    && !document.intelligence?.reviewRequired;
}

export function applyArchiveReview<T extends ArchiveDocument>(document: T, input: { archiveYear?: number; documentDate?: string; duplicateDecision?: DuplicateDecision; reviewStatus?: ArchiveDocument['archiveReviewStatus']; at: string; reason?: ArchiveAuditEntry['reason'] }): T {
  const next = { ...document };
  const audit = [...((document as T & { archiveAuditTrail?: ArchiveAuditEntry[] }).archiveAuditTrail ?? [])];
  if (input.documentDate !== undefined && input.documentDate !== document.documentDate) {
    next.documentDate = input.documentDate;
    audit.unshift({ id: `archive-audit-${hash(`${document.id}|documentDate|${input.at}`)}`, at: input.at, field: 'documentDate', from: document.documentDate, to: input.documentDate, reason: input.reason ?? 'corrected' });
  }
  if (input.archiveYear !== undefined) {
    next.archiveYear = input.archiveYear;
    next.archiveYearManual = true;
    next.archiveYearConfidence = 'high';
    next.archiveYearSource = 'manual';
    next.archiveDateStatus = 'confirmed';
    next.archiveYearEvidence = evidence(`manual archive year ${input.archiveYear}`, 'high');
    audit.unshift({ id: `archive-audit-${hash(`${document.id}|archiveYear|${input.at}`)}`, at: input.at, field: 'archiveYear', from: document.archiveYear?.toString(), to: input.archiveYear.toString(), reason: input.reason ?? 'corrected' });
  }
  if (input.duplicateDecision !== undefined) {
    next.duplicateDecision = input.duplicateDecision;
    audit.unshift({ id: `archive-audit-${hash(`${document.id}|duplicate|${input.at}`)}`, at: input.at, field: 'duplicateDecision', from: document.duplicateDecision, to: input.duplicateDecision, reason: 'duplicate_review' });
  }
  if (input.reviewStatus) next.archiveReviewStatus = input.reviewStatus;
  (next as T & { archiveAuditTrail?: ArchiveAuditEntry[] }).archiveAuditTrail = audit;
  return next;
}

function timelineEvent(input: Omit<TimelineEventRecord, 'id'>): TimelineEventRecord {
  const key = [input.eventType, input.timestamp, input.documentId, input.caseId, input.actionId, input.evidenceRef, JSON.stringify(input.metadata)].join('|');
  return { ...input, id: stableId(key) };
}

function dedupeTimeline(events: TimelineEventRecord[]): TimelineEventRecord[] {
  const unique = new Map<string, TimelineEventRecord>();
  events.forEach((item) => unique.set(item.id, item));
  return [...unique.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.eventType.localeCompare(b.eventType) || a.id.localeCompare(b.id));
}

export function buildDocumentTimeline(document: ArchiveDocument, actions: ActionRecord[] = [], relationships: DocumentRelationship[] = [], replies: ReplyDraftCandidate[] = [], followUps: FollowUpRecord[] = []): TimelineEventRecord[] {
  const events: TimelineEventRecord[] = [];
  if (document.createdAt) events.push(timelineEvent({ eventType: 'document.created', timestamp: document.createdAt, documentId: document.id, titleKey: 'timeline.documentCreated', metadata: { title: document.title } }));
  if (document.receivedDate) events.push(timelineEvent({ eventType: 'document.received', timestamp: document.receivedDate, documentId: document.id, titleKey: 'timeline.documentReceived', metadata: {} }));
  if (document.importedAt) events.push(timelineEvent({ eventType: 'document.imported', timestamp: document.importedAt, documentId: document.id, titleKey: 'timeline.documentImported', metadata: {} }));
  (document.intelligence?.deadlines ?? []).forEach((deadline, index) => {
    if (!deadline.value) return;
    const eventType: TimelineEventType = deadline.kind === 'appointment' ? 'appointment.detected' : 'deadline.detected';
    events.push(timelineEvent({ eventType, timestamp: `${deadline.value}T00:00:00.000Z`, documentId: document.id, titleKey: 'timeline.deadlineDetected', metadata: { value: deadline.value, index, kind: deadline.kind }, confidence: deadline.confidence, evidenceRef: deadline.evidence[0]?.text }));
  });
  (document.archiveAuditTrail ?? []).forEach((audit) => {
    if (audit.field !== 'archiveYear' && audit.field !== 'documentDate') return;
    const eventType: TimelineEventType = audit.reason === 'corrected' ? 'review.corrected' : audit.reason === 'accepted' ? 'review.accepted' : 'review.corrected';
    events.push(timelineEvent({ eventType, timestamp: audit.at, documentId: document.id, titleKey: eventType === 'review.accepted' ? 'timeline.reviewAccepted' : 'timeline.reviewCorrected', metadata: { field: audit.field, from: audit.from, to: audit.to } }));
  });
  actions.filter((action) => action.documentId === document.id).forEach((action) => {
    events.push(timelineEvent({ eventType: 'action.created', timestamp: action.createdAt, documentId: document.id, actionId: action.id, titleKey: 'timeline.actionCreated', metadata: { title: action.title } }));
    action.history.filter((history) => history.event !== 'created').forEach((history) => {
      const eventType: TimelineEventType = history.event === 'completed' ? 'action.completed' : 'action.statusChanged';
      events.push(timelineEvent({ eventType, timestamp: history.at, documentId: document.id, actionId: action.id, titleKey: eventType === 'action.completed' ? 'timeline.actionCompleted' : 'timeline.actionStatusChanged', metadata: { from: history.from, to: history.to } }));
    });
  });
  replies.filter((reply) => reply.documentId === document.id).forEach((reply) => events.push(timelineEvent({ eventType: 'reply.draft', timestamp: reply.createdAt, documentId: document.id, titleKey: 'timeline.replyDraft', metadata: { subject: reply.subject }, confidence: reply.confidence, evidenceRef: reply.evidence[0]?.text })));
  followUps.filter((followUp) => followUp.documentId === document.id).forEach((followUp) => events.push(timelineEvent({ eventType: 'reply.followUp', timestamp: followUp.createdAt, documentId: document.id, titleKey: 'timeline.followUp', metadata: { title: followUp.title }, confidence: followUp.confidence, evidenceRef: followUp.evidence[0]?.text })));
  relationships.filter((relationship) => relationship.fromDocumentId === document.id || relationship.toDocumentId === document.id).forEach((relationship) => events.push(timelineEvent({ eventType: 'relationship.created', timestamp: relationship.createdAt, documentId: document.id, titleKey: 'timeline.relationshipCreated', metadata: { kind: relationship.kind, relatedDocumentId: relationship.fromDocumentId === document.id ? relationship.toDocumentId : relationship.fromDocumentId } })));
  return dedupeTimeline(events);
}

export function buildCaseTimeline(caseItem: CaseRecord, documents: ArchiveDocument[], relationships: DocumentRelationship[] = [], actions: ActionRecord[] = [], replies: ReplyDraftCandidate[] = [], followUps: FollowUpRecord[] = []): TimelineEventRecord[] {
  const events: TimelineEventRecord[] = [
    timelineEvent({ eventType: 'case.opened', timestamp: caseItem.createdAt, caseId: caseItem.id, titleKey: 'timeline.caseOpened', metadata: { title: caseItem.title } }),
    ...caseItem.timelineEvents.map((item) => timelineEvent({ eventType: item.kind === 'status' ? 'case.statusChanged' : 'case.opened', timestamp: item.date, caseId: caseItem.id, titleKey: item.kind === 'status' ? 'timeline.caseStatusChanged' : 'timeline.caseHistory', metadata: { title: item.title } })),
    ...documents.filter((document) => caseItem.documentIds.includes(document.id)).flatMap((document) => buildDocumentTimeline(document, actions, relationships, replies, followUps).map((event) => ({ ...event, caseId: caseItem.id }))),
    ...actions.filter((action) => action.caseId === caseItem.id && (!action.documentId || !caseItem.documentIds.includes(action.documentId))).flatMap((action) => action.history.filter((history) => history.event !== 'created').map((history) => timelineEvent({ eventType: history.event === 'completed' ? 'action.completed' : 'action.statusChanged', timestamp: history.at, caseId: caseItem.id, actionId: action.id, titleKey: history.event === 'completed' ? 'timeline.actionCompleted' : 'timeline.actionStatusChanged', metadata: { from: history.from, to: history.to } }))),
  ];
  if (caseItem.status === 'abgeschlossen') events.push(timelineEvent({ eventType: 'case.closed', timestamp: caseItem.updatedAt, caseId: caseItem.id, titleKey: 'timeline.caseClosed', metadata: {} }));
  return dedupeTimeline(events);
}

export function filterTimelineEvents(events: TimelineEventRecord[], filters: { eventTypes?: TimelineEventType[]; documentId?: string; actionId?: string; caseId?: string; from?: string; to?: string }): TimelineEventRecord[] {
  return events.filter((event) => (!filters.eventTypes?.length || filters.eventTypes.includes(event.eventType)) && (!filters.documentId || event.documentId === filters.documentId) && (!filters.actionId || event.actionId === filters.actionId) && (!filters.caseId || event.caseId === filters.caseId) && (!filters.from || event.timestamp >= filters.from) && (!filters.to || event.timestamp <= filters.to));
}

export function archiveYearLabel(year: number | undefined, currentYear = new Date().getUTCFullYear()): 'current' | 'previous' | 'older' | 'unknown' {
  if (!year) return 'unknown';
  if (year === currentYear) return 'current';
  if (year === currentYear - 1) return 'previous';
  return 'older';
}