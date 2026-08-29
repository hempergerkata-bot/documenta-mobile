declare function require(name: string): any;
const test: (name: string, body: () => void) => void = require('node:test');
const assert = require('node:assert/strict');
import {
  ACTION_ENGINE_SCHEMA_VERSION,
  automationConditionsMatch,
  actionsMatchingAutomation,
  automationSafetyGate,
  caseClosureSafety,
  cleanupActionEngineForDocument,
  computeCaseProgress,
  createCalendarCandidate,
  createCustomAction,
  createFollowUpCandidate,
  createReminderCandidate,
  createReplyDraftCandidate,
  dedupeActions,
  deriveActionsFromDocument,
  editAction,
  hasConfirmedNearDeadline,
  isActionExecutable,
  mergeDerivedActions,
  migrateActionEngineState,
  nextBestAction,
  reconcileAutomationCandidates,
  transitionAction,
  type ActionRecord,
  type AutomationRule,
} from './actionEngine';
import {
  analyzeDocumentIntelligence,
  applyReviewDecision,
  type DocumentIntelligenceResult,
  type Evidence,
} from './documentIntelligence';

const highEvidence: Evidence[] = [{ text: 'Bitte zahlen Sie 125,00 EUR bis 15.09.2026.', confidence: 'high', source: 'ocr' }];
const mediumEvidence: Evidence[] = [{ text: 'Bitte antworten Sie bis 18.09.2026.', confidence: 'medium', source: 'ocr' }];

function intelligence(): DocumentIntelligenceResult {
  const base = analyzeDocumentIntelligence({
    text: 'Bitte zahlen Sie 125,00 EUR bis 15.09.2026. Bitte antworten Sie bis 18.09.2026.',
    structuredFields: { sender: 'Amt Nord', documentDate: '01.09.2026' },
  });
  return {
    ...base,
    actions: [
      { requirement: '125,00 EUR zahlen', priority: 'high', responseNecessary: false, evidence: highEvidence, deadlineIndex: 0 },
      { requirement: 'Schriftlich antworten', priority: 'medium', responseNecessary: true, evidence: mediumEvidence, deadlineIndex: 1 },
    ],
    deadlines: [
      { value: '2026-09-15', kind: 'payment', source: '15.09.2026', relative: false, confidence: 'high', evidence: highEvidence },
      { value: '2026-09-18', kind: 'response', source: '18.09.2026', relative: false, confidence: 'medium', evidence: mediumEvidence },
    ],
    amounts: { ...base.amounts, main: { value: '125.00 EUR', role: 'payable', currency: 'EUR', confidence: 'high', evidence: highEvidence } },
    responseNecessary: { value: true, confidence: 'medium', evidence: mediumEvidence },
    missingRequirements: [],
  };
}

function document(result = intelligence()) {
  return { id: 'doc-1', title: 'Bescheid September', sender: 'Amt Nord', intelligence: result };
}

function confirmed(action: ActionRecord): ActionRecord {
  return transitionAction(action, 'confirmed', new Date('2026-09-01T10:00:00.000Z'));
}

test('derives separate evidence-linked actions with stable identifiers', () => {
  const actions = deriveActionsFromDocument(document(), new Date('2026-09-01T09:00:00.000Z'));
  assert.equal(actions.length, 2);
  assert.deepEqual(actions.map((item) => item.type), ['pay', 'reply']);
  assert.equal(actions[0].dueDate, '2026-09-15');
  assert.ok(actions.every((item) => item.schemaVersion === ACTION_ENGINE_SCHEMA_VERSION));
  assert.ok(actions.every((item) => item.evidence.length > 0 && item.source === 'intelligence'));
});

test('marks low-confidence source for review and hides unsafe date', () => {
  const result = intelligence();
  result.actions[0] = { ...result.actions[0], evidence: [{ ...highEvidence[0], confidence: 'low' }] };
  const action = deriveActionsFromDocument(document(result))[0];
  assert.equal(action.status, 'needs_review');
  assert.equal(action.confidence, 'low');
  assert.equal(action.dueDate, undefined);
});

test('rejected review prevents automatic action eligibility', () => {
  const result = applyReviewDecision(intelligence(), 'actions', 'reject');
  const actions = deriveActionsFromDocument(document(result));
  assert.ok(actions.every((item) => item.status === 'needs_review'));
});

test('derivation and merge deduplicate the same source and target', () => {
  const first = deriveActionsFromDocument(document());
  assert.equal(dedupeActions([...first, ...first]).length, first.length);
  assert.equal(mergeDerivedActions(first, [document()]).length, first.length);
});

