import {
  eligibleDeadlines,
  isDeadlineEligible,
  isMainAmountEligible,
  normalizeDocumentDate,
  type Confidence,
  type DocumentIntelligenceResult,
  type Evidence,
  type DeadlineKind,
  type ReviewDecision,
} from './documentIntelligence';

export const ACTION_ENGINE_SCHEMA_VERSION = '1.0.0';

export type ActionType =
  | 'pay'
  | 'reply'
  | 'submit_document'
  | 'upload_document'
  | 'call'
  | 'attend_appointment'
  | 'cancel'
  | 'renew'
  | 'object_or_appeal'
  | 'review'
  | 'sign'
  | 'provide_information'
  | 'wait_for_response'
  | 'follow_up'
  | 'archive'
  | 'mark_done'
  | 'custom';
export type ActionStatus = 'suggested' | 'needs_review' | 'confirmed' | 'in_progress' | 'waiting' | 'completed' | 'cancelled' | 'rejected' | 'archived';
export type ActionPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ActionSource = 'intelligence' | 'user' | 'automation' | 'legacy';
export type ActionHistoryEvent = 'created' | 'user_confirmed' | 'edited' | 'deadline_changed' | 'priority_changed' | 'status_changed' | 'completed' | 'reopened' | 'cancelled' | 'rejected' | 'archived';
export type CandidateStatus = 'suggested' | 'needs_review' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

export type ActionEvidence = Evidence & { field?: string };
export type ActionHistoryEntry = {
  id: string;
  event: ActionHistoryEvent;
  at: string;
  from?: string;
  to?: string;
  note?: string;
};

