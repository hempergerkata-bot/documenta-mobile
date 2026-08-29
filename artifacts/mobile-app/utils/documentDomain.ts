import { eligibleDeadlines, normalizeDocumentDate, type DocumentIntelligenceResult } from './documentIntelligence';

/** Scanner-independent domain model and deterministic local helpers. */
export type CaseStatus = 'offen' | 'wartet_auf_antwort' | 'in_bearbeitung' | 'abgeschlossen';
export type ChecklistStatus = 'vorhanden' | 'fehlt' | 'angefordert' | 'gesendet';
export type RelationshipKind = 'vorheriges' | 'antwort' | 'erinnerung' | 'zahlung' | 'abschluss';
export type LifecycleStatus = 'aktiv' | 'archiviert' | 'papierkorb';

export type CaseRecord = {
  id: string; title: string; status: CaseStatus; profileIds: string[]; documentIds: string[];
  note?: string; dueDate?: string; deadlines?: { id: string; title: string; dueDate: string }[]; missingData: MissingRequirement[]; checklist: ChecklistItem[]; timelineEvents: TimelineEvent[]; taskIds: string[]; createdAt: string; updatedAt: string;
};
export type ChecklistItem = { id: string; title: string; status: ChecklistStatus; dueDate?: string };
export type MissingRequirement = { id: string; title: string; type: 'document' | 'data' | 'signature' | 'proof'; status: ChecklistStatus };
export type TimelineEvent = { id: string; title: string; date: string; kind: 'note' | 'deadline' | 'status' | 'activity' };
export type DocumentRelationship = { id: string; fromDocumentId: string; toDocumentId: string; kind: RelationshipKind; createdAt: string };
export type NotificationRecord = { id: string; kind: 'frist' | 'zahlung' | 'antwort' | 'neu' | 'fehlend'; title: string; body: string; target?: string; read: boolean; createdAt: string };
export type ActivityRecord = { id: string; type: 'dokument' | 'fall' | 'aufgabe' | 'archiv' | 'export'; message: string; createdAt: string };
export type ExportPackage = { id: string; documentIds: string[]; recipient: string; type: 'accountant' | 'lawyer' | 'authority' | 'doctor'; format: 'PDF-package'; orderedIds: string[]; includeToc: boolean; caseName?: string; createdAt: string };
export type SecuritySettings = { biometricProtection: boolean; pinEnabled: boolean; sensitiveDocumentsProtection: boolean; autoLockMinutes: number; cloudSyncEnabled: boolean; gmailAccessEnabled: boolean; aiProcessingEnabled: boolean; retentionPolicy: '30 Tage' | '1 Jahr' | 'Unbegrenzt'; analyticsEnabled: boolean; localOnly: boolean; retentionDays: number; permissions: Record<'kamera' | 'dateien' | 'benachrichtigungen', 'nicht_erfragt' | 'erlaubt' | 'abgelehnt'> };
export type OnboardingState = { completed: boolean; language: 'Deutsch' | 'English'; profileName?: string; privacyAccepted: boolean };
export type FamilyWorkspace = { enabled: boolean; members: { id: string; name: string; role: 'Eigentümer' | 'Mitglied' | 'Lesen'; permissions: string[]; visibleDocumentIds: string[] }[]; sharedHouseholdDocumentIds: string[] };
export type BusinessWorkspace = { enabled: boolean; organizationName?: string; members: { id: string; name: string; role: 'Admin' | 'Freigabe' | 'Lesen' }[]; approvalRequired: boolean; documentOwnership: { documentId: string; ownerId: string; approvalStatus: 'offen' | 'genehmigt' | 'abgelehnt' }[]; sharedInbox: 'Coming Soon'; auditLog: 'Coming Soon' };
export type ContractMonitor = { id: string; documentId?: string; title: string; provider: string; startDate?: string; endDate?: string; cancellationNotice?: string; automaticRenewal: boolean; nextCancellationDate?: string; status: 'aktiv' | 'prüfen' | 'beendet' };
export type RecurringCost = { id: string; title: string; monthlyFee?: string; yearlyFee?: string; cadence: 'monatlich' | 'jährlich'; nextCharge?: string; provider: string; contractId?: string; category: string; status: 'aktiv' | 'gekündigt' };
export type CompareRecord = { id: string; documentIds: [string, string]; createdAt: string };