test('re-derivation preserves rejection, edits and audit history', () => {
  const source = deriveActionsFromDocument(document())[0];
  const rejected = transitionAction(source, 'rejected', new Date('2026-09-02'));
  assert.equal(mergeDerivedActions([rejected], [document()])[0].status, 'rejected');
  const edited = editAction(source, { title: 'Manuell geprüft' }, new Date('2026-09-02'));
  assert.equal(mergeDerivedActions([edited], [document()])[0].title, 'Manuell geprüft');
});

test('automatic actions reconcile corrected dates and ignore extraction order', () => {
  const originalDocument = document();
  const original = deriveActionsFromDocument(originalDocument, new Date('2026-09-01'));
  const corrected = intelligence();
  corrected.deadlines[0] = { ...corrected.deadlines[0], value: '2026-09-22', source: '22.09.2026', evidence: [{ ...highEvidence[0], text: 'Bitte zahlen Sie 125,00 EUR bis 22.09.2026.' }] };
  corrected.actions = [...corrected.actions].reverse().map((item) => item.requirement.includes('zahlen') ? { ...item, deadlineIndex: 1 } : { ...item, deadlineIndex: 0 });
  corrected.deadlines = [...corrected.deadlines].reverse();
  const merged = mergeDerivedActions(original, [document(corrected)], new Date('2026-09-02'));
  const payment = merged.find((item) => item.type === 'pay')!;
  assert.equal(payment.dueDate, '2026-09-22');
  assert.equal(merged.length, 2);
  assert.equal(payment.id, original.find((item) => item.type === 'pay')!.id);
});

test('removed automatic source disappears while managed history remains', () => {
  const original = deriveActionsFromDocument(document());
  const corrected = intelligence();
  corrected.actions = corrected.actions.filter((item) => !item.requirement.includes('antworten'));
  corrected.responseNecessary = { value: false, confidence: 'high', evidence: mediumEvidence };
  assert.equal(mergeDerivedActions(original, [document(corrected)]).some((item) => item.type === 'reply'), false);
  const completed = transitionAction(confirmed(original[1]), 'completed');
  assert.equal(mergeDerivedActions([original[0], completed], [document(corrected)]).some((item) => item.status === 'completed'), true);
});

test('terminal and unconfirmed actions cannot be completed implicitly', () => {
  const source = deriveActionsFromDocument(document())[0];
  assert.equal(transitionAction(source, 'completed').status, 'suggested');
  assert.equal(transitionAction(transitionAction(source, 'rejected'), 'completed').status, 'rejected');
});

test('a custom action is confirmed without inventing document evidence', () => {
  const action = createCustomAction({ title: ' Unterlagen ordnen ', description: ' Eigene Notiz ', priority: 'normal', dueDate: '2026-09-20', now: new Date('2026-09-01T00:00:00.000Z') });
  assert.equal(action.source, 'user');
  assert.equal(action.userConfirmed, true);
  assert.equal(action.status, 'confirmed');
  assert.deepEqual(action.evidence, []);
});

test('lifecycle keeps immutable source and appends history', () => {
  const source = deriveActionsFromDocument(document())[0];
  const edited = editAction(source, { title: 'Geprüfte Zahlung', priority: 'urgent', dueDate: '2026-09-14' }, new Date('2026-09-02T00:00:00.000Z'));
  const completed = transitionAction(confirmed(edited), 'completed', new Date('2026-09-03T00:00:00.000Z'));
  const reopened = transitionAction(completed, 'suggested', new Date('2026-09-04T00:00:00.000Z'));
  assert.equal(reopened.sourceReference, source.sourceReference);
  assert.deepEqual(reopened.evidence, source.evidence);
  assert.ok(reopened.history.some((item) => item.event === 'deadline_changed'));
  assert.ok(reopened.history.some((item) => item.event === 'priority_changed'));
  assert.ok(reopened.history.some((item) => item.event === 'completed'));
  assert.ok(reopened.history.some((item) => item.event === 'reopened'));
  assert.equal(reopened.completedAt, undefined);
});

test('dependencies block execution until confirmed dependency is complete', () => {
  const [payment, reply] = deriveActionsFromDocument(document()).map(confirmed);
  const blocked = { ...reply, dependsOn: [payment.id] };
  assert.equal(isActionExecutable(blocked, [payment, blocked]), false);
  assert.equal(isActionExecutable(blocked, [transitionAction(payment, 'completed'), blocked]), true);
});

test('next best action uses executable status, priority and due date', () => {
  const [payment, reply] = deriveActionsFromDocument(document()).map(confirmed);
  assert.equal(nextBestAction([reply, payment])?.id, payment.id);
  assert.equal(nextBestAction([{ ...payment, userConfirmed: false }, reply])?.id, reply.id);
});

