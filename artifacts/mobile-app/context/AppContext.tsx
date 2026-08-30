import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { File } from 'expo-file-system';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AnalysisConfidence,
  DocumentAnalysisResult,
} from '@/utils/documentAnalysis';
import {
  analyzeDocumentIntelligence,
  applyReviewDecisions,
  isCurrentDocumentIntelligence,
  type Confidence,
  type DocumentIntelligenceResult,
  type ReviewDecision,
} from '@/utils/documentIntelligence';
import {
  ACTION_ENGINE_SCHEMA_VERSION,
  actionsMatchingAutomation,
  createCalendarCandidate,
  createFollowUpCandidate,
  createReminderCandidate,
  createReplyDraftCandidate,
  dedupeActions,
  dedupeCandidates,
  deriveActionsFromDocument,
  editAction as editActionRecord,
  mergeDerivedActions,
  migrateActionEngineState,
  reconcileAutomationCandidates,
  transitionAction,
  type ActionEngineDocument,
  type ActionEngineState,
  type ActionRecord,
  type ActionStatus,
  type AutomationRule,
  type CalendarEventCandidate,
  type FollowUpRecord,
  type ReminderRecord,
  type ReplyDraftCandidate,
} from '@/utils/actionEngine';
import type {
  DocumentVariant,
  ReconstructionDiagnostics,
} from '@/utils/documentReconstruction';
import type {
  OcrDocumentStatus,
  OcrPageResult,
} from '@/utils/documentOcr';
import type { CloudIntelligence, CloudState, ScanCloudPipelineState } from '@/utils/documentaCloud';
import { DOCUMENT_STATUSES, hasFeature as checkFeature, migrateProfileIds, type DocumentStatus as CoreDocumentStatus, type Entitlements, type Feature } from '@/utils/documentCore';
import {
  cleanupDeletedDocument, documentFingerprint, selectActiveDocuments, type ActivityRecord, type BusinessWorkspace, type CaseRecord, type ContractMonitor,
  type DocumentRelationship, type ExportPackage, type FamilyWorkspace, type NotificationRecord, type OnboardingState,
  type RecurringCost, type SecuritySettings,
} from '@/utils/documentDomain';
import {
  buildArchiveIndex,
  buildCaseTimeline,
  buildDocumentTimeline,
  migrateArchiveDocument,
  type ArchiveAuditEntry,
  type ArchiveIndex,
  type TimelineEventRecord,
} from '@/utils/archive';
import {
  detectDeviceLanguage,
  isExplanationLanguage,
  migrateLanguagePreferences,
  type AppLanguage,
} from '@/utils/localization';
import type {
  ConversationRecord,
  ExplanationDisplayMode,
  ExplanationRequestState,
  TranslationMode,
  TranslationState,
} from '@/utils/explanationExperience';
import {
  buildSearchIndex,
  emptySearchContext,
  SEARCH_INDEX_VERSION,
  type AssistantMessage,
  type SearchConversationContext,
  type SearchHistoryRecord,
  type SearchIndexEntry,
  type SearchIntent,
} from '@/utils/semanticSearch';
import {
  auditEntry,
  calendarCandidateFromAction,
  createCalendarEvent,
  createDefaultIntegrationState,
  createTesterEntitlement,
  hasPremiumEntitlement,
  createNotificationInstance,
  createNotificationSchedule,
  createPreparedEmailAccount,
  isDuplicateEmailImport,
  migrateIntegrationState,
  notificationDedupeKey,
  sourceTraceFor,
  type CalendarCandidate,
  type CalendarEvent,
  type EmailAccount,
  type EmailMessage,
  type EmailProviderType,
  type IntegrationState,
  type NotificationInstance,
  type NotificationRule,
} from '@/utils/premiumIntegrations';
import { deviceTimeZone, type ImportRange } from '@/utils/realIntegrations';
import { cancelLocalNotification, recoverLocalNotifications, scheduleLocalNotification } from '@/utils/nativeIntegrations';
import { connectGoogleDriveBackupProvider, disconnectOAuthProvider } from '@/utils/providerAdapters';
import { removeImapPassword } from '@/utils/secureCredentials';
import { createBackup, discoverBackupPreviews, prepareRestore, type BackupAuditEvent, type BackupJournal, type BackupPreview, type BackupProgress, type RestorePlan } from '@/utils/backupService';
import { sha256Hex } from '@/utils/backupCrypto';
import { platformCryptoProvider } from '@/utils/backupCryptoProvider';
import { GoogleDriveBackupAdapter, publishGoogleDriveSnapshot } from '@/utils/googleDriveAdapter';
import { chooseLocalBackup, createLocalBackupBundle, parseLocalBackupBundle, relinkLocalBundleState, shareLocalBackup, stageBackupAssetBytes, stageBackupAssets } from '@/utils/backupNative';
import type { CloudAccount } from '@/utils/backupDomain';
import { canonicalizeManifest } from '@/utils/backupDomain';
import { disableUnenforcedSecurity, requireCloudAccountRevalidation } from '@/utils/truthfulness';
import { validateDocumentAssets, type DocumentAssetState } from '@/utils/documentFiles';

export type DocumentStatus = CoreDocumentStatus;
export { DOCUMENT_STATUSES };
export type UserProfile = { id: string; name: string; kind: 'default' | 'custom'; createdAt: string };
export type DocumentTask = { id: string; documentId: string; caseId?: string; title: string; dueDate?: string; priority: 'niedrig' | 'mittel' | 'hoch'; completed: boolean; createdAt: string };
export type Settings = {
  theme: 'system' | 'hell' | 'dunkel';
  accent: 'koralle' | 'salbei' | 'lila';
  fontSize: 'klein' | 'mittel' | 'groß';
  appLanguage: AppLanguage;
  explanationLanguage: AppLanguage;
  replyLanguage: AppLanguage;
  residenceCountry: string;
  translationMode: TranslationMode;
  explanationDisplayMode: ExplanationDisplayMode;
  /** Locally installed voice identifier chosen for each explanation language. */
  explanationVoiceIdentifiers?: Partial<Record<AppLanguage, string>>;
  /** Legacy alias accepted only while reading old persisted state. */
  defaultResponseLanguage?: 'Deutsch' | 'Magyar' | 'English' | AppLanguage;
  voiceGender: 'weiblich' | 'männlich';
  speechRate: 'langsam' | 'normal' | 'schnell';
  explanationMode: 'kurz' | 'normal' | 'detailliert';
  entitlements: Partial<Entitlements>;
};

export type DocumentRecord = {
  id: string;
  title: string;
  sender: string;
  category: string;
  subcategory: string;
  documentType: string;
  documentDate: string;
  payrollPeriod?: string;
  dueDate?: string;
  amount?: string;
  person: string;
  profileIds?: string[];
  status: DocumentStatus;
  tags: string[];
  note?: string;
  uri?: string;
  mimeType?: string;
  pdfUri?: string;
  pageUris?: string[];
  originalPageUris?: string[];
  cleanPageUris?: string[];
  blackWhitePageUris?: string[];
  selectedVariant?: DocumentVariant;
  reconstructionDiagnostics?: ReconstructionDiagnostics[];
  ocrText?: string;
  ocrStatus?: OcrDocumentStatus;
  ocrPageResults?: OcrPageResult[];
  analysisUncertainFields?: string[];
  structuredFields?: Record<string, string>;
  analysisConfidenceByField?: Record<string, AnalysisConfidence>;
  intelligence?: DocumentIntelligenceResult;
  intelligenceReviewDecisions?: Record<string, ReviewDecision>;
  /** Optional cloud metadata; local OCR/intelligence remains the source of record. */
  cloudIntelligence?: CloudIntelligence;
  cloudState?: CloudState;
  cloudPipeline?: ScanCloudPipelineState;
  createdAt: string;
  lifecycle?: 'aktiv' | 'archiviert' | 'papierkorb';
  fingerprint?: string;
  source?: 'camera' | 'gallery' | 'file' | 'scanner' | 'gmail' | 'email';
  duplicateCandidateStatus?: 'none' | 'warning' | 'confirmed';
  receivedDate?: string;
  importedAt?: string;
  caseOriginDate?: string;
  caseOriginYear?: number;
  relevantPeriodStart?: string;
  relevantPeriodEnd?: string;
  archiveYear?: number;
  archiveYearConfidence?: Confidence;
  archiveYearEvidence?: import('@/utils/documentIntelligence').Evidence[];
  archiveYearSource?: import('@/utils/archive').ArchiveYearSource;
  archiveDateStatus?: import('@/utils/archive').ArchiveDateStatus;
  archiveYearManual?: boolean;
  archiveAuditTrail?: ArchiveAuditEntry[];
  duplicateDecision?: import('@/utils/archive').DuplicateDecision;
  archiveReviewStatus?: 'pending' | 'accepted' | 'corrected' | 'unknown' | 'later';
  assetState?: DocumentAssetState;
};

export type PendingAsset = {
  uri: string;
  name: string;
  mimeType?: string;
  source: 'camera' | 'gallery' | 'file' | 'scanner';
  pdfUri?: string;
  pageUris?: string[];
  originalPageUris?: string[];
  cleanPageUris?: string[];
  blackWhitePageUris?: string[];
  selectedVariant?: DocumentVariant;
  reconstructionDiagnostics?: ReconstructionDiagnostics[];
  documentId?: string;
  analysis?: DocumentAnalysisResult;
  ocrStatus?: OcrDocumentStatus;
  ocrPageResults?: OcrPageResult[];
  cloudIntelligence?: CloudIntelligence;
  cloudState?: CloudState;
  cloudPipeline?: ScanCloudPipelineState;
};

export type BackupAppState = {
  accounts: CloudAccount[];
  snapshots: readonly BackupPreview[];
  automatic: { enabled: boolean; foregroundOnly: boolean; retention: number };
  latestSuccessfulBackupAt?: string;
  latestSuccessfulRestoreAt?: string;
  progress: BackupProgress;
  error?: string;
  audit: BackupAuditEvent[];
  restorePreview?: { manifestId: string; conflicts: number; manualConflicts: number; readyToCommit: boolean };
  interruptionJournal?: BackupJournal;
};
const defaultBackupState = (): BackupAppState => ({
  accounts: [], snapshots: [], automatic: { enabled: false, foregroundOnly: true, retention: 3 },
  progress: { state: 'idle', stage: '', completedFiles: 0, totalFiles: 0, completedBytes: 0, totalBytes: 0 }, audit: [],
});

