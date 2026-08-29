import {
  PREMIUM_MODULE_ID,
  calendarCandidateFromAction,
  createCalendarEvent,
  createDefaultIntegrationState,
  createNotificationInstance,
  createNotificationSchedule,
  createPreparedEmailAccount,
  emailImportDedupeKey,
  estimateEmailRelevance,
  hasPremiumEntitlement,
  isDuplicateEmailImport,
  migrateIntegrationState,
  notificationDedupeKey,
  preparedCalendarAdapters,
  preparedEmailAdapters,
  type EmailAttachment,
  type EmailMessage,
  type NotificationRule,
} from './premiumIntegrations';
import { premiumTranslations } from './premiumLocalization';
import { SUPPORTED_LANGUAGES } from './localization';
import type { CalendarEventCandidate } from './actionEngine';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const at = new Date('2026-08-29T10:00:00.000Z');

const empty = createDefaultIntegrationState(at);
assert(empty.entitlement.featureId === PREMIUM_MODULE_ID, 'default premium feature id');
assert(!hasPremiumEntitlement(empty.entitlement), 'premium is not silently granted');
assert(hasPremiumEntitlement({ ...empty.entitlement, enabled: true, userEntitled: true }), 'real entitlement unlocks feature');

const migrated = migrateIntegrationState({ emailMessages: [{ id: 'kept' } as EmailMessage] }, at);
assert(migrated.emailMessages[0]?.id === 'kept', 'migration retains imported email data');
assert(migrated.calendarEvents.length === 0 && migrated.notificationRules.length === 0, 'migration fills missing collections');

for (const adapter of Object.values(preparedEmailAdapters)) {
  const result = adapter.prepareConnection();
  assert(adapter.providerType === 'manual_import' ? result.status === 'connected' : result.status === 'permission_required', 'email connection requires explicit consent');
}
for (const adapter of Object.values(preparedCalendarAdapters)) {
  assert(adapter.prepareConnection().providerType === adapter.providerType, 'calendar adapter boundary is stable');
}
const prepared = createPreparedEmailAccount('google', 'reader@example.invalid', at);
assert(prepared.connectionStatus === 'permission_required' && prepared.permissions.length === 0, 'prepared OAuth account has no implicit permission');
assert(!('token' in prepared) && !('password' in prepared), 'account model never stores credentials');

const message: EmailMessage = { id:'m1',accountId:'a1',providerMessageId:'provider-1',subject:'Invoice due tomorrow',sender:'billing@example.invalid',recipients:[],receivedAt:at.toISOString(),hasAttachments:true,importStatus:'suggested',relatedDocumentIds:[] };
const attachment: EmailAttachment = { id:'att-1',messageId:'m1',filename:'invoice.pdf',mimeType:'application/pdf',size:1200,importStatus:'suggested',hash:'abc' };
const copy: EmailMessage = { ...message, id:'m2' };
const copyAttachment: EmailAttachment = { ...attachment, id:'att-2',messageId:'m2' };
assert(emailImportDedupeKey(message, attachment) === emailImportDedupeKey(copy, copyAttachment), 'email dedupe key ignores local ids');
assert(isDuplicateEmailImport(copy, copyAttachment, [message], [attachment]), 'duplicate provider attachment is detected');
assert(estimateEmailRelevance(message).confidence !== 'unknown', 'important email receives local relevance signals');

const actionCandidate: CalendarEventCandidate = { schemaVersion:'1.0.0',id:'action-calendar-1',sourceType:'official_deadline',actionId:'action-1',documentId:'document-1',caseId:'case-1',title:'Deadline',startAt:'2026-09-10T08:00:00.000Z',allDay:false,confidence:'high',status:'suggested',userConfirmed:false,dedupeKey:'deadline-1',evidence:[],createdAt:at.toISOString(),updatedAt:at.toISOString() };
const candidate = calendarCandidateFromAction(actionCandidate, 'manual', 'Europe/Berlin', at);
assert(!createCalendarEvent(candidate, at), 'calendar event cannot be created without user confirmation');
const confirmed = { ...candidate, status:'confirmed' as const, userConfirmed:true };
const event = createCalendarEvent(confirmed, at);
assert(event?.sourceDocumentId === 'document-1' && event.id === createCalendarEvent(confirmed, at)?.id, 'confirmed calendar event has stable source-linked id');

const rule: NotificationRule = { id:'rule-1',type:'upcoming_deadline',enabled:true,documentId:'document-1',actionId:'action-1',sourceDeadline:'2026-09-10',timing:'one_day_before',sourceConfidence:'high',sourceReviewStatus:'confirmed',userConfirmed:true,createdAt:at.toISOString(),updatedAt:at.toISOString() };
const notificationInput = { title:'Deadline',body:'Review',scheduledFor:'2026-09-09T08:00:00.000Z' };
const instance = createNotificationInstance(rule, notificationInput, at);
assert(instance.status === 'scheduled', 'enabled notification rule schedules locally');
assert(instance.dedupeKey === notificationDedupeKey(rule), 'notification dedupe is action-document-deadline based');
assert(createNotificationSchedule(instance, 'Europe/Berlin').instanceId === instance.id, 'notification creates a separate source-linked schedule');
assert(createNotificationInstance({ ...rule, enabled:false }, notificationInput, at).status === 'blocked', 'disabled notification is explicitly blocked');
assert(createNotificationInstance({ ...rule, userConfirmed:false, sourceConfidence:'low', sourceReviewStatus:'needs_review' }, notificationInput, at).status === 'blocked', 'uncertain unconfirmed source cannot become a scheduled reminder');

for (const language of SUPPORTED_LANGUAGES) {
  const copy = premiumTranslations[language];
  assert(copy && Object.values(copy).every(value => value.trim().length > 0), `premium copy complete for ${language}`);
  if (language !== 'en') assert(copy.title !== premiumTranslations.en.title && copy.privacy !== premiumTranslations.en.privacy, `premium copy localized for ${language}`);
}
assert(premiumTranslations.ar.title.includes('التقويم'), 'Arabic premium copy is present');

const manyMessages = Array.from({ length: 1000 }, (_, index): EmailMessage => ({ ...message, id:`m-${index}`,providerMessageId:`provider-${index}` }));
const started = Date.now();
assert(isDuplicateEmailImport({ ...message, id:'new',providerMessageId:'provider-999' }, undefined, manyMessages, []), 'large mailbox duplicate found');
assert(Date.now() - started < 500, '1000-message local duplicate check stays responsive');

console.log('premium integrations tests passed');