test('reminder and follow-up candidates inherit source safety', () => {
  const [payment, reply] = deriveActionsFromDocument(document());
  assert.equal(createReminderCandidate(payment)?.status, 'needs_review');
  assert.equal(createReminderCandidate(confirmed(payment))?.status, 'confirmed');
  assert.equal(createFollowUpCandidate(payment), undefined);
  assert.equal(createFollowUpCandidate(reply)?.status, 'needs_review');
});

test('reply draft contains only evidence-safe content and remains review-only', () => {
  const reply = deriveActionsFromDocument(document()).find((item) => item.type === 'reply')!;
  const draft = createReplyDraftCandidate(reply, document())!;
  assert.equal(draft.recipient, 'Amt Nord');
  assert.match(draft.body, /Bitte antworten/);
  assert.equal(draft.status, 'needs_review');
  assert.equal(draft.userConfirmed, false);
});

test('calendar candidates are local, linked and deduplicatable', () => {
  const payment = deriveActionsFromDocument(document())[0];
  const candidate = createCalendarCandidate({ document: document(), action: payment })!;
  assert.equal(candidate.sourceType, 'official_deadline');
  assert.equal(candidate.documentId, 'doc-1');
  assert.equal(candidate.status, 'suggested');
  assert.ok(candidate.evidence.length > 0);
});

test('automation safety gate blocks every unsafe source class', () => {
  assert.equal(automationSafetyGate({ confidence: 'high', evidence: highEvidence, userConfirmed: true, downstreamEligible: true }).allowed, true);
  for (const unsafe of [
    { confidence: 'low' as const, evidence: highEvidence, userConfirmed: true, downstreamEligible: true },
    { confidence: 'high' as const, evidence: [], userConfirmed: true, downstreamEligible: true },
    { confidence: 'high' as const, evidence: highEvidence, conflict: true, userConfirmed: true, downstreamEligible: true },
    { confidence: 'high' as const, evidence: highEvidence, rejectedReview: true, userConfirmed: true, downstreamEligible: true },
    { confidence: 'high' as const, evidence: highEvidence, userConfirmed: false, downstreamEligible: true },
    { confidence: 'high' as const, evidence: highEvidence, userConfirmed: true, downstreamEligible: false },
    { confidence: 'high' as const, evidence: highEvidence, userConfirmed: true, downstreamEligible: true, duplicate: true },
  ]) assert.equal(automationSafetyGate(unsafe).allowed, false);
});

test('automation rule matching is explicit and local', () => {
  const action = confirmed(deriveActionsFromDocument(document())[0]);
  const rule: AutomationRule = {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, id: 'rule-1', name: 'Zahlung erinnern', enabled: true, triggerType: 'action_due_soon',
    conditions: { actionType: 'pay', priority: 'urgent', userConfirmed: true, dueDateProximityDays: 7 },
    actions: ['create_reminder'], scope: 'all', createdAt: '2026-09-01', updatedAt: '2026-09-01', userCreated: true, systemPreset: false,
  };
  assert.equal(automationConditionsMatch(rule, { trigger: 'action_due_soon', action: { ...action, priority: 'urgent' }, dueDateProximityDays: 5 }), true);
  assert.equal(automationConditionsMatch(rule, { trigger: 'action_due_soon', action, dueDateProximityDays: 5 }), false);
});

test('automation output requires an enabled matching real event rule', () => {
  const action = confirmed(deriveActionsFromDocument(document())[0]);
  const baseRule: AutomationRule = {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, id: 'rule-output', name: 'Reminder', enabled: true, triggerType: 'action_due_soon',
    conditions: { actionType: 'pay', userConfirmed: true, dueDateProximityDays: 7 }, actions: ['create_reminder'], scope: 'all',
    createdAt: '2026-09-01', updatedAt: '2026-09-01', userCreated: true, systemPreset: false,
  };
  const now = new Date('2026-09-10T00:00:00.000Z');
  assert.equal(actionsMatchingAutomation([{ ...baseRule, enabled: false }], [action], 'create_reminder', undefined, now).length, 0);
  assert.equal(actionsMatchingAutomation([{ ...baseRule, conditions: { actionType: 'reply' } }], [action], 'create_reminder', undefined, now).length, 0);
  assert.equal(actionsMatchingAutomation([baseRule], [action], 'create_reminder', undefined, now).length, 1);
  assert.equal(actionsMatchingAutomation([{ ...baseRule, triggerType: 'action_completed' }], [action], 'create_reminder', undefined, now).length, 0);
});