export type ActionRecord = {
  schemaVersion: typeof ACTION_ENGINE_SCHEMA_VERSION;
  id: string;
  documentId?: string;
  caseId?: string;
  profileId?: string;
  type: ActionType;
  title: string;
  description: string;
  status: ActionStatus;
  priority: ActionPriority;
  dueDate?: string;
  source: ActionSource;
  sourceReference?: string;
  confidence: Confidence;
  evidence: ActionEvidence[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userConfirmed: boolean;
  manualEdits?: Array<'title' | 'description' | 'dueDate' | 'priority' | 'status'>;
  blockedBy?: string[];
  dependsOn?: string[];
  unlocks?: string[];
  dedupeKey: string;
  history: ActionHistoryEntry[];
};

export type ReminderRecord = {
  schemaVersion: typeof ACTION_ENGINE_SCHEMA_VERSION;
  id: string;
  actionId?: string;
  documentId?: string;
  title: string;
  remindAt: string;
  status: CandidateStatus;
  confidence: Confidence;
  evidence: ActionEvidence[];
  sourceReference: string;
  dedupeKey: string;
  userConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FollowUpRecord = {
  schemaVersion: typeof ACTION_ENGINE_SCHEMA_VERSION;
  id: string;
  actionId?: string;
  documentId?: string;
  title: string;
  dueDate?: string;
  status: CandidateStatus;
  confidence: Confidence;
  evidence: ActionEvidence[];
  sourceReference: string;
  dedupeKey: string;
  userConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReplyDraftCandidate = {
  schemaVersion: typeof ACTION_ENGINE_SCHEMA_VERSION;
  id: string;
  actionId?: string;
  documentId?: string;
  recipient?: string;
  subject: string;
  body: string;
  status: CandidateStatus;
  confidence: Confidence;
  evidence: ActionEvidence[];
  sourceReference: string;
  dedupeKey: string;
  userConfirmed: boolean;
  /** Optional localization metadata; older persisted candidates remain valid. */
  language?: 'de' | 'hu' | 'en';
  /** User-edited drafts must not be replaced by automatic reconciliation. */
  userEdited?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventSourceType = 'appointment' | 'official_deadline' | 'payment_deadline' | 'cancellation_deadline' | 'renewal_date' | 'follow_up';
export type CalendarEventCandidate = {
  schemaVersion: typeof ACTION_ENGINE_SCHEMA_VERSION;
  id: string;
  sourceType: CalendarEventSourceType;
  actionId?: string;
  documentId?: string;
  caseId?: string;
  title: string;
  startAt: string;
  endAt?: string;
  allDay: boolean;
  location?: string;
  notes?: string;
  confidence: Confidence;
  evidence: ActionEvidence[];
  status: CandidateStatus;
  userConfirmed: boolean;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
};

export type AutomationTriggerType = 'action_created' | 'action_due_soon' | 'action_overdue' | 'action_completed' | 'reminder_due' | 'follow_up_due' | 'document_added' | 'document_review_confirmed' | 'case_status_changed';
export type AutomationActionType = 'create_reminder' | 'suggest_follow_up' | 'change_local_status' | 'create_calendar_candidate' | 'surface_in_task_center' | 'create_reply_draft_candidate' | 'mark_for_review';
export type AutomationCondition = {
  actionType?: ActionType;
  priority?: ActionPriority;
  status?: ActionStatus;
  documentType?: string;
  caseStatus?: string;
  confidence?: Confidence;
  risk?: string;
  profileId?: string;
  dueDateProximityDays?: number;
  userConfirmed?: boolean;
};
export type AutomationRule = {
  schemaVersion: typeof ACTION_ENGINE_SCHEMA_VERSION;
  id: string;
  name: string;
  enabled: boolean;
  triggerType: AutomationTriggerType;
  conditions: AutomationCondition;
  actions: AutomationActionType[];
  scope: 'all' | 'profile' | 'case' | 'document';
  createdAt: string;
  updatedAt: string;
  userCreated: boolean;
  systemPreset: boolean;
};

export type ActionEngineDocument = {
  id: string;
  title: string;
  sender?: string;
  documentType?: string;
  person?: string;
  profileIds?: string[];
  intelligence?: DocumentIntelligenceResult;
};

export type ActionEngineState = {
  schemaVersion: typeof ACTION_ENGINE_SCHEMA_VERSION;
  actions: ActionRecord[];
  reminders: ReminderRecord[];
  followUps: FollowUpRecord[];
  replyDrafts: ReplyDraftCandidate[];
  calendarCandidates: CalendarEventCandidate[];
  automationRules: AutomationRule[];
};

const confidenceRank: Record<Confidence, number> = { unknown: 0, low: 1, medium: 2, high: 3 };
const priorityRank: Record<ActionPriority, number> = { low: 0, normal: 1, high: 2, urgent: 3 };
const nowIso = (now = new Date()) => now.toISOString();
const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0).toString(36);
};
const stableId = (prefix: string, key: string) => `${prefix}-${hash(key)}`;
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

export function confidenceFromEvidence(evidence: Evidence[]): Confidence {
  if (!evidence.length) return 'unknown';
  if (evidence.some((item) => item.confidence === 'unknown')) return 'unknown';
  if (evidence.some((item) => item.confidence === 'low')) return 'low';
  return evidence.some((item) => item.confidence === 'high') ? 'high' : 'medium';
}

function decisionFor(result: DocumentIntelligenceResult, field: string): ReviewDecision | undefined {
  return result.reviewRecords.find((record) => record.field === field)?.decision;
}

export function sourceIsSafe(result: DocumentIntelligenceResult, field: string, confidence: Confidence, evidence: Evidence[]): boolean {
  const decision = decisionFor(result, field);
  if (!evidence.length || confidence === 'low' || confidence === 'unknown') return false;
  return decision !== 'reject' && decision !== 'unknown';
}

export function actionTypeLabel(type: ActionType): string {
  return {
    pay: 'Zahlung', reply: 'Antwort', submit_document: 'Dokument einreichen', upload_document: 'Dokument hochladen',
    call: 'Anrufen', attend_appointment: 'Termin wahrnehmen', cancel: 'Kündigung/Widerspruch',
    renew: 'Verlängern', object_or_appeal: 'Widerspruch einlegen', review: 'Prüfen', sign: 'Unterschreiben',
    provide_information: 'Angaben bereitstellen', wait_for_response: 'Auf Antwort warten', follow_up: 'Nachfassen',
    archive: 'Archivieren', mark_done: 'Erledigen', custom: 'Eigene Aufgabe',
  }[type];
}

function typeFromRequirement(requirement: string): ActionType {
  if (/(?:zahl|pay|fällig|fizet)/i.test(requirement)) return 'pay';
  if (/(?:antwort|reply|respond|válasz)/i.test(requirement)) return 'reply';
  if (/(?:unterschrift|signatur|sign\b|aláírás)/i.test(requirement)) return 'sign';
  if (/(?:anrufen|telefon|call|hív)/i.test(requirement)) return 'call';
  if (/(?:hochladen|upload|feltölt)/i.test(requirement)) return 'upload_document';
  if (/(?:einreichen|unterlage|dokument|nachweis|submit|csatol|beküld)/i.test(requirement)) return 'submit_document';
  if (/(?:widerspruch|einspruch|appeal|fellebbez)/i.test(requirement)) return 'object_or_appeal';
  if (/(?:kündig|cancel|felmond)/i.test(requirement)) return 'cancel';
  if (/(?:termin|appointment|időpont)/i.test(requirement)) return 'attend_appointment';
  if (/(?:nachfassen|follow.?up|erneut|újra)/i.test(requirement)) return 'follow_up';
  if (/(?:angabe|information|provide|adat)/i.test(requirement)) return 'provide_information';
  return 'review';
}

function actionPriority(
  type: ActionType,
  sourcePriority: 'high' | 'medium' | 'low',
  result: DocumentIntelligenceResult,
  dueDate?: string,
  now = new Date(),
): ActionPriority {
  let score = sourcePriority === 'high' ? 2 : sourcePriority === 'medium' ? 1 : 0;
  if (type === 'pay' || type === 'attend_appointment' || type === 'object_or_appeal') score += 1;
  if (result.consequences.riskLevel.value === 'high') score += 1;
  if (result.consequences.riskLevel.value === 'critical') score += 2;
  if (dueDate) {
    const due = Date.parse(`${dueDate}T00:00:00Z`);
    const days = Math.ceil((due - now.getTime()) / 86400000);
    if (!Number.isNaN(due) && days <= 2) score += 2;
    else if (!Number.isNaN(due) && days <= 7) score += 1;
  }
  return score >= 5 ? 'urgent' : score >= 3 ? 'high' : score >= 1 ? 'normal' : 'low';
}

function makeAction(
  document: ActionEngineDocument,
  type: ActionType,
  title: string,
  description: string,
  sourceReference: string,
  field: string,
  confidence: Confidence,
  evidence: Evidence[],
  dueDate: string | undefined,
  sourcePriority: 'high' | 'medium' | 'low',
  now: Date,
): ActionRecord {
  const safeDate = dueDate && normalizeDocumentDate(dueDate) ? normalizeDocumentDate(dueDate) : undefined;
  const dedupeKey = `intelligence|${document.id}|${type}|${sourceReference}`;
  const status: ActionStatus = sourceIsSafe(document.intelligence!, field, confidence, evidence) ? 'suggested' : 'needs_review';
  const createdAt = nowIso(now);
  return {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION,
    id: stableId('action', dedupeKey),
    documentId: document.id,
    type,
    title,
    description,
    status,
    priority: actionPriority(type, sourcePriority, document.intelligence!, safeDate, now),
    dueDate: status === 'suggested' ? safeDate : undefined,
    source: 'intelligence',
    sourceReference,
    confidence,
    evidence: evidence.map((item) => ({ ...item, field })),
    createdAt,
    updatedAt: createdAt,
    userConfirmed: false,
    dedupeKey,
    history: [{ id: stableId('history', `${dedupeKey}|created`), event: 'created', at: createdAt, note: 'Lokális intelligence-javaslat' }],
  };
}

export function deriveActionsFromDocument(document: ActionEngineDocument, now = new Date()): ActionRecord[] {
  const result = document.intelligence;
  if (!result) return [];
  const actions: ActionRecord[] = [];
  result.actions.forEach((item, index) => {
    const type = typeFromRequirement(item.requirement);
    const evidence = item.evidence;
    const confidence = confidenceFromEvidence(evidence);
    const dueDate = item.deadlineIndex !== undefined && isDeadlineEligible(result, item.deadlineIndex) ? result.deadlines[item.deadlineIndex]?.value : undefined;
    const semanticSource = `intelligence.actions.${hash(clean(item.requirement).toLocaleLowerCase('de'))}`;
    actions.push(makeAction(document, type, `${actionTypeLabel(type)}: ${clean(item.requirement).slice(0, 90)}`, clean(item.requirement), semanticSource, 'actions', confidence, evidence, dueDate, item.priority, now));
  });

  result.missingRequirements.forEach((item, index) => {
    const confidence = confidenceFromEvidence(item.evidence);
    const semanticSource = `intelligence.missingRequirements.${hash(clean(item.requirement).toLocaleLowerCase('de'))}`;
    actions.push(makeAction(document, 'submit_document', `Fehlende Anforderung: ${clean(item.requirement).slice(0, 80)}`, clean(item.requirement), semanticSource, 'actions', confidence, item.evidence, undefined, 'medium', now));
  });

  if (isMainAmountEligible(result) && result.amounts.main.value && !actions.some((item) => item.type === 'pay')) {
    actions.push(makeAction(document, 'pay', `Zahlung: ${result.amounts.main.value}`, 'Der belegte Hauptbetrag kann geprüft und anschließend manuell bezahlt werden.', 'intelligence.amounts.main', 'mainAmount', result.amounts.main.confidence, result.amounts.main.evidence, eligibleDeadlines(result).find((item) => item.kind === 'payment')?.value, 'high', now));
  }
  const appointment = eligibleDeadlines(result).find((item) => item.kind === 'appointment');
  if (appointment && !actions.some((item) => item.type === 'attend_appointment')) {
    actions.push(makeAction(document, 'attend_appointment', `Termin wahrnehmen: ${appointment.value}`, 'Ein belegter Termin wurde als nächster Schritt vorgeschlagen.', 'intelligence.deadlines.appointment', 'deadlines', appointment.confidence, appointment.evidence, appointment.value, 'high', now));
  }
  const cancellation = result.rightsOptions.find((item) => /(?:kündig|cancel|felmond)/i.test(item.option));
  if (cancellation && !actions.some((item) => item.type === 'cancel')) {
    actions.push(makeAction(document, 'cancel', 'Kündigung/Widerspruch prüfen', clean(cancellation.option), 'intelligence.rightsOptions.cancellation', 'rightsOptions', confidenceFromEvidence(cancellation.evidence), cancellation.evidence, cancellation.deadlineIndex !== undefined && isDeadlineEligible(result, cancellation.deadlineIndex) ? result.deadlines[cancellation.deadlineIndex]?.value : undefined, 'medium', now));
  }
  if (result.responseNecessary.value && !actions.some((item) => item.type === 'reply')) {
    actions.push(makeAction(document, 'reply', 'Antwort vorbereiten', 'Eine Antwortpflicht wurde vom Intelligence-Ergebnis belegt; der Entwurf bleibt vor dem Versand zu prüfen.', 'intelligence.responseNecessary', 'actions', result.responseNecessary.confidence, result.responseNecessary.evidence, undefined, 'high', now));
  }
  return dedupeActions(actions);
}

export function dedupeActions(actions: ActionRecord[]): ActionRecord[] {
  const seen = new Map<string, ActionRecord>();
  actions.forEach((item) => {
    const previous = seen.get(item.dedupeKey);
    if (!previous) seen.set(item.dedupeKey, item);
    else if (previous.source === 'intelligence' && !previous.userConfirmed && !previous.manualEdits?.length && previous.history.length <= 1 && confidenceRank[item.confidence] > confidenceRank[previous.confidence]) seen.set(item.dedupeKey, item);
  });
  return [...seen.values()];
}

export function mergeDerivedActions(existing: ActionRecord[], documents: ActionEngineDocument[], now = new Date()): ActionRecord[] {
  const refreshedDocumentIds = new Set(documents.map((document) => document.id));
  const generated = documents.flatMap((document) => deriveActionsFromDocument(document, now));
  const preserved = existing.filter((action) => {
    if (!action.documentId || !refreshedDocumentIds.has(action.documentId) || action.source !== 'intelligence') return true;
    return action.userConfirmed || !!action.manualEdits?.length || ['completed', 'cancelled', 'rejected', 'archived'].includes(action.status);
  });
  return dedupeActions([...preserved, ...generated]);
}

export function createCustomAction(input: Pick<ActionRecord, 'title' | 'description' | 'priority' | 'documentId' | 'caseId' | 'profileId'> & { dueDate?: string; now?: Date }): ActionRecord {
  const now = input.now ?? new Date();
  const dedupeKey = `user|${input.documentId ?? 'none'}|${input.caseId ?? 'none'}|${clean(input.title).toLocaleLowerCase('de')}`;
  const createdAt = nowIso(now);
  return {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, id: stableId('action', dedupeKey), documentId: input.documentId, caseId: input.caseId, profileId: input.profileId,
    type: 'custom', title: clean(input.title), description: clean(input.description), status: 'confirmed', priority: input.priority,
    dueDate: input.dueDate && normalizeDocumentDate(input.dueDate) ? normalizeDocumentDate(input.dueDate) : undefined,
    source: 'user', sourceReference: 'user.custom', confidence: 'high', evidence: [], createdAt, updatedAt: createdAt, userConfirmed: true,
    manualEdits: ['title', 'description', 'priority', ...(input.dueDate ? ['dueDate' as const] : [])], dedupeKey,
    history: [{ id: stableId('history', `${dedupeKey}|created`), event: 'created', at: createdAt, note: 'Felhasználó által létrehozva' }],
  };
}

function transition(action: ActionRecord, status: ActionStatus, now = new Date(), note?: string): ActionRecord {
  if (action.status === status) return action;
  const at = nowIso(now);
  const event: ActionHistoryEvent = status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : status === 'rejected' ? 'rejected' : status === 'archived' ? 'archived' : status === 'confirmed' ? 'user_confirmed' : status === 'suggested' && action.status === 'completed' ? 'reopened' : 'status_changed';
  return {
    ...action,
    status,
    userConfirmed: status === 'confirmed' || action.userConfirmed,
    completedAt: status === 'completed' ? at : status === 'suggested' ? undefined : action.completedAt,
    updatedAt: at,
    history: [...action.history, { id: stableId('history', `${action.id}|${at}|${event}`), event, at, from: action.status, to: status, note }],
  };
}

export function transitionAction(action: ActionRecord, status: ActionStatus, now = new Date(), note?: string): ActionRecord {
  if (['rejected', 'cancelled', 'archived'].includes(action.status) && status !== action.status) return action;
  if (status === 'completed' && !action.userConfirmed) return action;
  return transition(action, status, now, note);
}

export function editAction(action: ActionRecord, patch: Partial<Pick<ActionRecord, 'title' | 'description' | 'dueDate' | 'priority' | 'status'>>, now = new Date()): ActionRecord {
  const at = nowIso(now);
  const manualEdits = [...new Set([...(action.manualEdits ?? []), ...(['title', 'description', 'dueDate', 'priority', 'status'] as const).filter((key) => patch[key] !== undefined && patch[key] !== action[key])])];
  const history = [...action.history];
  if (patch.dueDate !== undefined && patch.dueDate !== action.dueDate) history.push({ id: stableId('history', `${action.id}|${at}|deadline`), event: 'deadline_changed', at, from: action.dueDate, to: patch.dueDate });
  if (patch.priority !== undefined && patch.priority !== action.priority) history.push({ id: stableId('history', `${action.id}|${at}|priority`), event: 'priority_changed', at, from: action.priority, to: patch.priority });
  if (patch.title !== undefined || patch.description !== undefined) history.push({ id: stableId('history', `${action.id}|${at}|edit`), event: 'edited', at });
  const next = { ...action, ...patch, dueDate: patch.dueDate === undefined ? action.dueDate : normalizeDocumentDate(patch.dueDate) || undefined, updatedAt: at, manualEdits, history };
  return patch.status ? transition(next, patch.status, now) : next;
}

export function isActionEligible(action: ActionRecord): boolean {
  return action.status !== 'needs_review' && action.status !== 'rejected' && action.status !== 'cancelled' && action.status !== 'archived' && action.status !== 'completed'
    && !!action.evidence.length && (action.confidence === 'high' || action.confidence === 'medium');
}

export function isActionExecutable(action: ActionRecord, actions: ActionRecord[]): boolean {
  const dependencies = action.dependsOn ?? [];
  return isActionEligible(action) && action.userConfirmed && !dependencies.some((id) => {
    const dependency = actions.find((item) => item.id === id);
    return !dependency || dependency.status !== 'completed';
  });
}

export function nextBestAction(actions: ActionRecord[], now = new Date()): ActionRecord | undefined {
  const executable = actions.filter((action) => isActionExecutable(action, actions) && action.status !== 'completed' && action.status !== 'waiting');
  return [...executable].sort((a, b) => {
    const due = (item: ActionRecord) => item.dueDate ? Date.parse(`${item.dueDate}T00:00:00Z`) : Number.POSITIVE_INFINITY;
    const dueDifference = due(a) - due(b);
    return priorityRank[b.priority] - priorityRank[a.priority] || (dueDifference || 0) || b.createdAt.localeCompare(a.createdAt);
  })[0];
}

function candidateStatus(action: ActionRecord): CandidateStatus {
  const gate = automationSafetyGate({ confidence: action.confidence, evidence: action.evidence, userConfirmed: action.userConfirmed, downstreamEligible: isActionEligible(action) });
  return gate.allowed ? 'confirmed' : 'needs_review';
}

export function createReminderCandidate(action: ActionRecord, now = new Date()): ReminderRecord | undefined {
  if (!action.dueDate || !normalizeDocumentDate(action.dueDate) || ['completed', 'cancelled', 'rejected', 'archived'].includes(action.status)) return undefined;
  const dedupeKey = `reminder|${action.id}|${action.dueDate}`;
  const createdAt = nowIso(now);
  return { schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, id: stableId('reminder', dedupeKey), actionId: action.id, documentId: action.documentId, title: action.title, remindAt: action.dueDate, status: candidateStatus(action), confidence: action.confidence, evidence: action.evidence, sourceReference: action.sourceReference ?? action.id, dedupeKey, userConfirmed: action.userConfirmed, createdAt, updatedAt: createdAt };
}

export function createFollowUpCandidate(action: ActionRecord, now = new Date()): FollowUpRecord | undefined {
  if (['completed', 'cancelled', 'rejected', 'archived'].includes(action.status) || (action.type !== 'follow_up' && action.type !== 'wait_for_response' && action.type !== 'reply')) return undefined;
  const dedupeKey = `follow-up|${action.id}|${action.dueDate ?? 'none'}`;
  const createdAt = nowIso(now);
  return { schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, id: stableId('follow-up', dedupeKey), actionId: action.id, documentId: action.documentId, title: `Nachfassen: ${action.title}`, dueDate: action.dueDate, status: candidateStatus(action), confidence: action.confidence, evidence: action.evidence, sourceReference: action.sourceReference ?? action.id, dedupeKey, userConfirmed: action.userConfirmed, createdAt, updatedAt: createdAt };
}

export function createReplyDraftCandidate(action: ActionRecord, document: ActionEngineDocument, now = new Date()): ReplyDraftCandidate | undefined {
  if (['completed', 'cancelled', 'rejected', 'archived'].includes(action.status) || action.type !== 'reply' || !action.evidence.length) return undefined;
  const dedupeKey = `reply-draft|${action.id}`;
  const createdAt = nowIso(now);
  return {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, id: stableId('reply-draft', dedupeKey), actionId: action.id, documentId: document.id,
    recipient: document.sender, subject: `Antwort prüfen: ${document.title}`,
    body: `Entwurf zur Prüfung.\n\nBeleg aus dem Dokument: „${action.evidence[0].text}“\n\nBitte Inhalt, Empfänger und Anlagen vor dem Versand selbst prüfen.`,
    status: 'needs_review', confidence: action.confidence, evidence: action.evidence, sourceReference: action.sourceReference ?? action.id, dedupeKey, userConfirmed: false, createdAt, updatedAt: createdAt,
  };
}

const deadlineSource: Record<DeadlineKind, CalendarEventSourceType> = {
  appointment: 'appointment', payment: 'payment_deadline', cancellation: 'cancellation_deadline', response: 'official_deadline', appeal: 'official_deadline', other: 'official_deadline',
};
export function createCalendarCandidate(input: { document: ActionEngineDocument; action?: ActionRecord; deadlineIndex?: number; caseId?: string; now?: Date }): CalendarEventCandidate | undefined {
  const result = input.document.intelligence;
  const deadline = result && input.deadlineIndex !== undefined ? result.deadlines[input.deadlineIndex] : input.action?.dueDate ? undefined : undefined;
  const date = deadline?.value ?? input.action?.dueDate;
  if (!date || !normalizeDocumentDate(date)) return undefined;
  const safe = result && input.deadlineIndex !== undefined
    ? isDeadlineEligible(result, input.deadlineIndex) && !!deadline?.evidence.length
    : !!input.action && isActionEligible(input.action);
  const confidence = deadline?.confidence ?? input.action?.confidence ?? 'unknown';
  const evidence = deadline?.evidence ?? input.action?.evidence ?? [];
  const sourceType = deadline ? deadlineSource[deadline.kind] : input.action?.type === 'follow_up' ? 'follow_up' : 'official_deadline';
  const dedupeKey = `calendar|${input.document.id}|${input.action?.id ?? 'deadline'}|${sourceType}|${date}`;
  const createdAt = nowIso(input.now);
  return {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, id: stableId('calendar', dedupeKey), sourceType, actionId: input.action?.id, documentId: input.document.id, caseId: input.caseId,
    title: input.action?.title ?? `${actionTypeLabel(sourceType === 'appointment' ? 'attend_appointment' : 'review')}: ${date}`, startAt: `${date}T09:00:00.000Z`, allDay: true,
    notes: evidence[0]?.text, confidence, evidence, status: safe && (confidence === 'high' || confidence === 'medium') ? (input.action?.userConfirmed ? 'confirmed' : 'suggested') : 'needs_review',
    userConfirmed: input.action?.userConfirmed ?? false, dedupeKey, createdAt, updatedAt: createdAt,
  };
}

export function dedupeCandidates<T extends { dedupeKey: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  items.forEach((item) => { if (!seen.has(item.dedupeKey)) seen.set(item.dedupeKey, item); });
  return [...seen.values()];
}

export function reconcileAutomationCandidates<T extends { actionId?: string; status: CandidateStatus; dedupeKey: string; userEdited?: boolean }>(
  existing: T[],
  generated: T[],
  currentActionIds: string[],
): T[] {
  const regeneratedActionIds = new Set(generated.map((item) => item.actionId).filter((id): id is string => !!id));
  const validActionIds = new Set(currentActionIds);
  const terminal = new Set<CandidateStatus>(['completed', 'cancelled', 'rejected']);
  const preserved = existing.filter((item) =>
    item.userEdited || terminal.has(item.status) || !item.actionId || (validActionIds.has(item.actionId) && !regeneratedActionIds.has(item.actionId)),
  );
  return dedupeCandidates([...preserved, ...generated]);
}

export type AutomationContext = {
  trigger: AutomationTriggerType;
  action?: ActionRecord;
  documentType?: string;
  caseStatus?: string;
  profileId?: string;
  risk?: string;
  dueDateProximityDays?: number;
};
export function automationConditionsMatch(rule: AutomationRule, context: AutomationContext): boolean {
  if (!rule.enabled || rule.triggerType !== context.trigger) return false;
  const condition = rule.conditions;
  if (condition.actionType && context.action?.type !== condition.actionType) return false;
  if (condition.priority && context.action?.priority !== condition.priority) return false;
  if (condition.status && context.action?.status !== condition.status) return false;
  if (condition.documentType && context.documentType !== condition.documentType) return false;
  if (condition.caseStatus && context.caseStatus !== condition.caseStatus) return false;
  if (condition.confidence && context.action?.confidence !== condition.confidence) return false;
  if (condition.risk && context.risk !== condition.risk) return false;
  if (condition.profileId && context.profileId !== condition.profileId) return false;
  if (condition.userConfirmed !== undefined && context.action?.userConfirmed !== condition.userConfirmed) return false;
  if (condition.dueDateProximityDays !== undefined && (context.dueDateProximityDays === undefined || context.dueDateProximityDays > condition.dueDateProximityDays)) return false;
  return true;
}

export function automationTriggersForAction(action: ActionRecord, now = new Date()): Array<{ trigger: AutomationTriggerType; dueDateProximityDays?: number }> {
  if (action.status === 'completed') return [{ trigger: 'action_completed' }];
  if (['cancelled', 'rejected', 'archived'].includes(action.status)) return [];
  const triggers: Array<{ trigger: AutomationTriggerType; dueDateProximityDays?: number }> = [{ trigger: 'action_created' }];
  if (action.dueDate) {
    const days = Math.ceil((Date.parse(`${action.dueDate}T00:00:00Z`) - now.getTime()) / 86400000);
    if (days < 0) triggers.push({ trigger: 'action_overdue', dueDateProximityDays: days });
    else if (days <= 7) triggers.push({ trigger: 'action_due_soon', dueDateProximityDays: days });
  }
  return triggers;
}

export function actionsMatchingAutomation(
  rules: AutomationRule[],
  actions: ActionRecord[],
  output: AutomationActionType,
  contextFor: (action: ActionRecord) => Omit<AutomationContext, 'trigger' | 'action'> = () => ({}),
  now = new Date(),
): ActionRecord[] {
  return actions.filter((action) => automationTriggersForAction(action, now).some((event) =>
    rules.some((rule) => rule.actions.includes(output) && automationConditionsMatch(rule, { ...contextFor(action), ...event, action })),
  ));
}

export type SafetyGateInput = {
  confidence: Confidence;
  evidence: Evidence[];
  conflict?: boolean;
  rejectedReview?: boolean;
  userConfirmed: boolean;
  downstreamEligible: boolean;
  duplicate?: boolean;
};
export function automationSafetyGate(input: SafetyGateInput): { allowed: boolean; reasons: string[]; requiresReview: boolean } {
  const reasons: string[] = [];
  if (input.confidence !== 'high' && input.confidence !== 'medium') reasons.push('confidence is not sufficient');
  if (!input.evidence.length) reasons.push('source evidence is missing');
  if (input.conflict) reasons.push('source has an unresolved conflict');
  if (input.rejectedReview) reasons.push('source was rejected by review');
  if (!input.userConfirmed) reasons.push('user confirmation is required');
  if (!input.downstreamEligible) reasons.push('source is not downstream-eligible');
  if (input.duplicate) reasons.push('duplicate source/target already exists');
  return { allowed: reasons.length === 0, reasons, requiresReview: reasons.length > 0 };
}

export type CaseProgress = {
  caseId: string;
  totalActionCount: number;
  activeActionCount: number;
  completedActionCount: number;
  waitingActionCount: number;
  reviewActionCount: number;
  overdueActionCount: number;
  unresolvedConflictCount: number;
  progressPercent: number;
  state: 'ready' | 'in_progress' | 'waiting' | 'review' | 'overdue' | 'blocked' | 'complete';
  explanation: string;
  nextActionId?: string;
};
export function computeCaseProgress(caseId: string, actions: ActionRecord[], unresolvedConflictCount = 0, now = new Date(), documentIds: string[] = []): CaseProgress {
  const scoped = actions.filter((action) => action.caseId === caseId || (!!action.documentId && documentIds.includes(action.documentId)));
  const active = scoped.filter((action) => !['completed', 'cancelled', 'rejected', 'archived'].includes(action.status));
  const completed = scoped.filter((action) => action.status === 'completed');
  const waiting = active.filter((action) => action.status === 'waiting');
  const review = active.filter((action) => action.status === 'needs_review');
  const overdue = active.filter((action) => action.dueDate && Date.parse(`${action.dueDate}T00:00:00Z`) < now.getTime());
  const next = nextBestAction(active, now);
  const progressPercent = scoped.length ? Math.round((completed.length / scoped.length) * 100) : 0;
  const state = unresolvedConflictCount > 0 ? 'blocked' : review.length ? 'review' : overdue.length ? 'overdue' : waiting.length ? 'waiting' : active.length ? 'in_progress' : 'complete';
  const explanation = state === 'complete' ? 'Alle teendők elintézve.' : state === 'blocked' ? `${unresolvedConflictCount} feloldatlan ellentmondás akadályozza a lezárást.` : state === 'review' ? `${review.length} teendő felhasználói ellenőrzésre vár.` : state === 'overdue' ? `${overdue.length} teendő lejárt.` : state === 'waiting' ? `${waiting.length} teendő válaszra vár.` : `${active.length} aktív teendő maradt.`;
  return { caseId, totalActionCount: scoped.length, activeActionCount: active.length, completedActionCount: completed.length, waitingActionCount: waiting.length, reviewActionCount: review.length, overdueActionCount: overdue.length, unresolvedConflictCount, progressPercent, state, explanation, nextActionId: next?.id };
}

export function caseClosureSafety(progress: CaseProgress, confirmedDeadlineSoon = false): { closable: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (progress.activeActionCount) reasons.push('active mandatory action exists');
  if (progress.overdueActionCount) reasons.push('overdue action exists');
  if (progress.reviewActionCount) reasons.push('unresolved review exists');
  if (progress.unresolvedConflictCount) reasons.push('unresolved conflict exists');
  if (confirmedDeadlineSoon) reasons.push('confirmed deadline is near');
  if (progress.waitingActionCount) reasons.push('waiting/follow-up process is still relevant');
  return { closable: reasons.length === 0, reasons };
}

export function hasConfirmedNearDeadline(actions: ActionRecord[], caseId: string, documentIds: string[], now = new Date(), days = 7): boolean {
  const start = now.getTime();
  const end = start + days * 86400000;
  return actions.some((action) => {
    if (!(action.caseId === caseId || (!!action.documentId && documentIds.includes(action.documentId)))) return false;
    if (!action.userConfirmed || !action.dueDate || ['completed', 'cancelled', 'rejected', 'archived'].includes(action.status)) return false;
    const due = Date.parse(`${action.dueDate}T00:00:00Z`);
    return !Number.isNaN(due) && due >= start && due <= end;
  });
}

export function migrateActionEngineState(input: Partial<ActionEngineState> | null | undefined): ActionEngineState {
  const safe = input ?? {};
  const normalizeRecord = <T extends { id: string }>(record: T): T => record;
  return {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION,
    actions: Array.isArray(safe.actions) ? safe.actions.filter((item): item is ActionRecord => !!item && typeof item.id === 'string').map(normalizeRecord) : [],
    reminders: Array.isArray(safe.reminders) ? safe.reminders.filter((item): item is ReminderRecord => !!item && typeof item.id === 'string').map(normalizeRecord) : [],
    followUps: Array.isArray(safe.followUps) ? safe.followUps.filter((item): item is FollowUpRecord => !!item && typeof item.id === 'string').map(normalizeRecord) : [],
    replyDrafts: Array.isArray(safe.replyDrafts) ? safe.replyDrafts.filter((item): item is ReplyDraftCandidate => !!item && typeof item.id === 'string').map(normalizeRecord) : [],
    calendarCandidates: Array.isArray(safe.calendarCandidates) ? safe.calendarCandidates.filter((item): item is CalendarEventCandidate => !!item && typeof item.id === 'string').map(normalizeRecord) : [],
    automationRules: Array.isArray(safe.automationRules) ? safe.automationRules.filter((item): item is AutomationRule => !!item && typeof item.id === 'string').map(normalizeRecord) : [],
  };
}

export function cleanupActionEngineForDocument(state: ActionEngineState, documentId: string): ActionEngineState {
  const removedActionIds = new Set(state.actions.filter((action) => action.documentId === documentId).map((action) => action.id));
  const belongsToDeletedDocument = (item: { documentId?: string; actionId?: string }) =>
    item.documentId === documentId || (!!item.actionId && removedActionIds.has(item.actionId));
  return {
    ...state,
    actions: state.actions.filter((action) => action.documentId !== documentId),
    reminders: state.reminders.filter((item) => !belongsToDeletedDocument(item)),
    followUps: state.followUps.filter((item) => !belongsToDeletedDocument(item)),
    replyDrafts: state.replyDrafts.filter((item) => !belongsToDeletedDocument(item)),
    calendarCandidates: state.calendarCandidates.filter((item) => !belongsToDeletedDocument(item)),
  };
}