type StoredState = {
  version: number;
  checkIns: Record<string, boolean>;
  journalEntries: string[];
  documents: DocumentRecord[];
  profiles: UserProfile[];
  tasks: DocumentTask[];
  settings: Settings;
  cases: CaseRecord[]; relationships: DocumentRelationship[]; notifications: NotificationRecord[]; activities: ActivityRecord[];
  exportPackages: ExportPackage[]; security: SecuritySettings; onboarding: OnboardingState; family: FamilyWorkspace; business: BusinessWorkspace;
  contracts: ContractMonitor[]; recurringCosts: RecurringCost[]; demoEnabled: boolean;
  compareRecords: import('@/utils/documentDomain').CompareRecord[];
  actionEngine: ActionEngineState;
  conversations: ConversationRecord[];
  conversationThreads: Record<string, string>;
  explanationStates: Record<string, { requestState: ExplanationRequestState; translationState: TranslationState; updatedAt: string }>;
  assistantContext: SearchConversationContext;
  assistantMessages: AssistantMessage[];
  searchHistory: SearchHistoryRecord[];
  searchIndexVersion: number;
  searchIndexRevision: number;
  searchIndexRebuiltAt?: string;
  integrations: IntegrationState;
  backup: BackupAppState;
};

type AppContextValue = StoredState & {
  hydrated: boolean;
  pendingAsset: PendingAsset | null;
  toggleCheckIn: (id: string) => void;
  addJournalEntry: (entry: string) => void;
  removeJournalEntry: (entry: string) => void;
  addDocument: (document: DocumentRecord) => Promise<void>;
  updateDocument: (document: DocumentRecord) => void;
  addProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  addTask: (task: DocumentTask) => void;
  toggleTask: (id: string) => void;
  updateTask: (task: DocumentTask) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  hasFeature: (feature: Feature) => boolean;
  setPendingAsset: React.Dispatch<React.SetStateAction<PendingAsset | null>>;
  clearPendingAsset: () => void;
  cases: CaseRecord[]; relationships: DocumentRelationship[]; notifications: NotificationRecord[]; activities: ActivityRecord[];
  exportPackages: ExportPackage[]; security: SecuritySettings; onboarding: OnboardingState; family: FamilyWorkspace; business: BusinessWorkspace;
  contracts: ContractMonitor[]; recurringCosts: RecurringCost[]; demoEnabled: boolean;
  addCase: (item: CaseRecord) => void; updateCase: (item: CaseRecord) => void; addRelationship: (item: DocumentRelationship) => void;
  markNotificationRead: (id: string) => void; addExportPackage: (item: ExportPackage) => void;
  archiveDocument: (id: string) => void; restoreDocument: (id: string) => void; trashDocument: (id: string) => void; permanentlyDeleteDocument: (id: string) => void;
  updateSecurity: (item: Partial<SecuritySettings>) => void; completeOnboarding: (item: OnboardingState) => void; setDemoEnabled: (enabled: boolean) => void;
  addActivity: (type: ActivityRecord['type'], message: string) => void;
  addContract: (item: ContractMonitor) => void;
  addRecurringCost: (item: RecurringCost) => void;
  activeDocuments: DocumentRecord[]; activeCases: CaseRecord[]; activeTasks: DocumentTask[]; activeNotifications: NotificationRecord[];
  markGeneratedNotificationRead: (id: string) => void; addCompareRecord: (item: import('@/utils/documentDomain').CompareRecord) => void;
  actions: ActionRecord[]; reminders: ReminderRecord[]; followUps: FollowUpRecord[]; replyDrafts: ReplyDraftCandidate[]; calendarCandidates: CalendarEventCandidate[]; automationRules: AutomationRule[];
  activeActions: ActionRecord[];
  archiveIndex: ArchiveIndex;
  timelineEvents: TimelineEventRecord[];
  documentTimeline: (id: string) => TimelineEventRecord[];
  caseTimeline: (id: string) => TimelineEventRecord[];
  conversations: ConversationRecord[];
  conversationForDocument: (documentId: string) => readonly ConversationRecord[];
  addConversationExchange: (documentId: string, question: string, answer: string) => void;
  resetDocumentConversation: (documentId: string) => void;
  startNewDocumentConversation: (documentId: string) => void;
  explanationStateForDocument: (documentId: string) => { requestState: ExplanationRequestState; translationState: TranslationState; updatedAt?: string };
  updateExplanationState: (documentId: string, requestState: ExplanationRequestState, translationState: TranslationState) => void;
  searchIndex: readonly SearchIndexEntry[];
  setAssistantContext: (context: SearchConversationContext) => void;
  resetAssistantContext: () => void;
  addAssistantExchange: (query: string, answer: string, intent: SearchIntent, resultIds: readonly string[], nextContext: SearchConversationContext) => void;
  clearAssistantConversation: () => void;
  clearSearchHistory: () => void;
  rebuildSearchIndex: () => void;
  addAction: (item: ActionRecord) => void; updateAction: (item: ActionRecord) => void; confirmAction: (id: string) => void; completeAction: (id: string) => void; reopenAction: (id: string) => void; cancelAction: (id: string) => void; rejectAction: (id: string) => void; archiveAction: (id: string) => void; editAction: (id: string, patch: Partial<Pick<ActionRecord, 'title' | 'description' | 'dueDate' | 'priority' | 'status'>>) => void;
  addReminder: (item: ReminderRecord) => void; addFollowUp: (item: FollowUpRecord) => void; addReplyDraft: (item: ReplyDraftCandidate) => void; addCalendarCandidate: (item: CalendarEventCandidate) => void; addAutomationRule: (item: AutomationRule) => void;
  integrations: IntegrationState;
  prepareEmailConnection: (providerType: EmailProviderType, emailAddress?: string) => EmailAccount;
  activateTesterAccess: (days: 15 | 30) => void;
  completeEmailConnection: (account: EmailAccount) => void;
   updateEmailSyncRange: (accountId: string, range: ImportRange, cursor?: string) => void;
   updateEmailConnectionStatus: (accountId: string, status: import('@/utils/premiumIntegrations').ConnectionStatus, errorCode?: EmailAccount['errorCode']) => void;
   addEmailMessages: (messages: EmailMessage[], attachments?: import('@/utils/premiumIntegrations').EmailAttachment[]) => void;
  disconnectEmailConnection: (accountId: string) => void;
  addEmailMessage: (message: EmailMessage) => void;
  confirmEmailImport: (messageId: string, documentId?: string, caseId?: string) => void;
  addCalendarCandidateFromAction: (item: CalendarEventCandidate) => CalendarCandidate;
   confirmCalendarCandidate: (candidateId: string) => void;
   setCalendarAccountTarget: (account: import('@/utils/premiumIntegrations').CalendarAccount) => void;
   persistCalendarEvent: (candidateId: string, input: Pick<CalendarEvent, 'providerType' | 'providerEventId' | 'calendarAccountId' | 'calendarId' | 'title' | 'startAt' | 'endAt' | 'timezone'>) => void;
  addNotificationRule: (rule: NotificationRule) => void;
  createNotification: (ruleId: string, input: { title: string; body: string; scheduledFor: string; documentId?: string; caseId?: string; actionId?: string; sourceDeadline?: string }) => NotificationInstance | undefined;
  createNotificationForAction: (actionId: string) => NotificationInstance | undefined;
  connectGoogleDriveBackup: () => Promise<void>;
  disconnectGoogleDriveBackup: () => Promise<void>;
  createCloudBackup: (passphrase: string) => Promise<void>;
  cancelBackup: () => void;
  discoverBackupRestore: (passphrase: string) => Promise<void>;
  prepareCloudRestore: (manifestId: string, passphrase: string) => Promise<void>;
  confirmCloudRestore: () => Promise<void>;
  deleteCloudSnapshot: (manifestId: string) => Promise<void>;
  exportLocalBackup: (passphrase: string) => Promise<void>;
  importLocalBackup: (passphrase: string) => Promise<void>;
  updateBackupPolicy: (automatic: Partial<BackupAppState['automatic']>) => void;
};

const STORAGE_KEY = '@documenta/app-state';
const CURRENT_VERSION = 8;
const createDefaultSettings = (): Settings => {
  const deviceLanguage = detectDeviceLanguage();
  return {
    theme: 'system',
    accent: 'koralle',
    fontSize: 'mittel',
    appLanguage: deviceLanguage,
    explanationLanguage: deviceLanguage,
    replyLanguage: deviceLanguage,
    residenceCountry: 'UNKNOWN',
    translationMode: 'ask_first',
    explanationDisplayMode: 'text',
    explanationVoiceIdentifiers: {},
    voiceGender: 'weiblich',
    speechRate: 'normal',
    explanationMode: 'normal',
    entitlements: {},
  };
};
export function migrateSettings(raw: Partial<Settings> | undefined, deviceLanguage = detectDeviceLanguage()): Settings {
  const defaults = createDefaultSettings();
  const languagePreferences = migrateLanguagePreferences(raw, deviceLanguage);
  return {
    ...defaults,
    ...raw,
    ...languagePreferences,
    entitlements: raw?.entitlements ?? {},
    explanationVoiceIdentifiers: Object.fromEntries(Object.entries(raw?.explanationVoiceIdentifiers ?? {}).filter(([language, identifier]) => isExplanationLanguage(language as AppLanguage) && typeof identifier === 'string' && identifier.trim())) as Partial<Record<AppLanguage, string>>,
  };
}
const defaultSecurity: SecuritySettings = { biometricProtection:false, pinEnabled:false, sensitiveDocumentsProtection:false, autoLockMinutes:0, cloudSyncEnabled:false, gmailAccessEnabled:false, aiProcessingEnabled:false, retentionPolicy:'1 Jahr', analyticsEnabled: false, localOnly: true, retentionDays: 365, permissions: { kamera: 'nicht_erfragt', dateien: 'nicht_erfragt', benachrichtigungen: 'nicht_erfragt' } };
const blankCaseState = { cases: [] as CaseRecord[], relationships: [] as DocumentRelationship[], notifications: [] as NotificationRecord[], activities: [] as ActivityRecord[], exportPackages: [] as ExportPackage[], security: defaultSecurity, onboarding: { completed: false, language: 'Deutsch', privacyAccepted: false } as OnboardingState, family: { enabled: false, members: [], sharedHouseholdDocumentIds: [] } as FamilyWorkspace, business: { enabled: false, members: [], approvalRequired: true, documentOwnership:[], sharedInbox:'Coming Soon',auditLog:'Coming Soon' } as BusinessWorkspace, contracts: [] as ContractMonitor[], recurringCosts: [] as RecurringCost[], compareRecords: [] as import('@/utils/documentDomain').CompareRecord[], demoEnabled: false };
const demoDocuments: DocumentRecord[] = [{ id:'demo-rechnung', title:'Demo: Stromrechnung', sender:'Stadtwerke', category:'Wohnen', subcategory:'Energie', documentType:'Rechnung', documentDate:'2026-03-01', dueDate:'2026-03-29', amount:'89,00 €', person:'Demo', status:'Zu bezahlen', tags:['demo','strom'], note:'Demo-Notiz', ocrText:'Absender: Stadtwerke\nRechnung\nGesamtbetrag: 89,00 EUR\nZahlbar bis 29.03.2026', createdAt:'2026-03-20T10:00:00.000Z', lifecycle:'aktiv', source:'file' } as DocumentRecord];
const demoCases: CaseRecord[] = [{ id:'demo-fall', title:'Demo: Stromanbieter', status:'wartet_auf_antwort', profileIds:[], documentIds:['demo-rechnung'], taskIds:['demo-task'], dueDate:'2026-03-29', note:'Antwort prüfen', missingData:[{id:'demo-missing',title:'Kundennummer',type:'data',status:'fehlt'}], checklist:[{id:'demo-check',title:'Rechnung vorhanden',status:'vorhanden'}], timelineEvents:[{id:'demo-event',title:'Fall erstellt',date:'2026-03-20',kind:'activity'}],createdAt:'2026-03-20',updatedAt:'2026-03-20'}];
const demoTasks: DocumentTask[] = [{id:'demo-task',documentId:'demo-rechnung',caseId:'demo-fall',title:'Zahlung prüfen',dueDate:'2026-03-29',priority:'hoch',completed:false,createdAt:'2026-03-20'}];

