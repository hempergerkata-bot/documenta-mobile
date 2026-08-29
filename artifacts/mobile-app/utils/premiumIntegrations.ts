import type { Confidence } from './documentIntelligence';
import type { CalendarEventCandidate } from './actionEngine';

export const PREMIUM_MODULE_ID = 'email_calendar_notifications';
export type PremiumFeatureId = typeof PREMIUM_MODULE_ID;
export type EntitlementSource = 'default' | 'subscription' | 'trial' | 'promo' | 'family_plan' | 'manual' | 'tester';
export type TrialState = 'not_started' | 'active' | 'expired' | 'converted';
export type EntitlementStatus = 'inactive' | 'active' | 'expired';
export type FeatureEntitlement = {
  featureId: PremiumFeatureId;
  enabled: boolean;
  requiresPremium: boolean;
  source: EntitlementSource;
  userEntitled: boolean;
  trialState?: TrialState;
  status?: EntitlementStatus;
  accessStartAt?: string;
  accessEndAt?: string;
  testerAccess?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmailProviderType = 'google' | 'microsoft' | 'imap' | 'manual_import';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'permission_required' | 'expired' | 'error' | 'reconnect_required';
export type EmailPermissions = 'metadata' | 'read_messages' | 'read_attachments';
export type EmailAccount = {
  id: string;
  providerType: EmailProviderType;
  displayName: string;
  emailAddress: string;
  connectionStatus: ConnectionStatus;
  permissions: EmailPermissions[];
  syncEnabled: boolean;
  syncRange?: { from: string; to: string; label: '7_days' | '30_days' | '90_days' | 'custom' };
  lastSyncCursor?: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
  errorCode?: 'permission' | 'expired' | 'rate_limit' | 'network' | 'unsupported' | 'invalid_credentials';
  /** Non-secret IMAP connection metadata only. */
  imapHost?: string;
  imapMailbox?: string;
  removedAt?: string;
};
export type EmailImportStatus = 'not_imported' | 'suggested' | 'confirmed' | 'imported' | 'duplicate' | 'unsupported' | 'failed';
export type EmailMessage = {
  id: string;
  accountId: string;
  providerMessageId: string;
  threadId?: string;
  parentMessageId?: string;
  subject: string;
  sender: string;
  recipients: string[];
  receivedAt: string;
  snippet?: string;
  hasAttachments: boolean;
  importStatus: EmailImportStatus;
  relatedDocumentIds: string[];
  relatedCaseId?: string;
};
export type EmailAttachment = {
  id: string;
  messageId: string;
  /** Provider attachment identifier; non-secret and used only after user chooses import. */
  providerAttachmentId?: string;
  filename: string;
  mimeType: string;
  size: number;
  importStatus: EmailImportStatus;
  documentId?: string;
  hash?: string;
};
export type EmailSourceTrace = {
  accountId: string;
  providerType: EmailProviderType;
  emailAddress: string;
  sender: string;
  subject: string;
  receivedAt: string;
  providerMessageId: string;
  attachmentId?: string;
  attachmentFilename?: string;
};

export type CalendarProviderType = 'google_calendar' | 'microsoft_calendar' | 'device_calendar' | 'manual';
export type CalendarAccount = {
  id: string;
  providerType: CalendarProviderType;
  displayName: string;
  connectionStatus: ConnectionStatus;
  permissions: ('read_events' | 'write_events')[];
  selectedCalendarId?: string;
  syncEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  removedAt?: string;
};
export type CalendarCandidateStatus = 'suggested' | 'needs_review' | 'confirmed' | 'rejected' | 'created' | 'changed';
export type CalendarCandidate = {
  id: string;
  providerType: CalendarProviderType;
  title: string;
  startAt: string;
  endAt?: string;
  timezone: string;
  allDay: boolean;
  sourceDocumentId?: string;
  sourceCaseId?: string;
  sourceActionId?: string;
  sourceReference: string;
  confidence: Confidence;
  status: CalendarCandidateStatus;
  userConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CalendarEventStatus = 'created' | 'updated' | 'cancelled' | 'needs_review';
export type CalendarEvent = {
  id: string;
  providerType: CalendarProviderType;
  providerEventId?: string;
  calendarAccountId?: string;
  calendarId?: string;
  sourceReference?: string;
  title: string;
  startAt: string;
  endAt?: string;
  timezone: string;
  allDay: boolean;
  sourceDocumentId?: string;
  sourceCaseId?: string;
  sourceActionId?: string;
  status: CalendarEventStatus;
  createdAt: string;
  updatedAt: string;
};

export type NotificationType = 'upcoming_deadline' | 'upcoming_appointment' | 'payment_deadline' | 'task_due' | 'new_document_task' | 'changed_date' | 'expiring_case' | 'uncertain_review';
export type NotificationTiming = 'same_day' | 'one_day_before' | 'three_days_before' | 'seven_days_before' | 'custom';
export type NotificationRule = {
  id: string;
  type: NotificationType;
  enabled: boolean;
  documentId?: string;
  caseId?: string;
  actionId?: string;
  sourceDeadline?: string;
  timing: NotificationTiming;
  customAt?: string;
  sourceConfidence?: Confidence;
  sourceReviewStatus?: 'confirmed' | 'needs_review' | 'conflicted';
  userConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
};
export type NotificationSchedule = { id: string; ruleId: string; instanceId: string; scheduledFor: string; timezone: string; status: 'scheduled' | 'cancelled' | 'delivered' | 'blocked'; };
export type NotificationInstance = {
  id: string;
  ruleId: string;
  type: NotificationType;
  title: string;
  body: string;
  scheduledFor: string;
  documentId?: string;
  caseId?: string;
  actionId?: string;
  sourceDeadline?: string;
  status: 'scheduled' | 'cancelled' | 'delivered' | 'blocked';
  dedupeKey: string;
  createdAt: string;
};

export type IntegrationAuditEntry = {
  id: string;
  type: 'account_connected' | 'account_disconnected' | 'import_confirmed' | 'calendar_event_created' | 'notification_created' | 'permission_granted' | 'permission_revoked';
  at: string;
  providerType?: string;
  documentId?: string;
  caseId?: string;
};
export type IntegrationState = {
  entitlement: FeatureEntitlement;
  emailAccounts: EmailAccount[];
  emailMessages: EmailMessage[];
  emailAttachments: EmailAttachment[];
  emailSourceTraces: Record<string, EmailSourceTrace>;
  calendarAccounts: CalendarAccount[];
  calendarCandidates: CalendarCandidate[];
  calendarEvents: CalendarEvent[];
  notificationRules: NotificationRule[];
  notificationSchedules: NotificationSchedule[];
  notificationInstances: NotificationInstance[];
  auditLog: IntegrationAuditEntry[];
  lastNativeRecoveryAt?: string;
};

const nowIso = (now = new Date()) => now.toISOString();
const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
};
const stableId = (prefix: string, value: string) => `${prefix}-${stableHash(value)}`;

export function createDefaultEntitlement(now = new Date()): FeatureEntitlement {
  const at = nowIso(now);
  return { featureId: PREMIUM_MODULE_ID, enabled: false, requiresPremium: true, source: 'default', userEntitled: false, trialState: 'not_started', status: 'inactive', testerAccess: false, createdAt: at, updatedAt: at };
}
export function hasPremiumEntitlement(entitlement: FeatureEntitlement | undefined, now = new Date()): boolean {
  if (!entitlement?.enabled || !entitlement.userEntitled) return false;
  if (entitlement.accessStartAt && Date.parse(entitlement.accessStartAt) > now.getTime()) return false;
  if (entitlement.accessEndAt && Date.parse(entitlement.accessEndAt) <= now.getTime()) return false;
  return entitlement.status !== 'expired';
}
export function entitlementStatus(entitlement: FeatureEntitlement, now = new Date()): EntitlementStatus {
  return hasPremiumEntitlement(entitlement, now) ? 'active' : entitlement.accessEndAt && Date.parse(entitlement.accessEndAt) <= now.getTime() ? 'expired' : 'inactive';
}
export function createTesterEntitlement(days = 30, now = new Date()): FeatureEntitlement {
  const at = nowIso(now);
  const end = nowIso(new Date(now.getTime() + Math.max(1, days) * 86400000));
  return { ...createDefaultEntitlement(now), enabled: true, userEntitled: true, source: 'tester', testerAccess: true, status: 'active', accessStartAt: at, accessEndAt: end, trialState: 'active', updatedAt: at };
}
export function createDefaultIntegrationState(now = new Date()): IntegrationState {
  return { entitlement: createDefaultEntitlement(now), emailAccounts: [], emailMessages: [], emailAttachments: [], emailSourceTraces: {}, calendarAccounts: [], calendarCandidates: [], calendarEvents: [], notificationRules: [], notificationSchedules: [], notificationInstances: [], auditLog: [] };
}
export function migrateIntegrationState(raw: Partial<IntegrationState> | undefined, now = new Date()): IntegrationState {
  const defaults = createDefaultIntegrationState(now);
  const entitlement: FeatureEntitlement = raw?.entitlement ? { ...defaults.entitlement, ...raw.entitlement, featureId: PREMIUM_MODULE_ID, requiresPremium: true } : defaults.entitlement;
  const safeEmailAccounts = (raw?.emailAccounts ?? []).map((account) => {
    const unsafe = account as EmailAccount & { accessToken?: unknown; refreshToken?: unknown; password?: unknown; clientSecret?: unknown };
    const { accessToken: _accessToken, refreshToken: _refreshToken, password: _password, clientSecret: _clientSecret, ...safe } = unsafe;
    return safe as EmailAccount;
  });
  return {
    ...defaults, ...raw, entitlement,
    emailAccounts: safeEmailAccounts, emailMessages: raw?.emailMessages ?? [], emailAttachments: raw?.emailAttachments ?? [],
    emailSourceTraces: raw?.emailSourceTraces ?? {}, calendarAccounts: raw?.calendarAccounts ?? [], calendarCandidates: raw?.calendarCandidates ?? [],
    calendarEvents: raw?.calendarEvents ?? [], notificationRules: raw?.notificationRules ?? [], notificationSchedules: raw?.notificationSchedules ?? [],
    notificationInstances: raw?.notificationInstances ?? [], auditLog: raw?.auditLog ?? [], lastNativeRecoveryAt: raw?.lastNativeRecoveryAt,
  };
}

export function createPreparedEmailAccount(providerType: EmailProviderType, emailAddress = '', now = new Date()): EmailAccount {
  const at = nowIso(now);
  const status: ConnectionStatus = providerType === 'manual_import' ? 'connected' : 'permission_required';
  return { id: stableId('email-account', `${providerType}|${emailAddress}`), providerType, displayName: providerType === 'google' ? 'Google' : providerType === 'microsoft' ? 'Microsoft' : providerType === 'imap' ? 'Egyéb e-mail fiók' : 'Kézi import', emailAddress, connectionStatus: status, permissions: providerType === 'manual_import' ? ['metadata', 'read_messages', 'read_attachments'] : [], syncEnabled: false, createdAt: at, updatedAt: at, errorCode: providerType === 'manual_import' ? undefined : 'permission' };
}
export function connectionStatusMessage(status: ConnectionStatus, providerType: EmailProviderType, language: 'de' | 'hu' | 'en' = 'de'): string {
  const isHu = language === 'hu'; const isEn = language === 'en';
  if (status === 'permission_required') return isHu ? 'A hozzáférés csak a te megerősítésed után indulhat.' : isEn ? 'Access starts only after your explicit confirmation.' : 'Der Zugriff beginnt erst nach deiner ausdrücklichen Bestätigung.';
  if (status === 'reconnect_required' || status === 'expired') return isHu ? 'A kapcsolat megszakadt. A korábban importált dokumentumaid megmaradtak.' : isEn ? 'The connection ended. Previously imported documents remain available.' : 'Die Verbindung ist unterbrochen. Bereits importierte Dokumente bleiben erhalten.';
  if (status === 'error') return isHu ? 'A kapcsolat nem sikerült. A kézi import továbbra is elérhető.' : isEn ? 'The connection failed. Manual import remains available.' : 'Die Verbindung ist fehlgeschlagen. Der manuelle Import bleibt verfügbar.';
  return status === 'connected' ? (isHu ? 'Kapcsolat aktív' : isEn ? 'Connected' : 'Verbunden') : (isHu ? 'Nincs kapcsolat' : isEn ? 'Not connected' : 'Nicht verbunden');
}

export type PreparedAdapterResult = { providerType: EmailProviderType | CalendarProviderType; status: ConnectionStatus; message: string; requiresExternalConfiguration: boolean };
export interface EmailProviderAdapter {
  readonly providerType: EmailProviderType;
  readonly mode: 'oauth_preparation' | 'imap_tls_preparation' | 'manual';
  prepareConnection(): PreparedAdapterResult;
}
export interface CalendarProviderAdapter {
  readonly providerType: CalendarProviderType;
  prepareConnection(): PreparedAdapterResult;
}
const preparedEmail = (providerType: EmailProviderType, mode: EmailProviderAdapter['mode']): EmailProviderAdapter => ({ providerType, mode, prepareConnection: () => ({ providerType, status: providerType === 'manual_import' ? 'connected' : 'permission_required', message: providerType === 'imap' ? 'TLS and secure credential setup required.' : 'OAuth client configuration and user consent required.', requiresExternalConfiguration: providerType !== 'manual_import' }) });
export const preparedEmailAdapters: Readonly<Record<EmailProviderType, EmailProviderAdapter>> = { google: preparedEmail('google', 'oauth_preparation'), microsoft: preparedEmail('microsoft', 'oauth_preparation'), imap: preparedEmail('imap', 'imap_tls_preparation'), manual_import: preparedEmail('manual_import', 'manual') };
export const preparedCalendarAdapters: Readonly<Record<CalendarProviderType, CalendarProviderAdapter>> = {
  google_calendar: { providerType: 'google_calendar', prepareConnection: () => ({ providerType: 'google_calendar', status: 'permission_required', message: 'OAuth client configuration and user consent required.', requiresExternalConfiguration: true }) },
  microsoft_calendar: { providerType: 'microsoft_calendar', prepareConnection: () => ({ providerType: 'microsoft_calendar', status: 'permission_required', message: 'OAuth client configuration and user consent required.', requiresExternalConfiguration: true }) },
  device_calendar: { providerType: 'device_calendar', prepareConnection: () => ({ providerType: 'device_calendar', status: 'permission_required', message: 'Platform calendar permission required.', requiresExternalConfiguration: true }) },
  manual: { providerType: 'manual', prepareConnection: () => ({ providerType: 'manual', status: 'connected', message: 'Manual calendar candidate export.', requiresExternalConfiguration: false }) },
};

export function emailImportDedupeKey(message: Pick<EmailMessage, 'providerMessageId' | 'receivedAt' | 'sender' | 'subject'>, attachment?: Pick<EmailAttachment, 'filename' | 'size' | 'hash'>): string {
  return [message.providerMessageId, attachment?.filename ?? '', attachment?.size ?? '', attachment?.hash ?? '', message.receivedAt, message.sender, message.subject].join('|').toLocaleLowerCase();
}
export function isDuplicateEmailImport(message: EmailMessage, attachment: EmailAttachment | undefined, existingMessages: readonly EmailMessage[], existingAttachments: readonly EmailAttachment[]): boolean {
  const key = emailImportDedupeKey(message, attachment);
  return existingMessages.some(existing => existing.id !== message.id && existing.providerMessageId === message.providerMessageId && (!attachment || existingAttachments.some(item => item.messageId === existing.id && emailImportDedupeKey(existing, item) === key))) || existingAttachments.some(item => attachment && item.id !== attachment.id && item.messageId === message.id && emailImportDedupeKey(message, item) === key);
}
export function estimateEmailRelevance(message: Pick<EmailMessage, 'subject' | 'snippet' | 'sender'>, language = 'de'): { score: number; confidence: Confidence; reasons: string[] } {
  const text = `${message.subject} ${message.snippet ?? ''} ${message.sender}`.toLocaleLowerCase();
  const groups: Array<[string, RegExp]> = [
    ['invoice/payment', /rechnung|invoice|számla|zahlung|payment|factur|faktura|rach|fattura|facture/],
    ['insurance', /versicherung|insurance|biztosítás|asigur|ubez|sigorta|assurance/],
    ['authority', /behörde|amt|authority|hatóság|urząd|úrad|hatoság|autorità/],
    ['medical', /arzt|medical|orvos|doctor|lekar|медич|doktor|médecin/],
    ['deadline/appointment', /frist|deadline|határidő|termin|appointment|mikorra|scadenza|échéance/],
    ['contract/subscription', /vertrag|contract|szerződés|abo|subscription|umowa|contrat/],
  ];
  const reasons = groups.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  const score = reasons.length * 2 + (message.subject.trim() ? 1 : 0);
  return { score, confidence: score >= 6 ? 'high' : score >= 3 ? 'medium' : score > 0 ? 'low' : 'unknown', reasons: reasons.length ? reasons : [language === 'hu' ? 'Nincs elég helyi jel' : 'Not enough local signals'] };
}
export function sourceTraceFor(message: EmailMessage, account: EmailAccount, attachment?: EmailAttachment): EmailSourceTrace {
  return { accountId: account.id, providerType: account.providerType, emailAddress: account.emailAddress, sender: message.sender, subject: message.subject, receivedAt: message.receivedAt, providerMessageId: message.providerMessageId, attachmentId: attachment?.id, attachmentFilename: attachment?.filename };
}

export function calendarCandidateFromAction(candidate: CalendarEventCandidate, providerType: CalendarProviderType, timezone = 'UTC', now = new Date()): CalendarCandidate {
  const at = nowIso(now);
  return { id: stableId('calendar-candidate', `${candidate.id}|${providerType}`), providerType, title: candidate.title, startAt: candidate.startAt, endAt: candidate.endAt, timezone, allDay: candidate.allDay, sourceDocumentId: candidate.documentId, sourceCaseId: candidate.caseId, sourceActionId: candidate.actionId, sourceReference: candidate.id, confidence: candidate.confidence, status: candidate.userConfirmed ? 'confirmed' : candidate.status === 'needs_review' ? 'needs_review' : 'suggested', userConfirmed: candidate.userConfirmed, createdAt: at, updatedAt: at };
}
export function createCalendarEvent(candidate: CalendarCandidate, now = new Date()): CalendarEvent | undefined {
  if (!candidate.userConfirmed || candidate.status !== 'confirmed') return undefined;
  const at = nowIso(now);
  return { id: stableId('calendar-event', `${candidate.sourceReference}|${candidate.startAt}|${candidate.providerType}`), providerType: candidate.providerType, title: candidate.title, startAt: candidate.startAt, endAt: candidate.endAt, timezone: candidate.timezone, allDay: candidate.allDay, sourceDocumentId: candidate.sourceDocumentId, sourceCaseId: candidate.sourceCaseId, sourceActionId: candidate.sourceActionId, status: 'created', createdAt: at, updatedAt: at };
}
export function notificationDedupeKey(rule: Pick<NotificationRule, 'actionId' | 'documentId' | 'sourceDeadline' | 'type'>): string {
  return [rule.actionId ?? '', rule.documentId ?? '', rule.sourceDeadline ?? '', rule.type].join('|');
}
export function createNotificationInstance(rule: NotificationRule, input: { title: string; body: string; scheduledFor: string; documentId?: string; caseId?: string; actionId?: string; sourceDeadline?: string }, now = new Date()): NotificationInstance {
  const dedupeKey = notificationDedupeKey({ ...rule, ...input });
  const safeSource = rule.userConfirmed === true || (rule.sourceConfidence === 'high' && rule.sourceReviewStatus !== 'needs_review' && rule.sourceReviewStatus !== 'conflicted');
  return { id: stableId('notification', dedupeKey), ruleId: rule.id, type: rule.type, title: input.title, body: input.body, scheduledFor: input.scheduledFor, documentId: input.documentId ?? rule.documentId, caseId: input.caseId ?? rule.caseId, actionId: input.actionId ?? rule.actionId, sourceDeadline: input.sourceDeadline ?? rule.sourceDeadline, status: rule.enabled && safeSource ? 'scheduled' : 'blocked', dedupeKey, createdAt: nowIso(now) };
}
export function createNotificationSchedule(instance: NotificationInstance, timezone = 'UTC'): NotificationSchedule {
  return { id: stableId('notification-schedule', instance.id), ruleId: instance.ruleId, instanceId: instance.id, scheduledFor: instance.scheduledFor, timezone, status: instance.status };
}
/** Native scheduling is asynchronous: persist blocked until the OS returns an identifier. */
export function notificationNativeResult<T extends NotificationInstance | NotificationSchedule>(item: T, scheduled: boolean): T {
  return { ...item, status: scheduled ? 'scheduled' : 'blocked' };
}
export function auditEntry(type: IntegrationAuditEntry['type'], input: Omit<IntegrationAuditEntry, 'id' | 'type' | 'at'> = {}, now = new Date()): IntegrationAuditEntry {
  return { id: stableId('integration-audit', `${type}|${input.providerType ?? ''}|${input.documentId ?? ''}|${input.caseId ?? ''}|${nowIso(now)}`), type, at: nowIso(now), ...input };
}