export type DomainDocument = {
  id: string; title: string; sender: string; category: string; documentType: string; documentDate: string;
  person: string; tags: string[]; note?: string; ocrText?: string; dueDate?: string; amount?: string;
  createdAt: string; lifecycle?: LifecycleStatus; fingerprint?: string; source?: 'camera' | 'gallery' | 'file' | 'scanner' | 'gmail' | 'email'; duplicateCandidateStatus?: 'none' | 'warning' | 'confirmed';
  intelligence?: DocumentIntelligenceResult;
};
export type DomainTask = { id: string; title: string; documentId: string; caseId?: string; dueDate?: string; completed: boolean; priority: 'niedrig' | 'mittel' | 'hoch'; createdAt: string };

const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('de').replace(/[^a-z0-9]+/g, ' ').trim();
/** Stable metadata fingerprint; binary file hashing can be added by a future import adapter. */
export function documentFingerprint(document: Pick<DomainDocument, 'title' | 'sender' | 'documentDate' | 'amount'>): string {
  return [document.title, document.sender, document.documentDate, document.amount ?? ''].map(normalize).join('|');
}
export function findDuplicates<T extends DomainDocument>(document: T, documents: T[]): T[] {
  const fingerprint = document.fingerprint ?? documentFingerprint(document);
  return documents.filter((item) => item.id !== document.id && (item.fingerprint ?? documentFingerprint(item)) === fingerprint);
}
export function selectActiveDocuments<T extends { lifecycle?: LifecycleStatus }>(documents: T[]): T[] {
  return documents.filter((document) => !document.lifecycle || document.lifecycle === 'aktiv');
}
export function searchEverything(documents: DomainDocument[], cases: CaseRecord[], tasks: DomainTask[], query: string): { documents: DomainDocument[]; cases: CaseRecord[]; tasks: DomainTask[] } {
  const term = normalize(query);
  if (!term) return { documents, cases, tasks };
  const matches = (...values: (string | undefined | string[])[]) => normalize(values.flatMap((v) => Array.isArray(v) ? v : [v ?? '']).join(' ')).includes(term);
  return {
    documents: documents.filter((d) => matches(d.title, d.sender, d.category, d.documentType, d.note, d.ocrText, d.tags)),
    cases: cases.filter((c) => matches(c.title, c.note, c.missingData.map(x=>x.title), c.checklist.map((x) => x.title))),
    tasks: tasks.filter((t) => matches(t.title)),
  };
}
export function dueSoon(date?: string, now = new Date()): boolean {
  if (!date) return false;
  const canonical = normalizeDocumentDate(date);
  if (!canonical) return false;
  const value = Date.parse(`${canonical}T00:00:00Z`);
  return !Number.isNaN(value) && value >= now.getTime() && value <= now.getTime() + 7 * 86400000;
}
export function generatedNotifications(documents: DomainDocument[], cases: CaseRecord[], tasks: DomainTask[], now = new Date()): NotificationRecord[] {
  const notices: NotificationRecord[] = [];
  documents.forEach((d) => { const canonicalDue=normalizeDocumentDate(d.dueDate ?? ''); const due=canonicalDue ? Date.parse(`${canonicalDue}T00:00:00Z`) : Number.NaN; if (!Number.isNaN(due) && due < now.getTime()) notices.push({id:`overdue-${d.id}`,kind:'frist',title:'Frist überfällig',body:d.title,target:`/document/${d.id}`,read:false,createdAt:now.toISOString()}); else if(dueSoon(d.dueDate,now)) notices.push({ id: `due-doc-${d.id}`, kind: d.amount ? 'zahlung' : 'frist', title: d.amount ? 'Zahlung steht an' : 'Frist steht an', body: d.title, target: `/document/${d.id}`, read: false, createdAt: now.toISOString() }); if(d.amount && d.lifecycle!=='papierkorb') notices.push({id:`payable-${d.id}`,kind:'zahlung',title:'Zahlbarer Betrag',body:`${d.title}: ${d.amount}`,target:`/document/${d.id}`,read:false,createdAt:now.toISOString()}); if(Date.parse(d.createdAt)>=now.getTime()-7*86400000) notices.push({id:`new-${d.id}`,kind:'neu',title:'Neues Dokument',body:d.title,target:`/document/${d.id}`,read:false,createdAt:now.toISOString()}); });
  documents.forEach((d) => {
    if (d.intelligence?.reviewRequired) notices.push({ id:`review-${d.id}`, kind:'fehlend', title:'Analyse prüfen', body:d.title, target:`/document/${d.id}`, read:false, createdAt:now.toISOString() });
    (d.intelligence ? eligibleDeadlines(d.intelligence) : []).filter((deadline) => dueSoon(deadline.value, now)).forEach((deadline, index) => notices.push({ id:`intelligence-deadline-${d.id}-${index}`, kind:deadline.kind === 'payment' ? 'zahlung' : 'frist', title:'Erkannte Frist steht an', body:`${d.title}: ${deadline.value}`, target:`/document/${d.id}`, read:false, createdAt:now.toISOString() }));
  });
  tasks.filter((t) => !t.completed && dueSoon(t.dueDate, now)).forEach((t) => notices.push({ id: `due-task-${t.id}`, kind: 'frist', title: 'Aufgabe bald fällig', body: t.title, target: '/tasks', read: false, createdAt: now.toISOString() }));
  cases.filter((c) => c.missingData.length > 0).forEach((c) => notices.push({ id: `missing-${c.id}`, kind: 'fehlend', title: 'Angaben fehlen', body: `${c.title}: ${c.missingData.map(x=>x.title).join(', ')}`, target: `/cases/${c.id}`, read: false, createdAt: now.toISOString() }));
  cases.filter(c=>c.status==='wartet_auf_antwort').forEach(c=>notices.push({id:`waiting-${c.id}`,kind:'antwort',title:'Warten auf Antwort',body:c.title,target:`/cases/${c.id}`,read:false,createdAt:now.toISOString()}));
  return notices;
}
export function caseTimeline(caseItem: CaseRecord, documents: DomainDocument[], relationships: DocumentRelationship[]): { label: string; date: string; kind: string }[] {
  const ids = new Set(caseItem.documentIds);
  const docs = documents.filter((d) => ids.has(d.id)).map((d) => ({ label: d.title, date: d.documentDate || d.createdAt, kind: 'Dokument' }));
  const links = relationships.filter((r) => ids.has(r.fromDocumentId) || ids.has(r.toDocumentId)).map((r) => ({ label: `Dokumentbeziehung: ${r.kind.replace(/_/g, ' ')}`, date: r.createdAt, kind: 'Verknüpfung' }));
  return [...docs, ...links, ...caseItem.timelineEvents.map(x=>({label:x.title,date:x.date,kind:x.kind}))].sort((a, b) => a.date.localeCompare(b.date));
}
export function cleanupDeletedDocument<T extends { documentIds: string[] }, R extends { fromDocumentId: string; toDocumentId: string }, K extends { documentId: string }>(id: string, cases: T[], relationships: R[], tasks: K[]) { return { cases: cases.map(c=>({...c,documentIds:c.documentIds.filter(x=>x!==id)})), relationships: relationships.filter(r=>r.fromDocumentId!==id&&r.toDocumentId!==id), tasks: tasks.filter(t=>t.documentId!==id) }; }