const sampleDocuments: DocumentRecord[] = [
  {
    id: 'sample-versicherung',
    title: 'Beitragsrechnung 2025',
    sender: 'Allianz Versicherung',
    category: 'Versicherung',
    subcategory: 'Haftpflicht',
    documentType: 'Rechnung',
    documentDate: '12. Dez 2025',
    dueDate: '15. Jan 2026',
    amount: '128,40 €',
    person: 'Haushalt',
    status: 'Zu bezahlen',
    tags: ['wichtig', 'versicherung'],
    note: 'Jahresbeitrag prüfen',
    createdAt: '2025-12-12T08:00:00.000Z',
  },
  {
    id: 'sample-krankenkasse',
    title: 'Bescheid zur Familienversicherung',
    sender: 'TK – Techniker Krankenkasse',
    category: 'Gesundheit',
    subcategory: 'Krankenkasse',
    documentType: 'Bescheid',
    documentDate: '09. Dez 2025',
    dueDate: '20. Dez 2025',
    person: 'Ich',
    status: 'Abgeschlossen',
    tags: ['familie'],
    createdAt: '2025-12-09T08:00:00.000Z',
  },
  {
    id: 'sample-strom',
    title: 'Jahresabrechnung Strom',
    sender: 'Stadtwerke München',
    category: 'Wohnen',
    subcategory: 'Energie',
    documentType: 'Abrechnung',
    documentDate: '01. Dez 2025',
    dueDate: '31. Dez 2025',
    amount: '286,00 €',
    person: 'Haushalt',
    status: 'Später',
    tags: ['strom', '2025'],
    createdAt: '2025-12-01T08:00:00.000Z',
  },
];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [checkIns, setCheckIns] = useState<Record<string, boolean>>({});
  const [journalEntries, setJournalEntries] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>(sampleDocuments);
  const [profiles, setProfiles] = useState<UserProfile[]>(['Ich', 'Partner', 'Kind', 'Haushalt', 'Auto'].map((name) => ({ id: name.toLowerCase(), name, kind: 'default', createdAt: '2025-01-01T00:00:00.000Z' })));
  const [tasks, setTasks] = useState<DocumentTask[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<ReplyDraftCandidate[]>([]);
  const [calendarCandidates, setCalendarCandidates] = useState<CalendarEventCandidate[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [conversationThreads, setConversationThreads] = useState<Record<string, string>>({});
  const [explanationStates, setExplanationStates] = useState<StoredState['explanationStates']>({});
  const [assistantContext, setAssistantContext] = useState<SearchConversationContext>(emptySearchContext);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryRecord[]>([]);
  const [searchIndexRevision, setSearchIndexRevision] = useState(0);
  const [searchIndexRebuiltAt, setSearchIndexRebuiltAt] = useState<string | undefined>();
  const [settings, setSettings] = useState<Settings>(createDefaultSettings);
  const [pendingAsset, setPendingAsset] = useState<PendingAsset | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [domain, setDomain] = useState(blankCaseState);
  const [integrations, setIntegrations] = useState<IntegrationState>(createDefaultIntegrationState);
  const [backup, setBackup] = useState<BackupAppState>(defaultBackupState);
  const backupCancelled = useRef(false);
  const automaticBackupPassphrase = useRef<string | undefined>(undefined);
  const automaticBackupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const automaticBackupDirty = useRef(false);
  const appState = useRef(AppState.currentState);
  const [isForeground, setIsForeground] = useState(AppState.currentState === 'active');
  const pendingRestore = useRef<RestorePlan<StoredState> | undefined>(undefined);
  const nativeRecoveryStarted = useRef(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
       .then(async (stored) => {
        if (!mounted || !stored) return;
         const parsed = JSON.parse(stored) as Partial<StoredState & { profiles: UserProfile[]; tasks: DocumentTask[]; settings: Settings }>;
        setCheckIns(parsed.checkIns ?? {});
        setJournalEntries(parsed.journalEntries ?? []);
        const loadedProfiles = parsed.profiles ?? profiles;
          const loadedDocuments = (parsed.documents ?? sampleDocuments).map((d) => {
            const legacyStatus = d.status as string;
            const migrated = {
              ...d,
              status: (DOCUMENT_STATUSES.includes(legacyStatus as DocumentStatus) ? legacyStatus : legacyStatus === 'Erledigt' ? 'Abgeschlossen' : legacyStatus === 'Offen' ? 'Zu erledigen' : 'Neu') as DocumentStatus,
              profileIds: migrateProfileIds(d.profileIds, d.person, loadedProfiles),
              lifecycle: d.lifecycle ?? 'aktiv',
            };
            const currentIntelligence = isCurrentDocumentIntelligence(d.intelligence)
              ? d.intelligence
              : d.ocrText
                ? analyzeDocumentIntelligence({
                    text: d.ocrText,
                    structuredFields: {
                      ...d.structuredFields,
                      sender: d.sender,
                      documentDate: d.documentDate,
                      dueDate: d.dueDate,
                      amount: d.amount,
                      status: d.status,
                    },
                  })
                : undefined;
             const intelligence = currentIntelligence
              ? applyReviewDecisions(currentIntelligence, d.intelligenceReviewDecisions ?? {})
              : undefined;
              return migrateArchiveDocument({ ...migrated, intelligence, fingerprint: d.fingerprint ?? documentFingerprint(migrated), assetState: 'not_present' as DocumentAssetState });
           });
          const validatedDocuments = await Promise.all(loadedDocuments.map(async (document) => ({
            ...document,
            assetState: await validateDocumentAssets(document),
          })));
          setDocuments(validatedDocuments);
         const migratedActionEngine = migrateActionEngineState(parsed.actionEngine);
          setActions(mergeDerivedActions(migratedActionEngine.actions, validatedDocuments));
         setReminders(migratedActionEngine.reminders);
         setFollowUps(migratedActionEngine.followUps);
         setReplyDrafts(migratedActionEngine.replyDrafts);
         setCalendarCandidates(migratedActionEngine.calendarCandidates);
         setAutomationRules(migratedActionEngine.automationRules);
         setConversations(parsed.conversations ?? []);
         setConversationThreads(parsed.conversationThreads ?? {});
         setExplanationStates(parsed.explanationStates ?? {});
         setAssistantContext(parsed.assistantContext ?? emptySearchContext);
         setAssistantMessages(parsed.assistantMessages ?? []);
         setSearchHistory(parsed.searchHistory ?? []);
         setSearchIndexRevision(parsed.searchIndexVersion === SEARCH_INDEX_VERSION ? (parsed.searchIndexRevision ?? 0) : 1);
         setSearchIndexRebuiltAt(parsed.searchIndexVersion === SEARCH_INDEX_VERSION ? parsed.searchIndexRebuiltAt : new Date().toISOString());
          setIntegrations(migrateIntegrationState(parsed.integrations));
          setBackup({ ...defaultBackupState(), ...parsed.backup, accounts: requireCloudAccountRevalidation(parsed.backup?.accounts ?? []), snapshots: parsed.backup?.snapshots ?? [], automatic: { ...defaultBackupState().automatic, ...parsed.backup?.automatic, enabled: false, foregroundOnly: true }, audit: parsed.backup?.audit ?? [] });
        if (parsed.profiles) setProfiles(loadedProfiles);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.settings) setSettings(migrateSettings(parsed.settings));
         setDomain({ ...blankCaseState, cases: parsed.cases ?? [], relationships: parsed.relationships ?? [], notifications: parsed.notifications ?? [], activities: parsed.activities ?? [], exportPackages: parsed.exportPackages ?? [], security: disableUnenforcedSecurity({ ...defaultSecurity, ...parsed.security, permissions: { ...defaultSecurity.permissions, ...parsed.security?.permissions } }), onboarding: parsed.onboarding ?? { ...blankCaseState.onboarding, completed: true }, family: parsed.family ?? blankCaseState.family, business: parsed.business ?? blankCaseState.business, contracts: parsed.contracts ?? [], recurringCosts: parsed.recurringCosts ?? [], demoEnabled: parsed.demoEnabled ?? false });
         setDomain(current=>({...current,compareRecords:parsed.compareRecords??[]}));
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || nativeRecoveryStarted.current) return;
    nativeRecoveryStarted.current = true;
    const items = integrations.notificationInstances
      .filter((item) => item.status === 'scheduled')
      .map((item) => ({ id: item.id, title: item.title, body: item.body, scheduledFor: item.scheduledFor, target: item.documentId ? `/document/${item.documentId}` : item.actionId ? `/action/${item.actionId}` : '/notifications' }));
    void recoverLocalNotifications(items).then(() => setIntegrations((current) => ({ ...current, lastNativeRecoveryAt: new Date().toISOString() })));
  }, [hydrated, integrations.notificationInstances]);

  useEffect(() => {
    if (!hydrated) return;
     const actionEngine: ActionEngineState = { schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules };
       const state: StoredState = { version: CURRENT_VERSION, checkIns, journalEntries, documents, profiles, tasks, settings, actionEngine, conversations, conversationThreads, explanationStates, assistantContext, assistantMessages, searchHistory, searchIndexVersion: SEARCH_INDEX_VERSION, searchIndexRevision, searchIndexRebuiltAt, integrations, backup, ...domain };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(
      () => undefined,
    );
    }, [checkIns, journalEntries, documents, profiles, tasks, settings, domain, integrations, backup, hydrated, actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules, conversations, conversationThreads, explanationStates, assistantContext, assistantMessages, searchHistory, searchIndexRevision, searchIndexRebuiltAt]);

  useEffect(() => {
    if (!hydrated) return;
    const contextFor = (action: ActionRecord) => ({ documentType: documents.find((item) => item.id === action.documentId)?.documentType, profileId: action.profileId });
    const ruleReminderActions = actionsMatchingAutomation(automationRules, actions, 'create_reminder', contextFor);
    const ruleFollowUpActions = actionsMatchingAutomation(automationRules, actions, 'suggest_follow_up', contextFor);
    const ruleReplyActions = actionsMatchingAutomation(automationRules, actions, 'create_reply_draft_candidate', contextFor);
    const ruleCalendarActions = actionsMatchingAutomation(automationRules, actions, 'create_calendar_candidate', contextFor);
    const generatedReminders = ruleReminderActions.map((action) => createReminderCandidate(action)).filter((item): item is ReminderRecord => !!item);
    const generatedFollowUps = ruleFollowUpActions.map((action) => createFollowUpCandidate(action)).filter((item): item is FollowUpRecord => !!item);
    const generatedReplyDrafts = ruleReplyActions.map((action) => {
      const document = documents.find((item) => item.id === action.documentId);
      return document ? createReplyDraftCandidate(action, document) : undefined;
    }).filter((item): item is ReplyDraftCandidate => !!item);
    const generatedCalendar = ruleCalendarActions.map((action) => {
      const document = documents.find((item) => item.id === action.documentId);
      return document ? createCalendarCandidate({ document, action, caseId: action.caseId }) : undefined;
    }).filter((item): item is CalendarEventCandidate => !!item);
    const actionIds = actions.map((action) => action.id);
    const nextReminders = reconcileAutomationCandidates(reminders, generatedReminders, actionIds);
    const nextFollowUps = reconcileAutomationCandidates(followUps, generatedFollowUps, actionIds);
    const nextReplyDrafts = reconcileAutomationCandidates(replyDrafts, generatedReplyDrafts, actionIds);
    const nextCalendar = reconcileAutomationCandidates(calendarCandidates, generatedCalendar, actionIds);
    setReminders((current) => JSON.stringify(current) === JSON.stringify(nextReminders) ? current : nextReminders);
    setFollowUps((current) => JSON.stringify(current) === JSON.stringify(nextFollowUps) ? current : nextFollowUps);
    setReplyDrafts((current) => JSON.stringify(current) === JSON.stringify(nextReplyDrafts) ? current : nextReplyDrafts);
    setCalendarCandidates((current) => JSON.stringify(current) === JSON.stringify(nextCalendar) ? current : nextCalendar);
  }, [actions, documents, hydrated, automationRules]);

  const toggleCheckIn = useCallback((id: string) => {
    setCheckIns((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const addJournalEntry = useCallback((entry: string) => {
    setJournalEntries((current) => [entry, ...current]);
  }, []);

  const removeJournalEntry = useCallback((entry: string) => {
    setJournalEntries((current) => current.filter((item) => item !== entry));
  }, []);

   const addActivity = useCallback((type: ActivityRecord['type'], message: string) => setDomain((current) => ({ ...current, activities: [{ id: `activity-${Date.now()}`, type, message, createdAt: new Date().toISOString() }, ...current.activities] })), []);
    const addDocument = useCallback(async (document: DocumentRecord) => {
      const stored = migrateArchiveDocument({ ...document, lifecycle: 'aktiv' as const, fingerprint: document.fingerprint ?? documentFingerprint(document), profileIds: migrateProfileIds(document.profileIds, document.person, profiles) });
      const nextDocuments = [stored, ...documents.filter((item) => item.id !== stored.id)];
      const nextActions = dedupeActions([...deriveActionsFromDocument(stored as ActionEngineDocument), ...actions]);
      const activity = { id: `activity-${Date.now()}`, type: 'dokument' as const, message: `Dokument hinzugefügt: ${document.title}`, createdAt: new Date().toISOString() };
      const nextDomain = { ...domain, activities: [activity, ...domain.activities] };
      const actionEngine: ActionEngineState = { schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, actions: nextActions, reminders, followUps, replyDrafts, calendarCandidates, automationRules };
      const state: StoredState = { version: CURRENT_VERSION, checkIns, journalEntries, documents: nextDocuments, profiles, tasks, settings, actionEngine, conversations, conversationThreads, explanationStates, assistantContext, assistantMessages, searchHistory, searchIndexVersion: SEARCH_INDEX_VERSION, searchIndexRevision: searchIndexRevision + 1, searchIndexRebuiltAt: new Date().toISOString(), integrations, backup, ...nextDomain };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setDocuments(nextDocuments);
      setActions(nextActions);
      setSearchIndexRevision(state.searchIndexRevision);
      setSearchIndexRebuiltAt(state.searchIndexRebuiltAt);
      setDomain(nextDomain);
   }, [profiles, documents, actions, domain, reminders, followUps, replyDrafts, calendarCandidates, automationRules, checkIns, journalEntries, tasks, settings, conversations, conversationThreads, explanationStates, assistantContext, assistantMessages, searchHistory, searchIndexRevision, integrations, backup]);
    const updateDocument = useCallback((document: DocumentRecord) => {
       const updated = migrateArchiveDocument({ ...document, fingerprint: documentFingerprint(document), profileIds: migrateProfileIds(document.profileIds, document.person, profiles) });
      setDocuments((current) => current.some((item) => item.id === document.id)
        ? current.map((item) => item.id === document.id ? updated : item)
        : document.id.startsWith('demo-') ? [updated, ...current] : current);
       setActions((current) => mergeDerivedActions(current, [updated as ActionEngineDocument]));
      addActivity('dokument', `Dokument aktualisiert: ${document.title}`);
    }, [profiles, addActivity]);
   const addProfile = useCallback((name: string) => { const trimmed = name.trim(); if (trimmed) { setProfiles((current) => [...current, { id: `profile-${Date.now()}`, name: trimmed, kind: 'custom', createdAt: new Date().toISOString() }]); addActivity('fall', `Profil hinzugefügt: ${trimmed}`); } }, [addActivity]);
  const renameProfile = useCallback((id: string, name: string) => setProfiles((current) => current.map((profile) => profile.id === id && name.trim() ? { ...profile, name: name.trim() } : profile)), []);
   const addTask = useCallback((task: DocumentTask) => { setTasks((current) => [task, ...current]); addActivity('aufgabe', `Aufgabe hinzugefügt: ${task.title}`); }, [addActivity]);
   const toggleTask = useCallback((id: string) => setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task)), []);
   const updateTask = useCallback((task: DocumentTask) => { setTasks((current) => current.map((item) => item.id === task.id ? task : item)); addActivity('aufgabe', `Aufgabe aktualisiert: ${task.title}`); }, [addActivity]);
  const updateSettings = useCallback((next: Partial<Settings>) => setSettings((current) => migrateSettings({ ...current, ...next }, current.appLanguage)), []);
  const featureCheck = useCallback((feature: Feature) => checkFeature(feature, settings.entitlements), [settings.entitlements]);

   const clearPendingAsset = useCallback(() => {
    setPendingAsset(null);
  }, []);
   const addCase = useCallback((item: CaseRecord) => { setDomain((current) => ({ ...current, cases: [item, ...current.cases] })); addActivity('fall', `Fall erstellt: ${item.title}`); }, [addActivity]);
   const updateCase = useCallback((item: CaseRecord) => { setDomain((current) => ({ ...current, cases: current.cases.map((x) => x.id === item.id ? item : x) })); addActivity('fall', `Fall aktualisiert: ${item.title}`); }, [addActivity]);
   const addRelationship = useCallback((item: DocumentRelationship) => { setDomain((current) => ({ ...current, relationships: [item, ...current.relationships] })); addActivity('dokument', `Dokumentbeziehung erstellt: ${item.kind}`); }, [addActivity]);
   const markNotificationRead = useCallback((id: string) => setDomain((current) => ({ ...current, notifications: current.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })), []);
   const addExportPackage = useCallback((item: ExportPackage) => { setDomain((current) => ({ ...current, exportPackages: [item, ...current.exportPackages] })); addActivity('export', `Exportpaket vorbereitet: ${item.recipient || 'ohne Empfänger'}`); }, [addActivity]);
   const setLifecycle = useCallback((id: string, lifecycle: 'aktiv' | 'archiviert' | 'papierkorb') => { setDocuments((current) => current.map((d) => d.id === id ? { ...d, lifecycle } : d)); addActivity('archiv', `Dokument ${lifecycle}: ${id}`); }, [addActivity]);
     const permanentlyDeleteDocument = useCallback((id: string) => { const title=documents.find(d=>d.id===id)?.title??'Dokument'; const removedActionIds=new Set(actions.filter(item=>item.documentId===id).map(item=>item.id)); const keepCandidate=(item:{documentId?:string;actionId?:string})=>item.documentId!==id&&(!item.actionId||!removedActionIds.has(item.actionId)); setDocuments((current) => current.filter((d) => d.id !== id)); setTasks(current=>cleanupDeletedDocument(id,domain.cases,domain.relationships,current).tasks); setActions(current=>current.filter(item=>item.documentId!==id)); setReminders(current=>current.filter(keepCandidate)); setFollowUps(current=>current.filter(keepCandidate)); setReplyDrafts(current=>current.filter(keepCandidate)); setCalendarCandidates(current=>current.filter(keepCandidate)); setConversations(current=>current.filter(record=>record.documentId!==id)); setConversationThreads(current=>{const next={...current}; delete next[id]; return next;}); setExplanationStates(current=>{const next={...current}; delete next[id]; return next;}); setAssistantMessages(current=>current.filter(record=>record.documentId!==id&&!record.resultIds?.includes(id))); setSearchHistory(current=>current.map(record=>({...record,resultIds:record.resultIds.filter(resultId=>resultId!==id)})).filter(record=>record.resultIds.length>0)); setAssistantContext(current=>current.documentId===id?emptySearchContext:current); setDomain(current=>{const cleaned=cleanupDeletedDocument(id,current.cases,current.relationships,[]); return {...current,cases:cleaned.cases,relationships:cleaned.relationships};}); addActivity('archiv', `Dokument endgültig gelöscht: ${title}`); }, [addActivity, actions, documents, domain.cases, domain.relationships]);
   const updateSecurity = useCallback((item: Partial<SecuritySettings>) => {
     const { biometricProtection: _biometric, pinEnabled: _pin, autoLockMinutes: _autoLock, ...enforced } = item;
     setDomain((current) => ({ ...current, security: disableUnenforcedSecurity({ ...current.security, ...enforced }) }));
   }, []);
   const completeOnboarding = useCallback((item: OnboardingState) => setDomain((current) => ({ ...current, onboarding: item })), []);
   const setDemoEnabled = useCallback((demoEnabled: boolean) => setDomain((current) => ({ ...current, demoEnabled })), []);
   const markGeneratedNotificationRead = useCallback((id: string) => setDomain(current => ({...current, notifications: current.notifications.some(n=>n.id===id) ? current.notifications.map(n=>n.id===id?{...n,read:true}:n) : [{id,kind:'neu',title:'Hinweis gelesen',body:'',read:true,createdAt:new Date().toISOString()},...current.notifications]})), []);
    const addCompareRecord = useCallback((item: import('@/utils/documentDomain').CompareRecord) => { setDomain(current=>({...current,compareRecords:[item,...current.compareRecords]})); addActivity('dokument', 'Dokumentvergleich gespeichert'); },[addActivity]);
    const addContract = useCallback((item: ContractMonitor) => { setDomain(current => ({ ...current, contracts: [item, ...current.contracts] })); addActivity('fall', `Vertrag hinzugefügt: ${item.title}`); }, [addActivity]);
    const addRecurringCost = useCallback((item: RecurringCost) => { setDomain(current => ({ ...current, recurringCosts: [item, ...current.recurringCosts] })); addActivity('fall', `Regelmäßige Kosten hinzugefügt: ${item.title}`); }, [addActivity]);
     const addAction = useCallback((item: ActionRecord) => { setActions((current) => dedupeActions([item, ...current])); addActivity('aufgabe', `Teendő hozzáadva: ${item.title}`); }, [addActivity]);
     const updateAction = useCallback((item: ActionRecord) => setActions((current) => current.map((action) => action.id === item.id ? { ...item, source: action.source, sourceReference: action.sourceReference, evidence: action.evidence, dedupeKey: action.dedupeKey } : action)), []);
     const changeActionStatus = useCallback((id: string, status: ActionStatus, message: string) => {
        setActions((current) => current.map((action) => action.id === id ? transitionAction(action, status, new Date(), message) : action));
       if (status === 'completed' || status === 'cancelled' || status === 'rejected' || status === 'archived') {
           setIntegrations((current) => {
             const nativeIds = current.notificationInstances.filter((item) => item.actionId === id && item.status === 'scheduled').map((item) => item.id);
             nativeIds.forEach((notificationId) => void cancelLocalNotification(notificationId));
             return { ...current,
               notificationInstances: current.notificationInstances.map((item) => item.actionId === id && item.status === 'scheduled' ? { ...item, status: 'cancelled' as const } : item),
               notificationSchedules: current.notificationSchedules.map((item) => nativeIds.includes(item.instanceId) ? { ...item, status: 'cancelled' as const } : item),
             };
           });
         const candidateStatus = status === 'completed' ? 'completed' as const : 'cancelled' as const;
         const finishCandidate = <T extends { actionId?: string; status: import('@/utils/actionEngine').CandidateStatus; updatedAt: string }>(item: T): T => item.actionId === id ? { ...item, status: candidateStatus, updatedAt: new Date().toISOString() } : item;
         setReminders((current) => current.map(finishCandidate));
         setFollowUps((current) => current.map(finishCandidate));
         setReplyDrafts((current) => current.map(finishCandidate));
         setCalendarCandidates((current) => current.map(finishCandidate));
       }
       addActivity('aufgabe', message);
     }, [addActivity]);
     const confirmAction = useCallback((id: string) => changeActionStatus(id, 'confirmed', 'Teendő megerősítve'), [changeActionStatus]);
     const completeAction = useCallback((id: string) => changeActionStatus(id, 'completed', 'Teendő elvégezve'), [changeActionStatus]);
     const reopenAction = useCallback((id: string) => changeActionStatus(id, 'suggested', 'Teendő újranyitva'), [changeActionStatus]);
     const cancelAction = useCallback((id: string) => changeActionStatus(id, 'cancelled', 'Teendő megszakítva'), [changeActionStatus]);
     const rejectAction = useCallback((id: string) => changeActionStatus(id, 'rejected', 'Teendőjavaslat elutasítva'), [changeActionStatus]);
     const archiveAction = useCallback((id: string) => changeActionStatus(id, 'archived', 'Teendő archiválva'), [changeActionStatus]);
      const editAction = useCallback((id: string, patch: Partial<Pick<ActionRecord, 'title' | 'description' | 'dueDate' | 'priority' | 'status'>>) => {
        const existing = actions.find((item) => item.id === id);
        if (!existing) return;
        const updated = editActionRecord(existing, patch);
        setActions((current) => current.map((action) => action.id === id ? updated : action));
        if (existing.dueDate === updated.dueDate) return;
        const obsolete = integrations.notificationInstances.filter((item) => item.actionId === id && item.status === 'scheduled');
        obsolete.forEach((item) => void cancelLocalNotification(item.id));
        setIntegrations((current) => {
          const cancelledInstances = current.notificationInstances.map((item) => item.actionId === id && item.status === 'scheduled' ? { ...item, status: 'cancelled' as const } : item);
          const cancelledSchedules = current.notificationSchedules.map((item) => obsolete.some((old) => old.id === item.instanceId) ? { ...item, status: 'cancelled' as const } : item);
          if (!updated.dueDate || updated.status !== 'confirmed' || !updated.userConfirmed) return { ...current, notificationInstances: cancelledInstances, notificationSchedules: cancelledSchedules };
          const sourceDate = new Date(`${updated.dueDate.slice(0, 10)}T09:00:00.000Z`); sourceDate.setUTCDate(sourceDate.getUTCDate() - 1);
          const at = new Date().toISOString();
          const rule: NotificationRule = { id: `notification-rule-${updated.id}`, type: updated.type === 'pay' ? 'payment_deadline' : 'task_due', enabled: true, documentId: updated.documentId, caseId: updated.caseId, actionId: updated.id, sourceDeadline: updated.dueDate, timing: 'one_day_before', sourceConfidence: updated.confidence, sourceReviewStatus: 'confirmed', userConfirmed: true, createdAt: at, updatedAt: at };
           const candidateInstance = createNotificationInstance(rule, { title: updated.title, body: updated.description, scheduledFor: sourceDate.toISOString(), documentId: updated.documentId, caseId: updated.caseId, actionId: updated.id, sourceDeadline: updated.dueDate });
           const shouldSchedule = candidateInstance.status === 'scheduled';
           const instance = { ...candidateInstance, status: 'blocked' as const };
           const schedule = createNotificationSchedule(instance, deviceTimeZone());
           if (shouldSchedule) void scheduleLocalNotification({ id: instance.id, title: instance.title, body: instance.body, scheduledFor: instance.scheduledFor, target: `/action/${updated.id}`, privateMode: true }).then((nativeId) => {
             if (!nativeId) return;
             setIntegrations((next) => ({ ...next, notificationInstances: next.notificationInstances.map((item) => item.id === instance.id ? { ...item, status: 'scheduled' } : item), notificationSchedules: next.notificationSchedules.map((item) => item.instanceId === instance.id ? { ...item, status: 'scheduled' } : item) }));
           });
          return { ...current, notificationRules: [rule, ...current.notificationRules.filter((item) => item.id !== rule.id)], notificationInstances: [instance, ...cancelledInstances], notificationSchedules: [schedule, ...cancelledSchedules] };
        });
      }, [actions, integrations.notificationInstances]);
     const addReminder = useCallback((item: ReminderRecord) => setReminders((current) => dedupeCandidates([item, ...current])), []);
     const addFollowUp = useCallback((item: FollowUpRecord) => setFollowUps((current) => dedupeCandidates([item, ...current])), []);
     const addReplyDraft = useCallback((item: ReplyDraftCandidate) => setReplyDrafts((current) => dedupeCandidates([item, ...current])), []);
     const addCalendarCandidate = useCallback((item: CalendarEventCandidate) => setCalendarCandidates((current) => dedupeCandidates([item, ...current])), []);
     const addAutomationRule = useCallback((item: AutomationRule) => setAutomationRules((current) => [item, ...current.filter((rule) => rule.id !== item.id)]), []);
       const activateTesterAccess = useCallback((days: 15 | 30) => {
         setIntegrations((current) => ({ ...current, entitlement: createTesterEntitlement(days) }));
       }, []);
       const completeEmailConnection = useCallback((account: EmailAccount) => {
         setIntegrations((current) => !hasPremiumEntitlement(current.entitlement) ? current : {
           ...current,
           emailAccounts: [account, ...current.emailAccounts.filter((item) => item.id !== account.id)],
           auditLog: [auditEntry('account_connected', { providerType: account.providerType }), ...current.auditLog],
         });
       }, []);
       const updateEmailSyncRange = useCallback((accountId: string, range: ImportRange, cursor?: string) => {
          setIntegrations((current) => ({ ...current, emailAccounts: current.emailAccounts.map((item) => item.id === accountId ? { ...item, syncRange: range, lastSyncCursor: cursor, lastSyncAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item) }));
       }, []);
        const updateEmailConnectionStatus = useCallback((accountId: string, status: import('@/utils/premiumIntegrations').ConnectionStatus, errorCode?: EmailAccount['errorCode']) => {
          setIntegrations((current) => ({ ...current, emailAccounts: current.emailAccounts.map((item) => item.id === accountId ? { ...item, connectionStatus: status, syncEnabled: status === 'connected', errorCode, updatedAt: new Date().toISOString() } : item) }));
        }, []);
       const addEmailMessages = useCallback((messages: EmailMessage[], attachments: import('@/utils/premiumIntegrations').EmailAttachment[] = []) => {
         setIntegrations((current) => {
           if (!hasPremiumEntitlement(current.entitlement)) return current;
           const existingProviderIds = new Set(current.emailMessages.map((item) => `${item.accountId}|${item.providerMessageId}`));
           const unique = messages.filter((item) => !existingProviderIds.has(`${item.accountId}|${item.providerMessageId}`));
           const traces = { ...current.emailSourceTraces };
           unique.forEach((message) => {
             const account = current.emailAccounts.find((item) => item.id === message.accountId);
             if (account) traces[message.id] = sourceTraceFor(message, account);
           });
           const attachmentIds = new Set(current.emailAttachments.map((item) => item.id));
           const uniqueAttachments = attachments.filter((item) => !attachmentIds.has(item.id));
           return unique.length || uniqueAttachments.length ? { ...current, emailMessages: [...unique, ...current.emailMessages], emailAttachments: [...uniqueAttachments, ...current.emailAttachments], emailSourceTraces: traces } : current;
         });
       }, []);
      const prepareEmailConnection = useCallback((providerType: EmailProviderType, emailAddress = '') => {
        const account = createPreparedEmailAccount(providerType, emailAddress);
        setIntegrations((current) => {
           if (!hasPremiumEntitlement(current.entitlement)) return current;
          const existing = current.emailAccounts.find((item) => item.id === account.id);
          return existing ? current : { ...current, emailAccounts: [account, ...current.emailAccounts], auditLog: [auditEntry('account_connected', { providerType }), ...current.auditLog] };
        });
        return account;
      }, []);
      const disconnectEmailConnection = useCallback((accountId: string) => {
         const account = integrations.emailAccounts.find((item) => item.id === accountId);
         if (account?.providerType === 'google' || account?.providerType === 'microsoft') void disconnectOAuthProvider(account.providerType, accountId);
         if (account?.providerType === 'imap') void removeImapPassword(accountId);
        setIntegrations((current) => {
          const account = current.emailAccounts.find((item) => item.id === accountId);
          if (!account) return current;
          return { ...current, emailAccounts: current.emailAccounts.map((item) => item.id === accountId ? { ...item, connectionStatus: 'disconnected' as const, syncEnabled: false, updatedAt: new Date().toISOString() } : item), auditLog: [auditEntry('account_disconnected', { providerType: account.providerType }), ...current.auditLog] };
        });
       }, [integrations.emailAccounts]);
      const addEmailMessage = useCallback((message: EmailMessage) => {
        setIntegrations((current) => {
          if (!current.entitlement.enabled || !current.entitlement.userEntitled) return current;
          const attachments = current.emailAttachments.filter((item) => item.messageId === message.id);
          if (isDuplicateEmailImport(message, attachments[0], current.emailMessages, current.emailAttachments)) return current;
          const account = current.emailAccounts.find((item) => item.id === message.accountId);
          return { ...current, emailMessages: [message, ...current.emailMessages], emailSourceTraces: account ? { ...current.emailSourceTraces, [message.id]: sourceTraceFor(message, account) } : current.emailSourceTraces };
        });
      }, []);
      const confirmEmailImport = useCallback((messageId: string, documentId?: string, caseId?: string) => {
        setIntegrations((current) => current.entitlement.enabled && current.entitlement.userEntitled ? ({ ...current, emailMessages: current.emailMessages.map((item) => item.id === messageId ? { ...item, importStatus: 'imported', relatedDocumentIds: documentId ? [...new Set([...item.relatedDocumentIds, documentId])] : item.relatedDocumentIds, relatedCaseId: caseId ?? item.relatedCaseId } : item), auditLog: [auditEntry('import_confirmed', { documentId, caseId }), ...current.auditLog] }) : current);
      }, []);
      const addCalendarCandidateFromAction = useCallback((item: CalendarEventCandidate) => {
         const candidate = calendarCandidateFromAction(item, 'manual', deviceTimeZone());
        setIntegrations((current) => !current.entitlement.enabled || !current.entitlement.userEntitled || current.calendarCandidates.some((existing) => existing.id === candidate.id) ? current : { ...current, calendarCandidates: [candidate, ...current.calendarCandidates] });
        return candidate;
       }, []);
      const confirmCalendarCandidate = useCallback((candidateId: string) => {
        setIntegrations((current) => {
          if (!current.entitlement.enabled || !current.entitlement.userEntitled) return current;
          const existing = current.calendarCandidates.find((item) => item.id === candidateId);
          if (!existing) return current;
          const confirmed = { ...existing, status: 'confirmed' as const, userConfirmed: true, updatedAt: new Date().toISOString() };
          return { ...current, calendarCandidates: current.calendarCandidates.map((item) => item.id === candidateId ? confirmed : item) };
        });
      }, []);
      const setCalendarAccountTarget = useCallback((account: import('@/utils/premiumIntegrations').CalendarAccount) => {
        setIntegrations((current) => !hasPremiumEntitlement(current.entitlement) ? current : {
          ...current,
          calendarAccounts: [account, ...current.calendarAccounts.filter((item) => item.id !== account.id)],
        });
      }, []);
      const persistCalendarEvent = useCallback((candidateId: string, input: Pick<CalendarEvent, 'providerType' | 'providerEventId' | 'calendarAccountId' | 'calendarId' | 'title' | 'startAt' | 'endAt' | 'timezone'>) => {
        setIntegrations((current) => {
          if (!hasPremiumEntitlement(current.entitlement)) return current;
          const candidate = current.calendarCandidates.find((item) => item.id === candidateId);
          if (!candidate) return current;
          const existing = current.calendarEvents.find((item) => item.sourceReference === candidate.sourceReference && item.providerType === input.providerType && item.calendarId === input.calendarId);
          const at = new Date().toISOString();
          const event: CalendarEvent = { ...(existing ?? createCalendarEvent({ ...candidate, status: 'confirmed', userConfirmed: true })!), ...input, id: existing?.id ?? `calendar-event-${candidate.id}-${input.calendarId ?? 'default'}`, sourceReference: candidate.sourceReference, allDay: candidate.allDay, sourceDocumentId: candidate.sourceDocumentId, sourceCaseId: candidate.sourceCaseId, sourceActionId: candidate.sourceActionId, status: existing ? 'updated' : 'created', createdAt: existing?.createdAt ?? at, updatedAt: at };
          return { ...current, calendarCandidates: current.calendarCandidates.map((item) => item.id === candidateId ? { ...item, status: 'created', userConfirmed: true, updatedAt: at } : item), calendarEvents: [event, ...current.calendarEvents.filter((item) => item.id !== event.id)] };
        });
      }, []);
      const addNotificationRule = useCallback((rule: NotificationRule) => setIntegrations((current) => current.entitlement.enabled && current.entitlement.userEntitled ? ({ ...current, notificationRules: [rule, ...current.notificationRules.filter((item) => item.id !== rule.id)] }) : current), []);
      const createNotification = useCallback((ruleId: string, input: { title: string; body: string; scheduledFor: string; documentId?: string; caseId?: string; actionId?: string; sourceDeadline?: string }) => {
        let created: NotificationInstance | undefined;
        let shouldSchedule = false;
        setIntegrations((current) => {
          if (!current.entitlement.enabled || !current.entitlement.userEntitled) return current;
          const rule = current.notificationRules.find((item) => item.id === ruleId);
          if (!rule) return current;
           const candidate = createNotificationInstance(rule, input);
           shouldSchedule = candidate.status === 'scheduled';
           created = { ...candidate, status: 'blocked' };
          const duplicate = current.notificationInstances.find((item) => item.dedupeKey === notificationDedupeKey({ ...rule, ...input }));
           const schedule = createNotificationSchedule(created, deviceTimeZone());
          return duplicate ? current : { ...current, notificationSchedules: [schedule, ...current.notificationSchedules], notificationInstances: [created, ...current.notificationInstances], auditLog: [auditEntry('notification_created', { documentId: created.documentId, caseId: created.caseId }), ...current.auditLog] };
        });
          if (created && shouldSchedule) void scheduleLocalNotification({ id: created.id, title: created.title, body: created.body, scheduledFor: created.scheduledFor, target: created.documentId ? `/document/${created.documentId}` : created.actionId ? `/action/${created.actionId}` : undefined, privateMode: true }).then((nativeId) => {
            if (!nativeId) return;
            setIntegrations((current) => ({ ...current, notificationInstances: current.notificationInstances.map((item) => item.id === created!.id ? { ...item, status: 'scheduled' } : item), notificationSchedules: current.notificationSchedules.map((item) => item.instanceId === created!.id ? { ...item, status: 'scheduled' } : item) }));
          });
         return created;
       }, []);
      const createNotificationForAction = useCallback((actionId: string) => {
        const action = actions.find((item) => item.id === actionId);
        if (!action?.dueDate) return undefined;
        const sourceDate = new Date(`${action.dueDate.slice(0, 10)}T09:00:00.000Z`);
        if (Number.isNaN(sourceDate.getTime())) return undefined;
        sourceDate.setUTCDate(sourceDate.getUTCDate() - 1);
        const at = new Date().toISOString();
        const rule: NotificationRule = { id: `notification-rule-${action.id}`, type: action.type === 'pay' ? 'payment_deadline' : 'task_due', enabled: true, documentId: action.documentId, caseId: action.caseId, actionId: action.id, sourceDeadline: action.dueDate, timing: 'one_day_before', sourceConfidence: action.confidence, sourceReviewStatus: action.status === 'confirmed' && action.userConfirmed ? 'confirmed' : 'needs_review', userConfirmed: action.userConfirmed, createdAt: at, updatedAt: at };
         const candidateInstance = createNotificationInstance(rule, { title: action.title, body: action.description, scheduledFor: sourceDate.toISOString(), documentId: action.documentId, caseId: action.caseId, actionId: action.id, sourceDeadline: action.dueDate });
         const shouldSchedule = candidateInstance.status === 'scheduled';
         const instance = { ...candidateInstance, status: 'blocked' as const };
        setIntegrations((current) => {
          if (!current.entitlement.enabled || !current.entitlement.userEntitled) return current;
          const duplicate = current.notificationInstances.some((item) => item.dedupeKey === instance.dedupeKey);
          if (duplicate) return current;
           const schedule = createNotificationSchedule(instance, deviceTimeZone());
          return { ...current, notificationRules: [rule, ...current.notificationRules.filter((item) => item.id !== rule.id)], notificationSchedules: [schedule, ...current.notificationSchedules], notificationInstances: [instance, ...current.notificationInstances], auditLog: [auditEntry('notification_created', { documentId: action.documentId, caseId: action.caseId }), ...current.auditLog] };
        });
          if (shouldSchedule) void scheduleLocalNotification({ id: instance.id, title: instance.title, body: instance.body, scheduledFor: instance.scheduledFor, target: instance.documentId ? `/document/${instance.documentId}` : `/action/${action.id}`, privateMode: true }).then((nativeId) => {
            if (!nativeId) return;
            setIntegrations((current) => ({ ...current, notificationInstances: current.notificationInstances.map((item) => item.id === instance.id ? { ...item, status: 'scheduled' } : item), notificationSchedules: current.notificationSchedules.map((item) => item.instanceId === instance.id ? { ...item, status: 'scheduled' } : item) }));
          });
        return instance;
       }, [actions]);
     const activeActions = useMemo(() => actions.filter((action) => action.status !== 'archived'), [actions]);
     const actionEngine = useMemo<ActionEngineState>(() => ({ schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules }), [actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules]);
     const archiveIndex = useMemo(() => buildArchiveIndex(documents), [documents]);
     const timelineEvents = useMemo(() => documents.flatMap((document) => buildDocumentTimeline(document, actions, domain.relationships, replyDrafts, followUps)), [documents, actions, domain.relationships, replyDrafts, followUps]);
     const documentTimeline = useCallback((id: string) => timelineEvents.filter((event) => event.documentId === id), [timelineEvents]);
     const caseTimeline = useCallback((id: string) => {
       const item = domain.cases.find((candidate) => candidate.id === id);
       return item ? buildCaseTimeline(item, documents, domain.relationships, actions, replyDrafts, followUps) : [];
     }, [domain.cases, documents, domain.relationships, actions, replyDrafts, followUps]);
      const conversationIndex = useMemo(() => {
        const index = new Map<string, ConversationRecord[]>();
        conversations.forEach((record) => {
          const key = `${record.documentId}|${record.threadId}`;
          index.set(key, [...(index.get(key) ?? []), record]);
        });
        return index;
      }, [conversations]);
      const conversationForDocument = useCallback((documentId: string) => {
        const threadId = conversationThreads[documentId] ?? `thread-${documentId}-default`;
        return conversationIndex.get(`${documentId}|${threadId}`) ?? [];
      }, [conversationIndex, conversationThreads]);
      const addConversationExchange = useCallback((documentId: string, question: string, answer: string) => {
        const threadId = conversationThreads[documentId] ?? `thread-${documentId}-default`;
        const timestamp = new Date().toISOString();
        setConversationThreads((current) => current[documentId] ? current : { ...current, [documentId]: threadId });
        setConversations((current) => [
          ...current,
          { documentId, threadId, id: `message-${Date.now()}-user`, role: 'user', text: question, createdAt: timestamp },
          { documentId, threadId, id: `message-${Date.now()}-assistant`, role: 'assistant', text: answer, createdAt: timestamp },
        ]);
      }, [conversationThreads]);
      const resetDocumentConversation = useCallback((documentId: string) => {
        setConversations((current) => current.filter((record) => record.documentId !== documentId));
        setConversationThreads((current) => ({ ...current, [documentId]: `thread-${documentId}-${Date.now()}` }));
      }, []);
      const startNewDocumentConversation = useCallback((documentId: string) => setConversationThreads((current) => ({ ...current, [documentId]: `thread-${documentId}-${Date.now()}` })), []);
      const explanationStateForDocument = useCallback((documentId: string) => explanationStates[documentId] ?? { requestState: 'not_requested', translationState: 'unavailable' }, [explanationStates]);
      const updateExplanationState = useCallback((documentId: string, requestState: ExplanationRequestState, translationState: TranslationState) => setExplanationStates((current) => ({ ...current, [documentId]: { requestState, translationState, updatedAt: new Date().toISOString() } })), []);
      const searchableDocuments = useMemo(
        () => domain.demoEnabled ? demoDocuments.map((demo) => documents.find((item) => item.id === demo.id) ?? demo) : documents.filter((item) => item.lifecycle !== 'papierkorb'),
        [documents, domain.demoEnabled],
      );
      const searchableCases = useMemo(() => domain.demoEnabled ? demoCases : domain.cases, [domain.cases, domain.demoEnabled]);
      const searchIndex = useMemo(
        () => buildSearchIndex({ documents: searchableDocuments, profiles, cases: searchableCases, relationships: domain.relationships, actions }),
        [searchableDocuments, profiles, searchableCases, domain.relationships, actions, searchIndexRevision],
      );
      const resetAssistantContext = useCallback(() => setAssistantContext(emptySearchContext), []);
      const addAssistantExchange = useCallback((query: string, answer: string, intent: SearchIntent, resultIds: readonly string[], nextContext: SearchConversationContext) => {
        const createdAt = new Date().toISOString(); const base = Date.now();
        setAssistantMessages((current) => [...current,
          { id: `assistant-${base}-user`, role: 'user', text: query, createdAt, contextMode: nextContext.mode, documentId: nextContext.documentId, caseId: nextContext.caseId, resultIds },
          { id: `assistant-${base}-reply`, role: 'assistant', text: answer, createdAt, contextMode: nextContext.mode, documentId: nextContext.documentId, caseId: nextContext.caseId, resultIds },
        ]);
        setSearchHistory((current) => [{ id: `search-${base}`, query, createdAt, intent, resultIds }, ...current].slice(0, 100));
        setAssistantContext(nextContext);
      }, []);
      const clearAssistantConversation = useCallback(() => { setAssistantMessages([]); setAssistantContext(emptySearchContext); }, []);
      const clearSearchHistory = useCallback(() => setSearchHistory([]), []);
      const rebuildSearchIndex = useCallback(() => { setSearchIndexRevision((current) => current + 1); setSearchIndexRebuiltAt(new Date().toISOString()); }, []);

  const backupAdapter = useCallback(() => new GoogleDriveBackupAdapter({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI ?? 'documenta://oauth',
    hash: bytes => sha256Hex(bytes, platformCryptoProvider()),
  }), []);
  const backupIo = useCallback(() => ({
    readAsset: async (uri: string) => new File(uri).bytes(),
    writeAssets: async (assets: Readonly<Record<string, Uint8Array>>) => stageBackupAssetBytes(assets, platformCryptoProvider()),
    isCancelled: () => backupCancelled.current,
    onProgress: (progress: BackupProgress) => setBackup(current => ({ ...current, progress })),
    onAudit: (event: BackupAuditEvent) => setBackup(current => ({ ...current, audit: [event, ...current.audit].slice(0, 100) })),
    saveJournal: (interruptionJournal: BackupJournal) => setBackup(current => ({ ...current, interruptionJournal })),
  }), []);
  const backupSnapshot = useCallback((): StoredState => ({
    version: CURRENT_VERSION, checkIns, journalEntries, documents, profiles, tasks, settings,
    actionEngine: { schemaVersion: ACTION_ENGINE_SCHEMA_VERSION, actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules },
    conversations, conversationThreads, explanationStates, assistantContext, assistantMessages, searchHistory,
    searchIndexVersion: SEARCH_INDEX_VERSION, searchIndexRevision, searchIndexRebuiltAt, integrations, backup, ...domain,
  }), [checkIns, journalEntries, documents, profiles, tasks, settings, actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules, conversations, conversationThreads, explanationStates, assistantContext, assistantMessages, searchHistory, searchIndexRevision, searchIndexRebuiltAt, integrations, backup, domain]);
  const applyRestoredState = useCallback((raw: StoredState) => {
    const restoredProfiles = raw.profiles ?? [];
    const restoredDocuments = (raw.documents ?? []).map(document => migrateArchiveDocument({ ...document, lifecycle: document.lifecycle ?? 'aktiv', profileIds: migrateProfileIds(document.profileIds, document.person, restoredProfiles), fingerprint: document.fingerprint ?? documentFingerprint(document) }));
    const restoredActions = migrateActionEngineState(raw.actionEngine);
    // Credentials and device notification handles were stripped before backup. Imported
    // provider metadata remains visible but must be explicitly reconnected/rescheduled.
    const restoredIntegrations = migrateIntegrationState(raw.integrations);
    const reconnecting = {
      ...restoredIntegrations,
      emailAccounts: restoredIntegrations.emailAccounts.map(account => ({ ...account, connectionStatus: account.connectionStatus === 'connected' ? 'reconnect_required' as typeof account.connectionStatus : account.connectionStatus })),
      calendarAccounts: restoredIntegrations.calendarAccounts.map(account => ({ ...account, connectionStatus: account.connectionStatus === 'connected' ? 'permission_required' as typeof account.connectionStatus : account.connectionStatus })),
      notificationInstances: restoredIntegrations.notificationInstances.map(item => ({ ...item, status: 'unscheduled' as typeof item.status })),
    };
    setCheckIns(raw.checkIns ?? {}); setJournalEntries(raw.journalEntries ?? []); setDocuments(restoredDocuments); setProfiles(restoredProfiles); setTasks(raw.tasks ?? []);
    setSettings(migrateSettings(raw.settings)); setActions(mergeDerivedActions(restoredActions.actions, restoredDocuments)); setReminders(restoredActions.reminders); setFollowUps(restoredActions.followUps); setReplyDrafts(restoredActions.replyDrafts); setCalendarCandidates(restoredActions.calendarCandidates); setAutomationRules(restoredActions.automationRules);
    setConversations(raw.conversations ?? []); setConversationThreads(raw.conversationThreads ?? {}); setExplanationStates(raw.explanationStates ?? {}); setAssistantContext(raw.assistantContext ?? emptySearchContext); setAssistantMessages(raw.assistantMessages ?? []); setSearchHistory(raw.searchHistory ?? []);
    setSearchIndexRevision(Number(raw.searchIndexRevision ?? 0) + 1); setSearchIndexRebuiltAt(new Date().toISOString()); setIntegrations(reconnecting);
    setDomain({ ...blankCaseState, cases: raw.cases ?? [], relationships: raw.relationships ?? [], notifications: raw.notifications ?? [], activities: raw.activities ?? [], exportPackages: raw.exportPackages ?? [], security: disableUnenforcedSecurity({ ...defaultSecurity, ...raw.security }), onboarding: raw.onboarding ?? blankCaseState.onboarding, family: raw.family ?? blankCaseState.family, business: raw.business ?? blankCaseState.business, contracts: raw.contracts ?? [], recurringCosts: raw.recurringCosts ?? [], compareRecords: raw.compareRecords ?? [], demoEnabled: raw.demoEnabled ?? false });
  }, []);
  const connectGoogleDriveBackup = useCallback(async () => {
    const connected = await connectGoogleDriveBackupProvider();
    if (!connected.ok) {
      setBackup(current => ({ ...current, error: connected.message }));
      return;
    }
    const adapter = backupAdapter(); const candidate: CloudAccount = { id: connected.accountId, providerType: 'google_drive', displayName: connected.displayName || 'Google Drive', accountEmail: connected.emailAddress, status: 'permission_required', grantedScopes: connected.scope.split(/\s+/).filter(Boolean), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const status = await adapter.connectionStatus(candidate);
    if (!status.ok) { setBackup(current => ({ ...current, accounts: [candidate], error: status.message })); return; }
    setBackup(current => ({ ...current, accounts: [status.account], error: undefined }));
  }, [backupAdapter]);
  const disconnectGoogleDriveBackup = useCallback(async () => {
    const account = backup.accounts.find(item => item.providerType === 'google_drive'); if (!account) return;
    await backupAdapter().disconnect(account.id); setBackup(current => ({ ...current, accounts: current.accounts.filter(item => item.id !== account.id), snapshots: [], automatic: { ...current.automatic, enabled: false, foregroundOnly: true }, error: undefined }));
  }, [backup, backupAdapter]);
  const createCloudBackup = useCallback(async (passphrase: string) => {
    const account = backup.accounts.find(item => item.providerType === 'google_drive' && item.status === 'connected');
    if (!account) { setBackup(current => ({ ...current, error: 'Google Drive must be connected before creating a backup.' })); return; }
    if (!hasPremiumEntitlement(integrations.entitlement)) { setBackup(current => ({ ...current, error: 'Creating cloud backups requires premium access.' })); return; }
    automaticBackupPassphrase.current = passphrase;
    backupCancelled.current = false; const id = `backup-${Date.now()}`; setBackup(current => ({ ...current, error: undefined, progress: { ...current.progress, state: 'preparing', stage: 'snapshot' } }));
    try {
      const adapter = backupAdapter();
      const result = await createBackup({ state: backupSnapshot(), accountId: account.id, key: { passphrase }, adapter, crypto: platformCryptoProvider(), manifestId: id, priorManifest: undefined, policy: { retention: backup.automatic.retention } }, backupIo());
      await publishGoogleDriveSnapshot(adapter, account.id, result.manifest, { bytes: result.encryptedManifest }, []);
      const manifests = [...await adapter.list(account.id, 'manifests/')].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      await Promise.all(manifests.slice(backup.automatic.retention).map(item => adapter.remove?.(account.id, item.key)));
      automaticBackupDirty.current = false;
      setBackup(current => ({ ...current, snapshots: [{ manifestId: result.manifest.id, createdAt: result.manifest.createdAt, documentCount: documents.length, assetCount: result.manifest.files.length, byteSize: result.manifest.files.reduce((sum, file) => sum + file.byteSize, 0), owned: true, requiresEntitlement: false }, ...current.snapshots], latestSuccessfulBackupAt: new Date().toISOString(), progress: { ...current.progress, state: 'complete', stage: 'complete' }, interruptionJournal: undefined }));
    } catch (error) { setBackup(current => ({ ...current, error: error instanceof Error ? error.message : 'Backup failed.', progress: { ...current.progress, state: backupCancelled.current ? 'cancelled' : 'failed', stage: 'failed' } })); }
  }, [backup, integrations.entitlement, backupSnapshot, backupAdapter, backupIo, documents.length]);
  const cancelBackup = useCallback(() => { backupCancelled.current = true; }, []);
  const discoverBackupRestore = useCallback(async (passphrase: string) => {
    const account = backup.accounts.find(item => item.providerType === 'google_drive' && item.status === 'connected'); if (!account) return;
    try { const snapshots = await discoverBackupPreviews(account.id, backupAdapter(), { passphrase }, platformCryptoProvider(), hasPremiumEntitlement(integrations.entitlement)); setBackup(current => ({ ...current, snapshots, error: undefined })); } catch (error) { setBackup(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not discover backups.' })); }
  }, [backup, backupAdapter, integrations.entitlement]);
  const prepareCloudRestore = useCallback(async (manifestId: string, passphrase: string) => {
    const account = backup.accounts.find(item => item.providerType === 'google_drive' && item.status === 'connected'); if (!account) return;
    try { const plan = await prepareRestore({ accountId: account.id, manifestKey: `manifests/${manifestId}.dcbak`, key: { passphrase }, adapter: backupAdapter(), crypto: platformCryptoProvider(), localState: backupSnapshot(), entitled: hasPremiumEntitlement(integrations.entitlement), migrate: value => value as StoredState }, backupIo()); const manual = plan.conflicts.filter(conflict => conflict.resolution === 'manual_correction_required').length; pendingRestore.current = plan; setBackup(current => ({ ...current, restorePreview: { manifestId, conflicts: plan.conflicts.length, manualConflicts: manual, readyToCommit: !manual }, error: manual ? 'Restore has manual conflicts that must be resolved before it can replace local data.' : undefined })); } catch (error) { setBackup(current => ({ ...current, error: error instanceof Error ? error.message : 'Restore could not be prepared.' })); }
  }, [backup, backupAdapter, backupSnapshot, backupIo, integrations.entitlement]);
  const confirmCloudRestore = useCallback(async () => {
    const plan = pendingRestore.current; if (!plan || !backup.restorePreview?.readyToCommit) { setBackup(current => ({ ...current, error: 'Prepare a conflict-free restore before confirming.' })); return; }
    applyRestoredState(plan.relinkedState); pendingRestore.current = undefined; setBackup(current => ({ ...current, latestSuccessfulRestoreAt: new Date().toISOString(), restorePreview: undefined, error: undefined, progress: { ...current.progress, state: 'complete', stage: 'restored' }, interruptionJournal: undefined }));
  }, [backup.restorePreview, applyRestoredState]);
  const deleteCloudSnapshot = useCallback(async (manifestId: string) => {
    const account = backup.accounts.find(item => item.providerType === 'google_drive' && item.status === 'connected'); if (!account) return;
    await backupAdapter().remove?.(account.id, `manifests/${manifestId}.dcbak`); setBackup(current => ({ ...current, snapshots: current.snapshots.filter(item => item.manifestId !== manifestId) }));
  }, [backup, backupAdapter]);
  const exportLocalBackup = useCallback(async (passphrase: string) => {
    try { await shareLocalBackup(await createLocalBackupBundle(backupSnapshot(), { passphrase }, platformCryptoProvider())); } catch (error) { setBackup(current => ({ ...current, error: error instanceof Error ? error.message : 'Local export failed.' })); }
  }, [backupSnapshot]);
  const importLocalBackup = useCallback(async (passphrase: string) => {
    try {
      const bytes = await chooseLocalBackup(); if (!bytes) return;
      const bundle = await parseLocalBackupBundle<StoredState>(bytes, { passphrase }, platformCryptoProvider());
      const currentById = new Map(documents.map(item => [item.id, item]));
      const manualConflicts = (bundle.state.documents ?? []).filter(item => {
        const current = currentById.get(item.id);
        return current && canonicalizeManifest(current) !== canonicalizeManifest(item);
      }).length;
      if (manualConflicts) {
        setBackup(current => ({ ...current, error: `Local import has ${manualConflicts} manual document conflict(s); it was not applied.` }));
        return;
      }
      const urisByHash = await stageBackupAssets(bundle.assets, platformCryptoProvider());
      applyRestoredState(relinkLocalBundleState(bundle.state, bundle.assetReferences, urisByHash));
      setBackup(current => ({ ...current, latestSuccessfulRestoreAt: new Date().toISOString(), error: undefined }));
    } catch (error) { setBackup(current => ({ ...current, error: error instanceof Error ? error.message : 'Local import failed.' })); }
  }, [applyRestoredState, documents]);
  const updateBackupPolicy = useCallback((automatic: Partial<BackupAppState['automatic']>) => {
    setBackup(current => ({ ...current, automatic: { ...current.automatic, ...automatic } }));
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      appState.current = nextState;
      setIsForeground(nextState === 'active');
      if (nextState !== 'active' && automaticBackupTimer.current) {
        clearTimeout(automaticBackupTimer.current);
        automaticBackupTimer.current = undefined;
      }
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (hydrated) automaticBackupDirty.current = true;
  }, [hydrated, documents, profiles, tasks, actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules, conversations, conversationThreads, explanationStates, assistantMessages, searchHistory, settings, domain, integrations]);
  useEffect(() => {
    if (automaticBackupTimer.current) clearTimeout(automaticBackupTimer.current);
    const key = automaticBackupPassphrase.current;
    const connected = backup.accounts.some(item => item.providerType === 'google_drive' && item.status === 'connected');
    if (!hydrated || !isForeground || !automaticBackupDirty.current || !backup.automatic.enabled || !key || !connected || backup.progress.state === 'preparing' || backup.progress.state === 'uploading') return;
    automaticBackupTimer.current = setTimeout(() => {
      if (appState.current === 'active') void createCloudBackup(key);
    }, 30_000);
    return () => {
      if (automaticBackupTimer.current) clearTimeout(automaticBackupTimer.current);
    };
  }, [hydrated, isForeground, backup.automatic.enabled, backup.accounts, backup.progress.state, documents, profiles, tasks, actions, domain, integrations, createCloudBackup]);

  const value = useMemo(
    () => ({
       version: CURRENT_VERSION,
       checkIns,
      journalEntries,
      documents,
          profiles, tasks, settings,
       actionEngine, conversations, conversationThreads, explanationStates,
       assistantContext, assistantMessages, searchHistory, searchIndexVersion: SEARCH_INDEX_VERSION, searchIndexRevision, searchIndexRebuiltAt,
       integrations,
      hydrated,
      pendingAsset,
      toggleCheckIn,
      addJournalEntry,
      removeJournalEntry,
      addDocument,
          updateDocument, addProfile, renameProfile, addTask, toggleTask, updateTask, updateSettings, hasFeature: featureCheck,
      setPendingAsset,
      clearPendingAsset,
       ...domain, addCase, updateCase, addRelationship, markNotificationRead, addExportPackage,
       archiveDocument: (id: string) => setLifecycle(id, 'archiviert'), restoreDocument: (id: string) => setLifecycle(id, 'aktiv'), trashDocument: (id: string) => setLifecycle(id, 'papierkorb'), permanentlyDeleteDocument, updateSecurity, completeOnboarding, setDemoEnabled, addActivity,
        activeDocuments: domain.demoEnabled ? demoDocuments.map((demo) => documents.find((item) => item.id === demo.id) ?? demo) : selectActiveDocuments(documents), activeCases: domain.demoEnabled ? demoCases : domain.cases, activeTasks: domain.demoEnabled ? demoTasks : tasks, activeNotifications: domain.demoEnabled ? [] : domain.notifications, markGeneratedNotificationRead, addCompareRecord, addContract, addRecurringCost,
       actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules, activeActions,
        archiveIndex, timelineEvents, documentTimeline, caseTimeline,
        conversationForDocument, addConversationExchange, resetDocumentConversation, startNewDocumentConversation, explanationStateForDocument, updateExplanationState,
        searchIndex, setAssistantContext, resetAssistantContext, addAssistantExchange, clearAssistantConversation, clearSearchHistory, rebuildSearchIndex,
       addAction, updateAction, confirmAction, completeAction, reopenAction, cancelAction, rejectAction, archiveAction, editAction,
       addReminder, addFollowUp, addReplyDraft, addCalendarCandidate, addAutomationRule,
         activateTesterAccess, completeEmailConnection, updateEmailSyncRange, updateEmailConnectionStatus, addEmailMessages, prepareEmailConnection, disconnectEmailConnection, addEmailMessage, confirmEmailImport, addCalendarCandidateFromAction, confirmCalendarCandidate, setCalendarAccountTarget, persistCalendarEvent, addNotificationRule, createNotification, createNotificationForAction,
          backup, connectGoogleDriveBackup, disconnectGoogleDriveBackup, createCloudBackup, cancelBackup, discoverBackupRestore, prepareCloudRestore, confirmCloudRestore, deleteCloudSnapshot, exportLocalBackup, importLocalBackup, updateBackupPolicy,
    }),
    [
      checkIns,
      journalEntries,
      documents,
        profiles, tasks, settings, actionEngine, conversations, conversationThreads, explanationStates,
         assistantContext, assistantMessages, searchHistory, searchIndexRevision, searchIndexRebuiltAt, integrations,
      hydrated,
      pendingAsset,
      toggleCheckIn,
      addJournalEntry,
      removeJournalEntry,
      addDocument,
      updateDocument, addProfile, renameProfile, addTask, toggleTask, updateTask, updateSettings, featureCheck,
      clearPendingAsset,
        domain, addCase, updateCase, addRelationship, markNotificationRead, addExportPackage, setLifecycle, permanentlyDeleteDocument, updateSecurity, completeOnboarding, setDemoEnabled, addActivity, markGeneratedNotificationRead, addCompareRecord, addContract, addRecurringCost,
       actions, reminders, followUps, replyDrafts, calendarCandidates, automationRules, activeActions,
        archiveIndex, timelineEvents, documentTimeline, caseTimeline,
        conversationForDocument, addConversationExchange, resetDocumentConversation, startNewDocumentConversation, explanationStateForDocument, updateExplanationState,
        searchIndex, resetAssistantContext, addAssistantExchange, clearAssistantConversation, clearSearchHistory, rebuildSearchIndex,
         addAction, updateAction, confirmAction, completeAction, reopenAction, cancelAction, rejectAction, archiveAction, editAction, addReminder, addFollowUp, addReplyDraft, addCalendarCandidate, addAutomationRule, activateTesterAccess, completeEmailConnection, updateEmailSyncRange, updateEmailConnectionStatus, addEmailMessages, prepareEmailConnection, disconnectEmailConnection, addEmailMessage, confirmEmailImport, addCalendarCandidateFromAction, confirmCalendarCandidate, setCalendarAccountTarget, persistCalendarEvent, addNotificationRule, createNotification, createNotificationForAction,
          backup, connectGoogleDriveBackup, disconnectGoogleDriveBackup, createCloudBackup, cancelBackup, discoverBackupRestore, prepareCloudRestore, confirmCloudRestore, deleteCloudSnapshot, exportLocalBackup, importLocalBackup, updateBackupPolicy,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return context;
}