test('terminal actions cannot create or revive deadline automation candidates', () => {
  const action = confirmed(deriveActionsFromDocument(document())[0]);
  const rule: AutomationRule = {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, id: 'terminal-rule', name: 'Deadline', enabled: true, triggerType: 'action_due_soon',
    conditions: { userConfirmed: true, dueDateProximityDays: 7 }, actions: ['create_reminder'], scope: 'all',
    createdAt: '2026-09-01', updatedAt: '2026-09-01', userCreated: true, systemPreset: false,
  };
  const now = new Date('2026-09-10T00:00:00.000Z');
  for (const status of ['completed', 'cancelled', 'rejected', 'archived'] as const) {
    const terminal = { ...action, status };
    assert.equal(actionsMatchingAutomation([rule], [terminal], 'create_reminder', undefined, now).length, 0);
    assert.equal(createReminderCandidate(terminal), undefined);
  }
});

test('automation candidate reconciliation replaces stale dates and preserves terminal history', () => {
  const action = confirmed(deriveActionsFromDocument(document())[0]);
  const oldReminder = createReminderCandidate(action)!;
  const revisedAction = { ...action, dueDate: '2026-09-22' };
  const revisedReminder = createReminderCandidate(revisedAction)!;
  const reconciled = reconcileAutomationCandidates([oldReminder], [revisedReminder], [action.id]);
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0].remindAt, '2026-09-22');
  const terminal = { ...oldReminder, status: 'completed' as const };
  assert.equal(reconcileAutomationCandidates([terminal], [revisedReminder], [action.id]).length, 2);
  assert.equal(reconcileAutomationCandidates([oldReminder], [], []).length, 0);
});

test('automation reconciliation never overwrites a user-edited reply draft', () => {
  const replyAction = confirmed(deriveActionsFromDocument(document()).find((item) => item.type === 'reply')!);
  const original = createReplyDraftCandidate(replyAction, document())!;
  const edited = { ...original, body: 'User text', userEdited: true };
  const regenerated = { ...original, body: 'Generated replacement', updatedAt: '2026-09-20' };
  const reconciled = reconcileAutomationCandidates([edited], [regenerated], [replyAction.id]);
  assert.equal(reconciled[0].body, 'User text');
  assert.equal(reconciled[0].userEdited, true);
});

test('case progress and closure remain explainable and conservative', () => {
  const [payment, reply] = deriveActionsFromDocument(document()).map((item) => ({ ...confirmed(item), caseId: 'case-1' }));
  const progress = computeCaseProgress('case-1', [transitionAction(payment, 'completed'), { ...reply, status: 'waiting' }], 1, new Date('2026-09-20'));
  assert.equal(progress.state, 'blocked');
  assert.equal(progress.completedActionCount, 1);
  assert.equal(progress.waitingActionCount, 1);
  const closure = caseClosureSafety(progress, true);
  assert.equal(closure.closable, false);
  assert.ok(closure.reasons.length >= 3);
});

test('case progress includes actions linked through case documents', () => {
  const action = { ...confirmed(deriveActionsFromDocument(document())[0]), caseId: undefined };
  const progress = computeCaseProgress('case-2', [action], 0, new Date('2026-09-01'), ['doc-1']);
  assert.equal(progress.activeActionCount, 1);
  assert.equal(caseClosureSafety(progress).closable, false);
});

test('case near-deadline blocker requires active confirmed future action', () => {
  const base = { ...deriveActionsFromDocument(document())[0], caseId: 'case-near' };
  const now = new Date('2026-09-10T00:00:00.000Z');
  assert.equal(hasConfirmedNearDeadline([{ ...confirmed(base), dueDate: '2026-09-09' }], 'case-near', [], now), false);
  assert.equal(hasConfirmedNearDeadline([{ ...base, dueDate: '2026-09-12', userConfirmed: false }], 'case-near', [], now), false);
  assert.equal(hasConfirmedNearDeadline([{ ...confirmed(base), dueDate: '2026-09-12', status: 'rejected' }], 'case-near', [], now), false);
  assert.equal(hasConfirmedNearDeadline([{ ...confirmed(base), dueDate: '2026-09-20' }], 'case-near', [], now), false);
  assert.equal(hasConfirmedNearDeadline([{ ...confirmed(base), dueDate: '2026-09-12' }], 'case-near', [], now), true);
});

test('migration accepts missing and partial persisted state', () => {
  assert.deepEqual(migrateActionEngineState(undefined), {
    schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, actions: [], reminders: [], followUps: [], replyDrafts: [], calendarCandidates: [], automationRules: [],
  });
  const action = deriveActionsFromDocument(document())[0];
  assert.deepEqual(migrateActionEngineState({ actions: [action] }).actions, [action]);
});

test('permanent document cleanup removes actions and every linked candidate', () => {
  const action = confirmed(deriveActionsFromDocument(document())[0]);
  const reminder = createReminderCandidate(action)!;
  const state = migrateActionEngineState({ actions: [action], reminders: [reminder] });
  const cleaned = cleanupActionEngineForDocument(state, 'doc-1');
  assert.equal(cleaned.actions.length, 0);
  assert.equal(cleaned.reminders.length, 0);
});