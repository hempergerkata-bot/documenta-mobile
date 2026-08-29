export const SUPPORTED_LANGUAGES = ['de', 'hu', 'en', 'ro', 'pl', 'sk', 'uk', 'tr', 'ar', 'cs', 'bg', 'hr', 'sr', 'it', 'fr'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: AppLanguage = 'de';
export type LanguageDirection = 'ltr' | 'rtl';
export type LanguageDefinition = {
  code: AppLanguage;
  nativeName: string;
  englishName: string;
  direction: LanguageDirection;
  locale: string;
  enabled: boolean;
};
export const LANGUAGE_REGISTRY: ReadonlyArray<LanguageDefinition> = [
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', direction: 'ltr', locale: 'de-DE', enabled: true },
  { code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian', direction: 'ltr', locale: 'hu-HU', enabled: true },
  { code: 'en', nativeName: 'English', englishName: 'English', direction: 'ltr', locale: 'en-US', enabled: true },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian', direction: 'ltr', locale: 'ro-RO', enabled: true },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', direction: 'ltr', locale: 'pl-PL', enabled: true },
  { code: 'sk', nativeName: 'Slovenčina', englishName: 'Slovak', direction: 'ltr', locale: 'sk-SK', enabled: true },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian', direction: 'ltr', locale: 'uk-UA', enabled: true },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', direction: 'ltr', locale: 'tr-TR', enabled: true },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', direction: 'rtl', locale: 'ar-SA', enabled: true },
  { code: 'cs', nativeName: 'Čeština', englishName: 'Czech', direction: 'ltr', locale: 'cs-CZ', enabled: true },
  { code: 'bg', nativeName: 'Български', englishName: 'Bulgarian', direction: 'ltr', locale: 'bg-BG', enabled: true },
  { code: 'hr', nativeName: 'Hrvatski', englishName: 'Croatian', direction: 'ltr', locale: 'hr-HR', enabled: true },
  { code: 'sr', nativeName: 'Srpski', englishName: 'Serbian', direction: 'ltr', locale: 'sr-RS', enabled: true },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', direction: 'ltr', locale: 'it-IT', enabled: true },
  { code: 'fr', nativeName: 'Français', englishName: 'French', direction: 'ltr', locale: 'fr-FR', enabled: true },
];
export const LANGUAGE_OPTIONS: ReadonlyArray<{ code: AppLanguage; label: string }> =
  LANGUAGE_REGISTRY.filter((language) => language.enabled).map(({ code, nativeName: label }) => ({ code, label }));
export const EXPLANATION_SUPPORTED_LANGUAGES = ['de', 'hu', 'en'] as const;
export type ExplanationSupportedLanguage = (typeof EXPLANATION_SUPPORTED_LANGUAGES)[number];
export const REPLY_SUPPORTED_LANGUAGES = ['de', 'hu', 'en'] as const;
export type ReplySupportedLanguage = (typeof REPLY_SUPPORTED_LANGUAGES)[number];

export function languageDefinition(language: AppLanguage): LanguageDefinition {
  return LANGUAGE_REGISTRY.find((item) => item.code === language) ?? LANGUAGE_REGISTRY[0];
}

export function languageLocale(language: AppLanguage): string {
  return languageDefinition(language).locale;
}

export function isRtlLanguage(language: AppLanguage): boolean {
  return languageDefinition(language).direction === 'rtl';
}

export function isExplanationLanguage(language: AppLanguage): language is ExplanationSupportedLanguage {
  return (EXPLANATION_SUPPORTED_LANGUAGES as readonly string[]).includes(language);
}

export function isReplyLanguage(language: AppLanguage): language is ReplySupportedLanguage {
  return (REPLY_SUPPORTED_LANGUAGES as readonly string[]).includes(language);
}

export type TranslationKey =
  | 'common.back'
  | 'common.cancel'
  | 'common.save'
  | 'common.close'
  | 'common.edit'
  | 'common.review'
  | 'common.accept'
  | 'common.reject'
  | 'common.complete'
  | 'common.next'
  | 'common.done'
  | 'common.unknown'
  | 'common.none'
  | 'common.documents'
  | 'common.cases'
  | 'common.tasks'
  | 'common.due'
  | 'common.language'
  | 'common.documentLanguage'
  | 'common.uncertain'
  | 'common.page'
  | 'common.pages'
  | 'common.status'
  | 'common.priority'
  | 'common.high'
  | 'common.medium'
  | 'common.low'
  | 'common.open'
  | 'common.loading'
  | 'common.error'
  | 'nav.home'
  | 'nav.documents'
  | 'nav.add'
  | 'nav.search'
  | 'nav.profile'
  | 'dashboard.kicker'
  | 'dashboard.title'
  | 'dashboard.subtitle'
  | 'dashboard.scan'
  | 'dashboard.import'
  | 'dashboard.actions'
  | 'dashboard.assistant'
  | 'dashboard.newDocuments'
  | 'dashboard.newDocumentsSubtitle'
  | 'dashboard.needsAction'
  | 'dashboard.needsActionSubtitle'
  | 'dashboard.upcomingDeadlines'
  | 'dashboard.upcomingDeadlinesSubtitle'
  | 'dashboard.payable'
  | 'dashboard.payableSubtitle'
  | 'dashboard.unresolvedCases'
  | 'dashboard.unresolvedCasesSubtitle'
  | 'dashboard.noItems'
  | 'documents.kicker'
  | 'documents.title'
  | 'documents.subtitle'
  | 'documents.all'
  | 'documents.emptyTitle'
  | 'documents.emptyText'
  | 'documents.add'
  | 'documents.optimizedPdf'
  | 'documents.original'
  | 'document.title'
  | 'document.type'
  | 'document.sender'
  | 'document.date'
  | 'document.amount'
  | 'document.deadline'
  | 'document.language'
  | 'document.languageUnknown'
  | 'document.ocrText'
  | 'document.noOcr'
  | 'document.noDocument'
  | 'document.archive'
  | 'document.trash'
  | 'document.restore'
  | 'document.explain'
  | 'document.relationship'
  | 'document.noOriginal'
  | 'intelligence.title'
  | 'intelligence.review'
  | 'intelligence.evidenced'
  | 'intelligence.humanReview'
  | 'intelligence.pending'
  | 'intelligence.reviewFields'
  | 'intelligence.risk'
  | 'intelligence.evidence'
  | 'intelligence.whatItMeans'
  | 'intelligence.noAnalysis'
  | 'intelligence.explanationUnsupported'
  | 'review.needsReview'
  | 'review.accepted'
  | 'review.rejected'
  | 'review.pending'
  | 'action.center'
  | 'action.title'
  | 'action.open'
  | 'action.toReview'
  | 'action.reminders'
  | 'action.drafts'
  | 'action.emptyTitle'
  | 'action.emptyText'
  | 'action.ownTask'
  | 'action.statusSuggested'
  | 'action.statusNeedsReview'
  | 'action.statusConfirmed'
  | 'action.statusInProgress'
  | 'action.statusWaiting'
  | 'action.statusCompleted'
  | 'action.statusCancelled'
  | 'action.statusRejected'
  | 'action.statusArchived'
  | 'action.detail'
  | 'action.history'
  | 'action.confirm'
  | 'action.reopen'
  | 'action.cancel'
  | 'action.archive'
  | 'action.source'
  | 'action.evidence'
  | 'action.noEvidence'
  | 'action.completeBlocked'
  | 'automation.title'
  | 'automation.subtitle'
  | 'automation.localOnly'
  | 'automation.noRules'
  | 'automation.reminderRule'
  | 'automation.candidates'
  | 'automation.noCandidates'
  | 'cases.title'
  | 'cases.subtitle'
  | 'cases.new'
  | 'cases.empty'
  | 'cases.closureSafe'
  | 'cases.closureBlocked'
  | 'reply.title'
  | 'reply.language'
  | 'reply.sourceFacts'
  | 'reply.editedWarning'
  | 'reply.recipient'
  | 'reply.subject'
  | 'reply.body'
  | 'reply.generate'
  | 'reply.regenerateTitle'
  | 'reply.regenerateMessage'
  | 'reply.unsupportedLanguage'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.appearance'
  | 'settings.appLanguage'
  | 'settings.appLanguageHint'
  | 'settings.explanationLanguage'
  | 'settings.explanationLanguageHint'
  | 'settings.replyLanguage'
  | 'settings.replyLanguageHint'
  | 'settings.theme'
  | 'settings.accent'
  | 'settings.fontSize'
  | 'settings.explanationMode'
  | 'settings.languageNames'
  | 'settings.adapterSupported'
  | 'settings.adapterUnsupported'
  | 'settings.region' | 'settings.regionHint' | 'settings.countrySearch' | 'settings.countryUnknown'
  | 'settings.translationMode' | 'settings.translationAutomatic' | 'settings.translationAskFirst' | 'settings.translationOff'
  | 'settings.explanationDisplayMode' | 'settings.explanationText' | 'settings.explanationVoice' | 'settings.explanationTextVoice'
  | 'settings.voiceHint'
  | 'settings.voiceSelection' | 'settings.voiceRefresh' | 'settings.voicePreview' | 'settings.voiceAutomatic' | 'settings.voiceNone' | 'settings.voiceQuality'
  | 'onboarding.welcome'
  | 'onboarding.profile'
  | 'onboarding.appLanguage'
  | 'onboarding.explanations'
  | 'onboarding.reply'
  | 'onboarding.privacy'
  | 'onboarding.modules'
  | 'onboarding.step'
  | 'onboarding.name'
  | 'onboarding.finish'
  | 'onboarding.next'
  | 'onboarding.subtitle'
  | 'onboarding.privacyText'
  | 'onboarding.modulesText'
  | 'onboarding.country' | 'onboarding.countryPrompt' | 'onboarding.languagePrompt' | 'onboarding.explanationPrompt'
  | 'onboarding.translationMode' | 'onboarding.translationPrompt' | 'onboarding.replyPrompt'
  | 'onboarding.noUselessTranslation' | 'onboarding.explanationIndependent'
  | 'explanation.localKicker' | 'explanation.available' | 'explanation.unavailable' | 'explanation.needsReview'
  | 'explanation.generated' | 'explanation.translationState' | 'explanation.noTranslation' | 'explanation.translationReady'
  | 'explanation.translationAsk' | 'explanation.translationDisabled' | 'explanation.translationUnavailable' | 'explanation.ask' | 'explanation.placeholder'
  | 'explanation.history' | 'explanation.clearHistory' | 'explanation.newConversation' | 'explanation.sources'
  | 'explanation.sourceField' | 'explanation.confidence' | 'explanation.unsupportedQuestion' | 'explanation.localOnly'
  | 'explanation.voiceTitle' | 'explanation.voiceReadsText' | 'explanation.play' | 'explanation.pause'
  | 'explanation.resume' | 'explanation.stop' | 'explanation.restart' | 'explanation.voiceUnavailable'
  | 'search.title'
  | 'search.placeholder'
  | 'search.clear'
  | 'search.profile'
  | 'search.category'
  | 'search.type'
  | 'search.count'
  | 'error.notFound'
  | 'error.noReadableOcr'
  | 'common.version'
  | 'document.sampleNoOriginal'
  | 'document.task'
  | 'document.share'
  | 'document.print'
  | 'document.relationships'
  | 'document.relatedCases'
  | 'document.documentRelationships'
  | 'document.linkToCase'
  | 'document.createRelationship'
  | 'document.saveRelationship'
  | 'document.details'
  | 'document.category'
  | 'document.subcategory'
  | 'document.payrollPeriod'
  | 'document.person'
  | 'document.profiles'
  | 'document.tags'
  | 'document.note'
  | 'document.localOcr'
  | 'document.ocrRecognized'
  | 'document.uncertainFieldsReviewed'
  | 'document.edit'
  | 'document.dueDate'
  | 'document.tagsHint'
  | 'document.assignedProfiles'
  | 'document.saveChanges'
  | 'document.actionUnavailable'
  | 'document.tryAgain'
  | 'document.referenceNumber'
  | 'document.customerNumber'
  | 'document.invoiceNumber'
  | 'document.contractNumber'
  | 'document.insuranceNumber'
  | 'document.taxNumber'
  | 'document.patientNumber'
  | 'document.schoolReference'
  | 'document.relationshipPrevious'
  | 'document.relationshipReply'
  | 'document.relationshipReminder'
  | 'document.relationshipPayment'
  | 'document.relationshipCompletion'
  | 'intelligence.purpose'
  | 'intelligence.recipient'
  | 'intelligence.coreData'
  | 'intelligence.whatIsIt'
  | 'intelligence.whatToDo'
  | 'intelligence.byWhen'
  | 'intelligence.howMuch'
  | 'intelligence.ifNoAction'
  | 'intelligence.options'
  | 'intelligence.noConsequence'
  | 'intelligence.noOption'
  | 'intelligence.nextDeadline'
  | 'intelligence.nextStep'
  | 'intelligence.warningConsequence'
  | 'intelligence.mostImportant'
  | 'error.title'
  | 'error.missingScreen'
  | 'error.goHome'
  | 'assistant.kicker'
  | 'assistant.title'
  | 'assistant.available'
  | 'assistant.unavailable'
  | 'assistant.promptDeadlines'
  | 'assistant.promptReview'
  | 'assistant.promptInvoices'
  | 'assistant.placeholder'
  | 'assistant.ask'
  | 'assistant.results'
  | 'assistant.noResults'
  | 'assistant.localOnly'
  | 'assistant.scopeAll' | 'assistant.scopeDocument' | 'assistant.scopeCase' | 'assistant.resetContext'
  | 'assistant.semanticLocal' | 'assistant.history' | 'assistant.clearHistory' | 'assistant.clearConversation'
  | 'assistant.rebuildIndex' | 'assistant.indexReady' | 'assistant.archived' | 'assistant.why'
  | 'assistant.openDocument' | 'assistant.openCase' | 'assistant.openExplanation' | 'assistant.openTasks'
  | 'assistant.moreResults' | 'assistant.ambiguousTitle' | 'assistant.ambiguousText' | 'assistant.zeroResult'
  | 'assistant.missingInformation' | 'assistant.suggestedQuestions' | 'assistant.questionSummary'
  | 'assistant.questionDeadline' | 'assistant.questionAction' | 'assistant.questionRelated'
  | 'assistant.questionChange' | 'assistant.questionUncertainty' | 'assistant.confidence'
  | 'assistant.resultDocuments' | 'assistant.resultCases' | 'assistant.resultActions'
  | 'assistant.foundDocument' | 'assistant.foundCase' | 'assistant.noConfirmedDeadline'
  | 'assistant.noConfirmedAction' | 'assistant.confirmedDeadline' | 'assistant.confirmedAction'
  | 'assistant.localIndex' | 'assistant.resultReason'
  | 'journal.eyebrow' | 'journal.title' | 'journal.intro' | 'journal.placeholder' | 'journal.characters'
  | 'journal.private' | 'journal.save' | 'journal.previous' | 'journal.emptyTitle' | 'journal.emptyText' | 'journal.deleteHint'
  | 'add.kicker' | 'add.title' | 'add.intro' | 'add.source' | 'add.scanning' | 'add.scanFeatures' | 'add.image' | 'add.gallery' | 'add.files' | 'add.devBuild' | 'add.privateTitle' | 'add.privateText' | 'add.emailTitle' | 'add.emailText' | 'add.browserScanner' | 'add.expoScanner' | 'add.scannerError' | 'add.closeNotice'
  | 'scan.empty' | 'scan.cancel' | 'scan.kicker' | 'scan.preview' | 'scan.processed' | 'scan.variantTitle' | 'scan.variantHint' | 'scan.original' | 'scan.clean' | 'scan.blackWhite' | 'scan.rescan' | 'scan.remove' | 'scan.nativeTitle' | 'scan.nativeText' | 'scan.addPage' | 'scan.creating' | 'scan.create' | 'scan.createSubtitle' | 'scan.opening' | 'scan.enhancing' | 'scan.recognizing' | 'scan.limit' | 'scan.openError' | 'scan.lastPageTitle' | 'scan.lastPageText'
  | 'details.kicker' | 'details.assetSelected' | 'details.assetReady' | 'details.noAsset' | 'details.scannedMeta' | 'details.analysisComplete' | 'details.noText' | 'details.analysisUnavailable' | 'details.analysisCompleteText' | 'details.analysisManualText' | 'details.requiredHint' | 'details.titleHint' | 'details.uncertainHint' | 'details.unresolvedHint' | 'details.senderInstitution' | 'details.documentDate' | 'details.optional' | 'details.person' | 'details.personPlaceholder' | 'details.saving' | 'details.save' | 'details.duplicateTitle' | 'details.duplicateText' | 'details.saveAnyway' | 'details.fileSaveError' | 'details.iban'
  | 'archive.title' | 'archive.retention' | 'archive.archiveEmpty' | 'archive.trashEmpty' | 'archive.moveToTrash' | 'archive.moveTitle' | 'archive.moveText' | 'archive.deleteTitle' | 'archive.deleteText' | 'archive.deleteForever' | 'archive.move'
  | 'archive.subtitle' | 'archive.yearOverview' | 'archive.currentYear' | 'archive.previousYear' | 'archive.lastThreeYears' | 'archive.allYears' | 'archive.unknownYear' | 'archive.olderYears' | 'archive.documentsCount' | 'archive.searchPlaceholder' | 'archive.reviewQueue' | 'archive.reviewHint' | 'archive.bulkAccept' | 'archive.bulkBlocked' | 'archive.archiveYear' | 'archive.receivedDate' | 'archive.importedAt' | 'archive.relevantPeriod' | 'archive.manual' | 'archive.automatic' | 'archive.duplicateWarning' | 'archive.sameDocument' | 'archive.separateDocument' | 'archive.dontKnow' | 'archive.later' | 'archive.noResults' | 'archive.month'
  | 'timeline.title' | 'timeline.documentCreated' | 'timeline.documentReceived' | 'timeline.documentImported' | 'timeline.deadlineDetected' | 'timeline.actionCreated' | 'timeline.actionCompleted' | 'timeline.actionStatusChanged' | 'timeline.reviewAccepted' | 'timeline.reviewCorrected' | 'timeline.replyDraft' | 'timeline.followUp' | 'timeline.relationshipCreated' | 'timeline.caseOpened' | 'timeline.caseStatusChanged' | 'timeline.caseClosed' | 'timeline.caseHistory'
  | 'activity.title' | 'activity.subtitle' | 'activity.empty'
  | 'notifications.title' | 'notifications.empty'
  | 'export.title' | 'export.hint' | 'export.activeDocuments' | 'export.noDocuments' | 'export.recipient' | 'export.case' | 'export.toc' | 'export.order' | 'export.noCase' | 'export.save'
  | 'security.title' | 'security.biometric' | 'security.pin' | 'security.sensitive' | 'security.cloud' | 'security.gmail' | 'security.ai' | 'security.autoLock' | 'security.retention' | 'security.audit' | 'security.auditText' | 'security.profilesAccess'
  | 'backup.title' | 'backup.privacy' | 'backup.drive' | 'backup.connected' | 'backup.disconnected' | 'backup.connect' | 'backup.disconnect' | 'backup.configuration' | 'backup.prepared' | 'backup.passphrase' | 'backup.passphraseHint' | 'backup.create' | 'backup.cancel' | 'backup.automatic' | 'backup.foreground' | 'backup.discover' | 'backup.snapshots' | 'backup.documentsAssets' | 'backup.prepareRestore' | 'backup.conflicts' | 'backup.confirmRestore' | 'backup.delete' | 'backup.deleteTitle' | 'backup.deleteMessage' | 'backup.export' | 'backup.import' | 'backup.latestBackup' | 'backup.latestRestore' | 'backup.newPhone' | 'backup.newPhoneText' | 'backup.noSnapshots'
  | 'modules.title' | 'modules.status'
  | 'workspaces.title' | 'workspaces.hint' | 'workspaces.family' | 'workspaces.business'
  | 'contracts.title' | 'contracts.create' | 'contracts.costCreate' | 'contracts.monitor' | 'contracts.none' | 'contracts.costs' | 'contracts.noCosts' | 'contracts.requiredContract' | 'contracts.requiredCost' | 'contracts.saveContract' | 'contracts.saveCost' | 'contracts.automaticRenewal' | 'contracts.fieldTitle' | 'contracts.fieldProvider' | 'contracts.fieldDocument' | 'contracts.fieldStartDate' | 'contracts.fieldEndDate' | 'contracts.fieldCancellationNotice' | 'contracts.fieldNextCancellationDate' | 'contracts.fieldMonthlyFee' | 'contracts.fieldYearlyFee' | 'contracts.fieldNextCharge' | 'contracts.fieldContract' | 'contracts.fieldCategory' | 'contracts.statusActive' | 'contracts.statusReview' | 'contracts.statusEnded' | 'contracts.statusCancelled' | 'contracts.cadenceMonthly' | 'contracts.cadenceYearly'
  | 'compare.title' | 'compare.hint' | 'compare.comparison' | 'compare.unavailable' | 'compare.save' | 'compare.history' | 'compare.empty' | 'compare.amount' | 'compare.deadline' | 'compare.type';

type TranslationDictionary = Record<TranslationKey, string>;

const de: TranslationDictionary = {
  'common.back': 'Zurück', 'common.cancel': 'Abbrechen', 'common.save': 'Speichern', 'common.close': 'Schließen',
  'common.edit': 'Bearbeiten', 'common.review': 'Prüfen', 'common.accept': 'Annehmen', 'common.reject': 'Ablehnen',
  'common.complete': 'Erledigen', 'common.next': 'Weiter', 'common.done': 'Fertig', 'common.unknown': 'Unbekannt',
  'common.none': 'Keine', 'common.documents': 'Dokumente', 'common.cases': 'Fälle', 'common.tasks': 'Aufgaben',
  'common.due': 'Fällig', 'common.language': 'Sprache', 'common.documentLanguage': 'Dokumentensprache',
  'common.uncertain': 'Unsicher', 'common.page': 'Seite', 'common.pages': 'Seiten', 'common.status': 'Status',
  'common.priority': 'Priorität', 'common.high': 'hoch', 'common.medium': 'mittel', 'common.low': 'niedrig',
  'common.open': 'offen', 'common.loading': 'Wird geladen …', 'common.error': 'Fehler',
  'nav.home': 'Start', 'nav.documents': 'Dokumente', 'nav.add': 'Hinzufügen', 'nav.search': 'Suche', 'nav.profile': 'Profil',
  'dashboard.kicker': 'DOCUMENTA', 'dashboard.title': 'Übersicht', 'dashboard.subtitle': 'Deine lokalen Dokumente und Aufgaben.',
  'dashboard.scan': 'Scannen', 'dashboard.import': 'Importieren', 'dashboard.actions': 'Aufgaben',
  'dashboard.assistant': 'Assistent', 'dashboard.newDocuments': 'Neue Dokumente', 'dashboard.newDocumentsSubtitle': 'Neue Eingänge',
  'dashboard.needsAction': 'Handlungsbedarf', 'dashboard.needsActionSubtitle': 'Dokumente und Fälle mit offenen Schritten',
  'dashboard.upcomingDeadlines': 'Anstehende Fristen', 'dashboard.upcomingDeadlinesSubtitle': 'In den nächsten sieben Tagen',
  'dashboard.payable': 'Zahlbar', 'dashboard.payableSubtitle': 'Dokumente mit Zahlungsstatus',
  'dashboard.unresolvedCases': 'Ungelöste Fälle', 'dashboard.unresolvedCasesSubtitle': 'Noch nicht abgeschlossen',
  'dashboard.noItems': 'Keine Einträge in dieser Ansicht',
  'documents.kicker': 'ABLAGE', 'documents.title': 'Dokumente', 'documents.subtitle': '{count} Dokumente an einem Ort',
  'documents.all': 'Alle', 'documents.emptyTitle': 'Keine Dokumente hier',
  'documents.emptyText': 'Ändere den Filter oder füge ein neues Dokument hinzu.', 'documents.add': 'Dokument hinzufügen',
  'documents.optimizedPdf': 'Optimierte PDF', 'documents.original': 'Original',
  'document.title': 'Dokument', 'document.type': 'Dokumenttyp', 'document.sender': 'Absender', 'document.date': 'Datum',
  'document.amount': 'Betrag', 'document.deadline': 'Frist', 'document.language': 'Dokumentensprache',
  'document.languageUnknown': 'Unsicher', 'document.ocrText': 'OCR-Text', 'document.noOcr': 'Kein lesbarer OCR-Text vorhanden.',
  'document.noDocument': 'Dokument nicht gefunden.', 'document.archive': 'Archiv', 'document.trash': 'Papierkorb',
  'document.restore': 'Wiederherstellen', 'document.explain': 'Dokument erklären', 'document.relationship': 'Beziehung hinzufügen',
  'document.noOriginal': 'Kein Originalbild verfügbar.', 'intelligence.title': 'Lokale Dokumentintelligenz',
  'intelligence.review': 'Prüfen', 'intelligence.evidenced': 'Belegt', 'intelligence.humanReview': 'Menschliche Prüfung erforderlich',
  'intelligence.pending': 'kritische Angaben müssen geprüft werden.', 'intelligence.reviewFields': 'Felder prüfen',
  'intelligence.risk': 'Risiko', 'intelligence.evidence': 'Beleg', 'intelligence.whatItMeans': 'Was bedeutet das?',
  'intelligence.noAnalysis': 'Keine lokale Analyse vorhanden. Für dieses Dokument wurde kein lesbarer OCR-Text gespeichert.',
  'intelligence.explanationUnsupported': 'Für diese Sprache ist noch kein sicherer, deterministischer Erklärungsadapter verfügbar. Die strukturierten Dokumentdaten bleiben unverändert.',
  'review.needsReview': 'Prüfung erforderlich', 'review.accepted': 'Akzeptiert', 'review.rejected': 'Abgelehnt', 'review.pending': 'Ausstehend',
  'action.center': 'ACTION CENTER', 'action.title': 'Aufgaben & nächste Schritte', 'action.open': 'offen', 'action.toReview': 'zu prüfen',
  'action.reminders': 'Erinnerungen', 'action.drafts': 'Entwürfe', 'action.emptyTitle': 'Keine Aufgaben in dieser Ansicht',
  'action.emptyText': 'Belegte Vorschläge erscheinen automatisch. Unsichere Daten bleiben zur Prüfung markiert.',
  'action.ownTask': 'Eigene Aufgabe', 'action.statusSuggested': 'Vorschlag', 'action.statusNeedsReview': 'Prüfen',
  'action.statusConfirmed': 'Bestätigt', 'action.statusInProgress': 'In Bearbeitung', 'action.statusWaiting': 'Wartend',
  'action.statusCompleted': 'Erledigt', 'action.statusCancelled': 'Abgebrochen', 'action.statusRejected': 'Abgelehnt',
  'action.statusArchived': 'Archiviert', 'action.detail': 'Details', 'action.history': 'Verlauf', 'action.confirm': 'Bestätigen',
  'action.reopen': 'Wieder öffnen', 'action.cancel': 'Abbrechen', 'action.archive': 'Archivieren', 'action.source': 'Quelle',
  'action.evidence': 'Beleg', 'action.noEvidence': 'Kein Beleg verknüpft.', 'action.completeBlocked': 'Vor dem Erledigen muss der Vorschlag bestätigt werden.',
  'automation.title': 'Automatisierung', 'automation.subtitle': 'Lokale Regeln und sichere Kandidaten',
  'automation.localOnly': 'Nur lokal: Es werden keine E-Mails gesendet, Zahlungen ausgeführt oder Cloud-Dienste aktiviert.',
  'automation.noRules': 'Noch keine Regeln vorhanden.', 'automation.reminderRule': 'Sichere Erinnerungsregel hinzufügen',
  'automation.candidates': 'Kandidaten', 'automation.noCandidates': 'Keine offenen Kandidaten.',
  'cases.title': 'Fälle', 'cases.subtitle': 'Fälle bündeln Dokumente, Fristen und nächste Schritte.', 'cases.new': 'Neuen Fall anlegen',
  'cases.empty': 'Noch keine Fälle. Lege einen Fall für zusammengehörige Unterlagen an.', 'cases.closureSafe': 'Fall kann sicher geschlossen werden.',
  'cases.closureBlocked': 'Fall kann noch nicht geschlossen werden.', 'reply.title': 'Antwortentwurf', 'reply.language': 'Antwortsprache',
  'reply.sourceFacts': 'Verwendete Quelldaten', 'reply.editedWarning': 'Der manuell bearbeitete Entwurf wird nicht automatisch überschrieben.',
  'reply.recipient': 'Empfänger', 'reply.subject': 'Betreff', 'reply.body': 'Nachricht', 'reply.generate': 'Entwurf in dieser Sprache erstellen',
  'reply.regenerateTitle': 'Bearbeiteten Entwurf ersetzen?', 'reply.regenerateMessage': 'Deine manuellen Änderungen bleiben erhalten, bis du die Neuerstellung ausdrücklich bestätigst.',
  'reply.unsupportedLanguage': 'Für diese Sprache ist noch kein sicherer Antwortadapter verfügbar. Der vorhandene Entwurf wird nicht verändert.',
  'settings.title': 'Einstellungen', 'settings.subtitle': 'Deine Darstellung wird sofort in Documenta angewendet.',
  'settings.appearance': 'Darstellung & Sprache', 'settings.appLanguage': 'Anwendungssprache',
  'settings.appLanguageHint': 'Sprache der gesamten Documenta-Oberfläche.', 'settings.explanationLanguage': 'Erklärungssprache',
  'settings.explanationLanguageHint': 'Sprache der verständlichen Document-Intelligence-Erklärungen.',
  'settings.replyLanguage': 'Antwortsprache', 'settings.replyLanguageHint': 'Sprache für neue Antwortentwürfe; unabhängig von Dokument und Oberfläche.',
  'settings.theme': 'Darstellung', 'settings.accent': 'Akzentfarbe', 'settings.fontSize': 'Schriftgröße',
  'settings.explanationMode': 'Erklärungsmodus', 'settings.languageNames': 'Deutsch',
  'settings.adapterSupported': 'Adapter verfügbar', 'settings.adapterUnsupported': 'Adapter noch nicht verfügbar', 'onboarding.welcome': 'Willkommen',
  'settings.region':'Land / Region','settings.regionHint':'Ändert nur zukünftige regionale Vorgaben; vorhandene Dokumente bleiben unverändert.','settings.countrySearch':'Land suchen','settings.countryUnknown':'Noch nicht festgelegt',
  'settings.translationMode':'Übersetzungsmodus','settings.translationAutomatic':'Automatisch, wenn nötig','settings.translationAskFirst':'Vorher fragen','settings.translationOff':'Aus',
  'settings.explanationDisplayMode':'Erklärungsdarstellung','settings.explanationText':'Text','settings.explanationVoice':'Stimme','settings.explanationTextVoice':'Text und Stimme','settings.voiceHint':'Die Stimme liest die bereits erstellte Erklärung vor.','settings.voiceSelection':'Lokale Stimme','settings.voiceRefresh':'Stimmen aktualisieren','settings.voicePreview':'Stimme testen','settings.voiceAutomatic':'Automatisch wählen','settings.voiceNone':'Keine passende lokale Stimme','settings.voiceQuality':'Qualität',
  'onboarding.profile': 'Profil', 'onboarding.appLanguage': 'App-Sprache', 'onboarding.explanations': 'Erklärungen',
  'onboarding.reply': 'Antworten', 'onboarding.privacy': 'Datenschutz', 'onboarding.modules': 'Module',
  'onboarding.step': 'SCHRITT {current}/{total}', 'onboarding.name': 'Dein Name', 'onboarding.finish': 'Einrichtung abschließen',
  'onboarding.next': 'Weiter', 'onboarding.subtitle': 'Documenta organisiert deine Unterlagen lokal und übersichtlich.',
  'onboarding.privacyText': 'Lokale Speicherung und optionale Datenschutz-Einstellungen werden jetzt vorbereitet.',
  'onboarding.modulesText': 'Gmail, Voice, Calendar, Tax, Family, Business und Enterprise sind deaktivierte Coming-Soon-Module.',
  'onboarding.country':'Land / Region','onboarding.countryPrompt':'In welchem Land lebst du?','onboarding.languagePrompt':'In welcher Sprache möchtest du Documenta verwenden?','onboarding.explanationPrompt':'In welcher Sprache möchtest du Erklärungen?','onboarding.translationMode':'Übersetzungen','onboarding.translationPrompt':'Wann soll Documenta eine Übersetzung vorbereiten?','onboarding.replyPrompt':'In welcher Sprache möchtest du Antworten verfassen?','onboarding.noUselessTranslation':'Wenn das Dokument bereits dieselbe Sprache hat, wird es nicht unnötig übersetzt.','onboarding.explanationIndependent':'Eine Erklärung kannst du unabhängig davon jederzeit anfordern.',
  'explanation.localKicker':'LOKALE DOKUMENTERKLÄRUNG','explanation.available':'Erklärung verfügbar','explanation.unavailable':'Für diese Sprache ist keine sichere Erklärung verfügbar.','explanation.needsReview':'Vor der Erklärung müssen unsichere Angaben geprüft werden.','explanation.generated':'Erklärung erstellt','explanation.translationState':'Übersetzung','explanation.noTranslation':'Nicht erforderlich','explanation.translationReady':'Lokale Übersetzung erforderlich','explanation.translationAsk':'Bestätigung erforderlich','explanation.translationDisabled':'Deaktiviert','explanation.translationUnavailable':'Keine lokale Übersetzung verfügbar','explanation.ask':'Frage stellen','explanation.placeholder':'Frage zu diesem Dokument','explanation.history':'Fragen und Antworten','explanation.clearHistory':'Verlauf löschen','explanation.newConversation':'Neue Unterhaltung','explanation.sources':'Quellen','explanation.sourceField':'Quellfeld','explanation.confidence':'Sicherheit','explanation.unsupportedQuestion':'Diese Frage kann ich aus diesem Dokument derzeit nicht sicher beantworten.','explanation.localOnly':'Nur dieses Dokument und ausdrücklich verknüpfte, bestätigte Falldaten werden lokal verwendet.','explanation.voiceTitle':'Erklärung vorlesen','explanation.voiceReadsText':'Die Stimme liest die Erklärung, nicht das Originaldokument.','explanation.play':'Abspielen','explanation.pause':'Pause','explanation.resume':'Fortsetzen','explanation.stop':'Stoppen','explanation.restart':'Neu starten','explanation.voiceUnavailable':'Auf diesem Gerät ist keine passende lokale Stimme verfügbar. Die Texterklärung bleibt verfügbar.',
  'search.title': 'Suche', 'search.placeholder': 'Titel, Absender, Profil, Kategorie …', 'search.clear': 'Alle Filter löschen',
  'search.profile': 'Profile', 'search.category': 'Kategorie', 'search.type': 'Dokumenttyp', 'search.count': '{documents} Dokumente · {cases} Fälle · {tasks} Aufgaben',
  'error.notFound': 'Nicht gefunden.', 'error.noReadableOcr': 'Kein lesbarer OCR-Text gespeichert.',
  'common.version': 'Version',
  'document.sampleNoOriginal': 'Dieses Beispieldokument wurde ohne Bild oder PDF gespeichert.', 'document.task': 'Aufgabe',
  'document.share': 'Teilen', 'document.print': 'Drucken', 'document.relationships': 'Verknüpfungen',
  'document.relatedCases': 'Zugehörige Fälle', 'document.documentRelationships': 'Dokumentbeziehungen',
  'document.linkToCase': 'Mit Fall verknüpfen', 'document.createRelationship': 'Beziehung erstellen',
  'document.saveRelationship': 'Beziehung speichern', 'document.details': 'Dokumentdetails', 'document.category': 'Kategorie',
  'document.subcategory': 'Unterkategorie', 'document.payrollPeriod': 'Abrechnungszeitraum', 'document.person': 'Person',
  'document.profiles': 'Profile', 'document.tags': 'Tags', 'document.note': 'Notiz', 'document.localOcr': 'Lokale OCR',
  'document.ocrRecognized': '{count} Zeichen erkannt', 'document.uncertainFieldsReviewed': '{count} unsichere Felder geprüft',
  'document.edit': 'Dokument bearbeiten', 'document.dueDate': 'Fälligkeitsdatum', 'document.tagsHint': 'Tags (Komma getrennt)',
  'document.assignedProfiles': 'Zugeordnete Profile', 'document.saveChanges': 'Änderungen speichern',
  'document.actionUnavailable': 'Aktion nicht möglich', 'document.tryAgain': 'Bitte versuche es erneut.',
  'document.referenceNumber': 'Aktenzeichen / Referenz', 'document.customerNumber': 'Kundennummer',
  'document.invoiceNumber': 'Rechnungsnummer', 'document.contractNumber': 'Vertragsnummer',
  'document.insuranceNumber': 'Versicherungsnummer', 'document.taxNumber': 'Steuernummer / Steuer-ID',
  'document.patientNumber': 'Patienten- / Fallnummer', 'document.schoolReference': 'Schul- / Betreuungsreferenz',
  'document.relationshipPrevious': 'vorheriges Dokument', 'document.relationshipReply': 'Antwort',
  'document.relationshipReminder': 'Erinnerung', 'document.relationshipPayment': 'Zahlung', 'document.relationshipCompletion': 'Abschluss',
  'intelligence.purpose': 'Zweck', 'intelligence.recipient': 'Empfänger', 'intelligence.coreData': 'Erkannte Kerndaten',
  'intelligence.whatIsIt': 'Was ist das?', 'intelligence.whatToDo': 'Was muss ich tun?', 'intelligence.byWhen': 'Bis wann?',
  'intelligence.howMuch': 'Wie viel?', 'intelligence.ifNoAction': 'Was passiert, wenn ich nichts tue?',
  'intelligence.options': 'Welche Möglichkeiten habe ich?', 'intelligence.noConsequence': 'Keine ausdrücklich belegte Folge erkannt.',
  'intelligence.noOption': 'Keine ausdrücklich belegte Möglichkeit erkannt.', 'intelligence.nextDeadline': 'Nächste Frist',
  'intelligence.nextStep': 'Nächster Schritt', 'intelligence.warningConsequence': 'Warnung / Konsequenz',
  'intelligence.mostImportant': 'Das Wichtigste',
  'error.title': 'Nicht gefunden', 'error.missingScreen': 'Dieser Bildschirm existiert nicht.', 'error.goHome': 'Zur Startseite',
  'assistant.kicker': 'LOKALER ASSISTENT', 'assistant.title': 'Frag Documenta',
  'assistant.available': 'Lokale, belegbasierte Datenabfrage bereit.', 'assistant.unavailable': 'Lokale Basisabfragen sind verfügbar; erweiterte Assistent-Funktionen sind nicht aktiviert.',
  'assistant.promptDeadlines': 'Welche Fristen wurden erkannt?', 'assistant.promptReview': 'Welche Dokumente muss ich prüfen?', 'assistant.promptInvoices': 'Zeig mir meine unbezahlten Rechnungen.',
  'assistant.placeholder': 'Frage oder Suchbegriff eingeben', 'assistant.ask': 'Lokal abfragen',
  'assistant.results': '{count} lokale Treffer: {titles}', 'assistant.noResults': 'Keine belegten lokalen Treffer gefunden. Es wurden keine Angaben ergänzt oder erfunden.',
  'assistant.localOnly': 'Nur gespeicherte Dokumentdaten und lokale Analyseergebnisse werden verwendet.',
  'assistant.scopeAll':'Alle Dokumente','assistant.scopeDocument':'Dokument: {name}','assistant.scopeCase':'Fall: {name}','assistant.resetContext':'Neue Frage zu allen Dokumenten','assistant.semanticLocal':'Lokale, deterministische Suche – ohne Embeddings oder Cloud-AI.','assistant.history':'Suchverlauf','assistant.clearHistory':'Suchverlauf löschen','assistant.clearConversation':'Unterhaltung löschen','assistant.rebuildIndex':'Lokalen Index neu aufbauen','assistant.indexReady':'Index v{version} bereit','assistant.archived':'Archiviert','assistant.why':'Warum dieses Ergebnis?','assistant.openDocument':'Dokument öffnen','assistant.openCase':'Fall öffnen','assistant.openExplanation':'Erklärung öffnen','assistant.openTasks':'Aufgabencenter öffnen','assistant.moreResults':'Weitere Ergebnisse','assistant.ambiguousTitle':'Mehrere ähnliche Treffer','assistant.ambiguousText':'Bitte wähle den passenden Treffer aus.','assistant.zeroResult':'Ich habe kein Dokument gefunden, das dies zuverlässig belegt.','assistant.missingInformation':'Das Dokument wurde gefunden, die angefragte Information ist darin aber nicht zuverlässig belegt.','assistant.suggestedQuestions':'Mögliche nächste Fragen','assistant.questionSummary':'Was ist das Wichtigste?','assistant.questionDeadline':'Gibt es eine Frist?','assistant.questionAction':'Was muss ich tun?','assistant.questionRelated':'Gibt es verbundene Dokumente?','assistant.questionChange':'Was hat sich geändert?','assistant.questionUncertainty':'Was ist unsicher?','assistant.confidence':'Relevanz','assistant.resultDocuments':'Dokumente','assistant.resultCases':'Fälle','assistant.resultActions':'Aufgaben','assistant.foundDocument':'Passendes Dokument gefunden: {name}','assistant.foundCase':'Passender Fall gefunden: {name}','assistant.noConfirmedDeadline':'Keine zuverlässig bestätigte Frist gefunden.','assistant.noConfirmedAction':'Keine bestätigte offene Aufgabe gefunden.','assistant.confirmedDeadline':'Bestätigte Frist: {value}','assistant.confirmedAction':'Nächster bestätigter Schritt: {value}','assistant.localIndex':'Der abgeleitete Suchindex bleibt auf diesem Gerät.','assistant.resultReason':'Übereinstimmende Signale: {fields}',
  'journal.eyebrow': 'TAGEBUCH', 'journal.title': 'Ein kleiner Ort für dich.',
  'journal.intro': 'Du musst es nicht schön formulieren. Schreib einfach auf, was gerade wahr ist.',
  'journal.placeholder': 'Gerade fühle ich mich …', 'journal.characters': '{count} Zeichen',
  'journal.private': 'Dein Tagebuch gehört nur dir.', 'journal.save': 'Eintrag speichern',
  'journal.previous': 'Frühere Gedanken', 'journal.emptyTitle': 'Noch leer.',
  'journal.emptyText': 'Dein erster Eintrag wird hier erscheinen.', 'journal.deleteHint': 'Zum Löschen lange drücken',
  'add.kicker':'NEUES DOKUMENT','add.title':'Dokument hinzufügen','add.intro':'Wähle eine Quelle aus. Danach kannst du alle Details ergänzen.','add.source':'Quelle auswählen','add.scanning':'Scanner startet…','add.scanFeatures':'Kanten · Zuschnitt · PDF','add.image':'Bild','add.gallery':'Aus Galerie','add.files':'Aus Dateien','add.devBuild':'Development Build erforderlich','add.privateTitle':'Privat auf deinem Gerät','add.privateText':'In dieser Version bleiben Dokument und Details lokal gespeichert.','add.emailTitle':'E-Mail-Import kommt später','add.emailText':'Gmail und Outlook werden bewusst noch nicht verbunden.','add.browserScanner':'Im Browser ist kein Dokumentenscanner verfügbar. Kantenerkennung, automatischer Zuschnitt, Perspektivkorrektur und der 4-Ecken-Editor laufen ausschließlich in der installierten Android- oder iOS-App.','add.expoScanner':'Expo Go kann den nativen Dokumentenscanner nicht laden. Öffne Documenta als Development Build / Expo Dev Client. Dort startet der Google-ML-Kit-Scanner auf Android bzw. der Apple-VisionKit-Scanner auf iOS – keine normale Kamera.','add.scannerError':'Der echte Dokumentenscanner konnte nicht gestartet werden. Er benötigt einen Development Build / Expo Dev Client mit dem nativen Scanner-Modul; Expo Go wird nicht unterstützt.','add.closeNotice':'Hinweis schließen',
  'scan.empty':'Keine Scan-Seite vorhanden','scan.cancel':'Scan abbrechen','scan.kicker':'SCAN PRÜFEN','scan.preview':'Seitenvorschau','scan.processed':'Kanten · Zuschnitt · Perspektive vom Scanner verarbeitet','scan.variantTitle':'PDF- und OCR-Variante','scan.variantHint':'Das unbearbeitete Original wird immer zusätzlich aufbewahrt.','scan.original':'Original','scan.clean':'Sauberes Dokument','scan.blackWhite':'Schwarzweiß','scan.rescan':'Ecken neu korrigieren','scan.remove':'Entfernen','scan.nativeTitle':'Echter nativer Dokumentenscan','scan.nativeText':'Der native Scanner erkennt alle vier Papierkanten, schneidet den Hintergrund weg und entzerrt die Perspektive. Bis zu {count} Seiten werden anschließend einzeln für eine helle, kontrastreiche PDF optimiert.','scan.addPage':'Weitere Seite mit Kantenerkennung scannen','scan.creating':'PDF wird erstellt…','scan.create':'PDF erstellen & analysieren','scan.createSubtitle':'{count} {pages} · {variant} für PDF & OCR · lokal','scan.opening':'Scanner wird geöffnet…','scan.enhancing':'Seiten werden verbessert…','scan.recognizing':'Text und Dokumenttyp werden erkannt…','scan.limit':'Maximal {count} hochauflösende Seiten pro Dokument. Bitte speichere den aktuellen Scan und beginne danach ein neues Dokument.','scan.openError':'Der Scanner konnte nicht erneut geöffnet werden. Prüfe den Kamerazugriff.','scan.lastPageTitle':'Letzte Seite','scan.lastPageText':'Ein Dokument muss mindestens eine Seite enthalten.',
  'details.kicker':'DOKUMENT ABLEGEN','details.assetSelected':'Dokument ausgewählt','details.assetReady':'Bereit zur Ablage','details.noAsset':'Keine Datei ausgewählt','details.scannedMeta':'{count} Seiten · Original + optimierte PDF gespeichert','details.analysisComplete':'Lokale Dokumentanalyse abgeschlossen','details.noText':'Kein lesbarer Text erkannt','details.analysisUnavailable':'Dokumentanalyse nicht verfügbar','details.analysisCompleteText':'Vorschläge wurden nur aus lesbarem Dokumenttext übernommen. Unsichere Felder sind markiert und alles bleibt bearbeitbar.','details.analysisManualText':'Bitte fülle die Angaben manuell aus. Es wurden keine Daten erfunden.','details.requiredHint':'Pflichtfelder sind mit einem klaren Titel markiert.','details.titleHint':'Trage nur einen Titel ein, der eindeutig aus dem Dokument hervorgeht. Du kannst ihn vor dem Speichern jederzeit bearbeiten.','details.uncertainHint':'Automatisch erkannt · unsicher – bitte prüfen','details.unresolvedHint':'Im OCR-Text nicht eindeutig gefunden – bitte manuell ergänzen','details.senderInstitution':'Absender / Institution','details.documentDate':'Dokumentdatum','details.optional':'optional','details.person':'Zugehörige Person','details.personPlaceholder':'Name aus dem Dokument oder eigene Zuordnung','details.saving':'Datei wird gespeichert…','details.save':'Dokument speichern','details.duplicateTitle':'Mögliches Duplikat','details.duplicateText':'Ein ähnliches Dokument ist bereits vorhanden: {titles}. Möchtest du es trotzdem speichern?','details.saveAnyway':'Trotzdem speichern','details.fileSaveError':'Die Datei konnte nicht gespeichert werden.','details.iban':'IBAN',
  'archive.title':'Archiv & Papierkorb','archive.retention':'Lokale Aufbewahrung: {policy} ({days} Tage). Papierkorb-Inhalte können dauerhaft gelöscht werden.','archive.archiveEmpty':'Das Archiv ist leer.','archive.trashEmpty':'Der Papierkorb ist leer.','archive.moveToTrash':'In Papierkorb','archive.moveTitle':'In Papierkorb verschieben?','archive.moveText':'Im Papierkorb kann das Dokument endgültig gelöscht werden.','archive.deleteTitle':'Endgültig löschen?','archive.deleteText':'Dieser Schritt kann nicht rückgängig gemacht werden.','archive.deleteForever':'Endgültig löschen','archive.move':'Verschieben',
  'archive.subtitle':'Nach Dokumentdatum geordnet. Fallursprung und relevante Zeiträume bleiben getrennt.','archive.yearOverview':'Jahresübersicht','archive.currentYear':'Aktuelles Jahr','archive.previousYear':'Vorjahr','archive.lastThreeYears':'Letzte 3 Jahre','archive.allYears':'Alle Jahre','archive.unknownYear':'Jahr unbekannt','archive.olderYears':'Ältere Jahre','archive.documentsCount':'{count} Dokumente','archive.searchPlaceholder':'Titel, Absender, Kategorie oder Typ suchen','archive.reviewQueue':'Schnellprüfung alter Dokumente','archive.reviewHint':'Unsichere, widersprüchliche oder doppelte Angaben werden nicht automatisch bestätigt.','archive.bulkAccept':'Sichere Vorschläge gesammelt annehmen','archive.bulkBlocked':'Nur belegte, konfliktfreie Vorschläge mit hoher Sicherheit können gesammelt angenommen werden.','archive.archiveYear':'Archivjahr','archive.receivedDate':'Eingangsdatum','archive.importedAt':'Importiert am','archive.relevantPeriod':'Relevanter Zeitraum','archive.manual':'Manuell bestätigt','archive.automatic':'Automatischer Vorschlag','archive.duplicateWarning':'Mögliches Duplikat – keine automatische Löschung','archive.sameDocument':'Gleiches Dokument','archive.separateDocument':'Eigenständiges Dokument','archive.dontKnow':'Weiß nicht','archive.later':'Später','archive.noResults':'Keine Dokumente für diese Filter.','archive.month':'Monat {month}',
  'timeline.title':'Zeitleiste','timeline.documentCreated':'Dokument erstellt','timeline.documentReceived':'Dokument empfangen','timeline.documentImported':'Dokument importiert','timeline.deadlineDetected':'Frist erkannt','timeline.actionCreated':'Aufgabe erstellt','timeline.actionCompleted':'Aufgabe erledigt','timeline.actionStatusChanged':'Aufgabenstatus geändert','timeline.reviewAccepted':'Prüfung angenommen','timeline.reviewCorrected':'Prüfung korrigiert','timeline.replyDraft':'Antwortentwurf erstellt','timeline.followUp':'Nachfassen erstellt','timeline.relationshipCreated':'Dokumentbeziehung erstellt','timeline.caseOpened':'Fall eröffnet','timeline.caseStatusChanged':'Fallstatus geändert','timeline.caseClosed':'Fall geschlossen','timeline.caseHistory':'Fallverlauf',
  'activity.title':'Aktivitäten','activity.subtitle':'Lokale Änderungen an Dokumenten, Fällen, Aufgaben, Archiv und Exporten.','activity.empty':'Noch keine Aktivitäten. Neue Aktionen erscheinen hier.','notifications.title':'Hinweise','notifications.empty':'Keine Hinweise.',
  'export.title':'Exportpaket','export.hint':'Es wird nur ein lokales Paket vorbereitet, keine Datei erzeugt.','export.activeDocuments':'Aktive Dokumente','export.noDocuments':'Keine aktiven Dokumente.','export.recipient':'Empfänger (optional)','export.case':'Optionaler Fall','export.toc':'Automatisches Inhaltsverzeichnis vorbereiten','export.order':'Reihenfolge & Inhaltsverzeichnis','export.noCase':'ohne Fall','export.save':'Paket speichern ({count})',
  'security.title':'Datenschutz & Sicherheit','security.biometric':'Biometrischer Schutz (Platzhalter)','security.pin':'PIN-Sperre (Platzhalter)','security.sensitive':'Schutz sensibler Dokumente','security.cloud':'Cloud-Synchronisierung','security.gmail':'Gmail-Zugriff','security.ai':'KI-Verarbeitung','security.autoLock':'Automatische Sperre: {count} Minuten (Platzhalter)','security.retention':'Aufbewahrung: {policy}','security.audit':'Integrations- und Zugriffs-Audit','security.auditText':'Gmail: {cloud} · KI: {ai} · Cloud-Backup: {cloud}','security.profilesAccess':'Profile mit lokalem Zugriff: {profiles} · Aktivitäten: {count}',
  'backup.title':'Backup & Wiederherstellung','backup.privacy':'Verschlüsselt mit deiner Passphrase. Kein Klartext wird in Drive gespeichert.','backup.drive':'Google Drive App-Daten','backup.connected':'Verbunden','backup.disconnected':'Nicht verbunden','backup.connect':'Google Drive verbinden','backup.disconnect':'Verbindung trennen','backup.configuration':'OAuth oder sichere Kryptografie benötigt eine konfigurierte Entwicklungsumgebung.','backup.prepared':'Wiederherstellung wird vorbereitet','backup.passphrase':'Backup-Passphrase','backup.passphraseHint':'Sie wird nicht gespeichert oder protokolliert.','backup.create':'Jetzt verschlüsseltes Backup erstellen','backup.cancel':'Backup abbrechen','backup.automatic':'Automatische Backups nach dem manuellen Entsperren eines Backups in dieser App-Sitzung','backup.foreground':'Sie laufen nur bei geöffneter App im Vordergrund und nach Änderungen verzögert; die Passphrase wird nicht gespeichert.','backup.discover':'Backups suchen','backup.snapshots':'Verfügbare Backups','backup.documentsAssets':'{documents} Dokumente · {assets} Dateien · {size}','backup.prepareRestore':'Wiederherstellung prüfen','backup.conflicts':'{count} Konflikte; manuelle Konflikte werden nicht überschrieben.','backup.confirmRestore':'Wiederherstellung ausdrücklich bestätigen','backup.delete':'Backup löschen','backup.deleteTitle':'Backup löschen?','backup.deleteMessage':'Dieses verschlüsselte Backup wird dauerhaft aus Google Drive gelöscht.','backup.export':'Verschlüsseltes lokales Backup exportieren','backup.import':'Verschlüsseltes lokales Backup importieren','backup.latestBackup':'Letztes Backup: {time}','backup.latestRestore':'Letzte Wiederherstellung: {time}','backup.newPhone':'Neues Telefon?','backup.newPhoneText':'Installiere Documenta, verbinde dasselbe Google-Konto, suche dein Backup und gib deine Passphrase ein. Integrationen und Benachrichtigungen müssen anschließend erneut verbunden werden.','backup.noSnapshots':'Noch keine Backups gefunden.',
  'modules.title':'Erweiterungen','modules.status':'{name} · Kommt später · deaktiviert','workspaces.title':'Family & Business','workspaces.hint':'Kommt bald · keine Freigaben oder Integrationen aktiv.','workspaces.family':'Family · Mitglieder: {count} · Rollen und Zugriffe sind Platzhalter','workspaces.business':'Business · Organisation, Eigentum, Freigaben und Audit sind Platzhalter · Mitglieder: {count}',
  'contracts.title':'Verträge & Kosten','contracts.create':'Vertrag anlegen','contracts.costCreate':'Regelmäßige Kosten anlegen','contracts.monitor':'Vertragsmonitor','contracts.none':'Keine Verträge überwacht.','contracts.costs':'Regelmäßige Kosten','contracts.noCosts':'Keine regelmäßigen Kosten hinterlegt.','contracts.requiredContract':'Titel und Anbieter sind erforderlich.','contracts.requiredCost':'Titel, Anbieter, Kategorie und mindestens ein Betrag sind erforderlich.','contracts.saveContract':'Vertrag speichern','contracts.saveCost':'Kosten speichern','contracts.automaticRenewal':'Automatische Verlängerung','contracts.fieldTitle':'Titel','contracts.fieldProvider':'Anbieter','contracts.fieldDocument':'Dokument','contracts.fieldStartDate':'Startdatum','contracts.fieldEndDate':'Enddatum','contracts.fieldCancellationNotice':'Kündigungsfrist','contracts.fieldNextCancellationDate':'Nächster Kündigungstermin','contracts.fieldMonthlyFee':'Monatlicher Betrag','contracts.fieldYearlyFee':'Jährlicher Betrag','contracts.fieldNextCharge':'Nächste Abbuchung','contracts.fieldContract':'Vertrag','contracts.fieldCategory':'Kategorie','contracts.statusActive':'aktiv','contracts.statusReview':'prüfen','contracts.statusEnded':'beendet','contracts.statusCancelled':'gekündigt','contracts.cadenceMonthly':'monatlich','contracts.cadenceYearly':'jährlich',
  'compare.title':'Dokumente vergleichen','compare.hint':'Wähle genau zwei aktive Dokumente.','compare.comparison':'Vergleich','compare.unavailable':'Strukturierte Vertragsbedingungen: noch nicht verfügbar.','compare.save':'Vergleich speichern','compare.history':'Verlauf','compare.empty':'Noch keine gespeicherten Vergleiche.','compare.amount':'Betrag','compare.deadline':'Frist','compare.type':'Dokumenttyp',
};

const hu: TranslationDictionary = {
  ...de,
  'settings.voiceSelection':'Helyi hang','settings.voiceRefresh':'Hangok frissítése','settings.voicePreview':'Hang tesztelése','settings.voiceAutomatic':'Automatikus választás','settings.voiceNone':'Nincs megfelelő helyi hang','settings.voiceQuality':'Minőség',
  'common.back': 'Vissza', 'common.cancel': 'Mégse', 'common.save': 'Mentés', 'common.close': 'Bezárás',
  'common.edit': 'Szerkesztés', 'common.review': 'Ellenőrzés', 'common.accept': 'Elfogadás', 'common.reject': 'Elutasítás',
  'common.complete': 'Elvégzés', 'common.next': 'Tovább', 'common.done': 'Kész', 'common.unknown': 'Ismeretlen',
  'common.none': 'Nincs', 'common.documents': 'Dokumentumok', 'common.cases': 'Ügyek', 'common.tasks': 'Feladatok',
  'common.due': 'Határidő', 'common.language': 'Nyelv', 'common.documentLanguage': 'Dokumentum nyelve',
  'common.uncertain': 'Bizonytalan', 'common.page': 'oldal', 'common.pages': 'oldal', 'common.status': 'Állapot',
  'common.priority': 'Prioritás', 'common.high': 'magas', 'common.medium': 'közepes', 'common.low': 'alacsony',
  'common.open': 'nyitott', 'common.loading': 'Betöltés …', 'common.error': 'Hiba',
  'nav.home': 'Kezdőlap', 'nav.documents': 'Dokumentumok', 'nav.add': 'Hozzáadás', 'nav.search': 'Keresés', 'nav.profile': 'Profil',
  'dashboard.kicker': 'DOCUMENTA', 'dashboard.title': 'Áttekintés', 'dashboard.subtitle': 'Helyi dokumentumaid és feladataid.',
  'dashboard.scan': 'Szkennelés', 'dashboard.import': 'Importálás', 'dashboard.actions': 'Feladatok', 'dashboard.assistant': 'Asszisztens',
  'dashboard.newDocuments': 'Új dokumentumok', 'dashboard.newDocumentsSubtitle': 'Új beérkezések', 'dashboard.needsAction': 'Teendő szükséges',
  'dashboard.needsActionSubtitle': 'Nyitott lépéseket tartalmazó dokumentumok és ügyek', 'dashboard.upcomingDeadlines': 'Közelgő határidők',
  'dashboard.upcomingDeadlinesSubtitle': 'A következő hét napban', 'dashboard.payable': 'Fizetendő',
  'dashboard.payableSubtitle': 'Fizetési állapotú dokumentumok', 'dashboard.unresolvedCases': 'Le nem zárt ügyek',
  'dashboard.unresolvedCasesSubtitle': 'Még nincs lezárva', 'dashboard.noItems': 'Nincs bejegyzés ebben a nézetben',
  'documents.kicker': 'IRATTÁR', 'documents.title': 'Dokumentumok', 'documents.subtitle': '{count} dokumentum egy helyen',
  'documents.all': 'Mind', 'documents.emptyTitle': 'Nincs itt dokumentum', 'documents.emptyText': 'Módosítsd a szűrőt vagy adj hozzá új dokumentumot.',
  'documents.add': 'Dokumentum hozzáadása', 'documents.optimizedPdf': 'Optimalizált PDF', 'documents.original': 'Eredeti',
  'document.title': 'Dokumentum', 'document.type': 'Dokumentumtípus', 'document.sender': 'Feladó', 'document.date': 'Dátum',
  'document.amount': 'Összeg', 'document.deadline': 'Határidő', 'document.language': 'Dokumentum nyelve',
  'document.languageUnknown': 'Bizonytalan', 'document.ocrText': 'OCR-szöveg', 'document.noOcr': 'Nincs olvasható OCR-szöveg.',
  'document.noDocument': 'A dokumentum nem található.', 'document.archive': 'Archiválás', 'document.trash': 'Kuka',
  'document.restore': 'Visszaállítás', 'document.explain': 'Dokumentum magyarázata', 'document.relationship': 'Kapcsolat hozzáadása',
  'document.noOriginal': 'Nem érhető el eredeti kép.', 'intelligence.title': 'Helyi dokumentumértelmezés', 'intelligence.review': 'Ellenőrzés',
  'intelligence.evidenced': 'Alátámasztott', 'intelligence.humanReview': 'Felhasználói ellenőrzés szükséges',
  'intelligence.pending': 'kritikus adat ellenőrzése szükséges.', 'intelligence.reviewFields': 'Mezők ellenőrzése', 'intelligence.risk': 'Kockázat',
  'intelligence.evidence': 'Bizonyíték', 'intelligence.whatItMeans': 'Mit jelent ez?', 'intelligence.noAnalysis': 'Nincs helyi elemzés.',
  'intelligence.explanationUnsupported': 'Ehhez a nyelvhez még nincs biztonságos, determinisztikus magyarázati adapter. A strukturált dokumentumadatok változatlanok maradnak.',
  'review.needsReview': 'Ellenőrzés szükséges', 'review.accepted': 'Elfogadva', 'review.rejected': 'Elutasítva', 'review.pending': 'Függőben',
  'action.center': 'ACTION CENTER', 'action.title': 'Feladatok és következő lépések', 'action.open': 'nyitott', 'action.toReview': 'ellenőrizendő',
  'action.reminders': 'Emlékeztetők', 'action.drafts': 'Tervezetek', 'action.emptyTitle': 'Nincs feladat ebben a nézetben',
  'action.emptyText': 'A bizonyított javaslatok automatikusan megjelennek. A bizonytalan adatok ellenőrzésre várnak.',
  'action.ownTask': 'Saját feladat', 'action.statusSuggested': 'Javaslat', 'action.statusNeedsReview': 'Ellenőrizendő',
  'action.statusConfirmed': 'Megerősítve', 'action.statusInProgress': 'Folyamatban', 'action.statusWaiting': 'Várakozik',
  'action.statusCompleted': 'Elvégezve', 'action.statusCancelled': 'Megszakítva', 'action.statusRejected': 'Elutasítva',
  'action.statusArchived': 'Archiválva', 'action.detail': 'Részletek', 'action.history': 'Előzmények', 'action.confirm': 'Megerősítés',
  'action.reopen': 'Újranyitás', 'action.cancel': 'Megszakítás', 'action.archive': 'Archiválás', 'action.source': 'Forrás',
  'action.evidence': 'Bizonyíték', 'action.noEvidence': 'Nincs kapcsolt bizonyíték.', 'action.completeBlocked': 'A javaslatot el kell fogadni az elvégzés előtt.',
  'automation.title': 'Automatizálás', 'automation.subtitle': 'Helyi szabályok és biztonságos jelöltek',
  'automation.localOnly': 'Csak helyi: nem küldünk e-mailt, nem indítunk fizetést és nem aktiválunk felhőszolgáltatást.',
  'automation.noRules': 'Még nincs szabály.', 'automation.reminderRule': 'Biztonságos emlékeztető-szabály hozzáadása',
  'automation.candidates': 'Jelöltek', 'automation.noCandidates': 'Nincs nyitott jelölt.',
  'cases.title': 'Ügyek', 'cases.subtitle': 'Az ügyek dokumentumokat, határidőket és következő lépéseket fognak össze.',
  'cases.new': 'Új ügy létrehozása', 'cases.empty': 'Még nincs ügy. Hozz létre egyet az összetartozó iratokhoz.',
  'cases.closureSafe': 'Az ügy biztonságosan lezárható.', 'cases.closureBlocked': 'Az ügy még nem zárható le.',
  'reply.title': 'Választervezet', 'reply.language': 'Válasz nyelve', 'reply.sourceFacts': 'Felhasznált forrásadatok',
  'reply.editedWarning': 'A kézzel szerkesztett tervezetet nem írjuk felül automatikusan.',
  'reply.recipient': 'Címzett', 'reply.subject': 'Tárgy', 'reply.body': 'Üzenet', 'reply.generate': 'Tervezet készítése ezen a nyelven',
  'reply.regenerateTitle': 'Lecseréled a szerkesztett tervezetet?', 'reply.regenerateMessage': 'A kézi módosításaid megmaradnak, amíg kifejezetten nem erősíted meg az újragenerálást.',
  'reply.unsupportedLanguage': 'Ehhez a nyelvhez még nincs biztonságos válaszadapter. A meglévő tervezet nem változik meg.',
  'settings.title': 'Beállítások', 'settings.subtitle': 'A megjelenítés azonnal érvényesül a Documentában.',
  'settings.appearance': 'Megjelenés és nyelv', 'settings.appLanguage': 'Alkalmazás nyelve',
  'settings.appLanguageHint': 'A teljes Documenta felület nyelve.', 'settings.explanationLanguage': 'Magyarázat nyelve',
  'settings.explanationLanguageHint': 'A dokumentumértelmezés közérthető magyarázatainak nyelve.',
  'settings.replyLanguage': 'Válasz nyelve', 'settings.replyLanguageHint': 'Az új választervezetek nyelve; független a dokumentumtól és a felülettől.',
  'settings.theme': 'Megjelenés', 'settings.accent': 'Kiemelőszín', 'settings.fontSize': 'Betűméret', 'settings.explanationMode': 'Magyarázati mód',
  'settings.languageNames': 'Magyar', 'settings.adapterSupported': 'Adapter elérhető', 'settings.adapterUnsupported': 'Adapter még nem érhető el',
  'settings.region':'Ország / régió','settings.regionHint':'Csak a jövőbeli regionális alapértékeket módosítja; a meglévő dokumentumok változatlanok maradnak.','settings.countrySearch':'Ország keresése','settings.countryUnknown':'Még nincs beállítva',
  'settings.translationMode':'Fordítási mód','settings.translationAutomatic':'Automatikusan, ha szükséges','settings.translationAskFirst':'Előbb kérdezzen','settings.translationOff':'Kikapcsolva','settings.explanationDisplayMode':'Magyarázat megjelenése','settings.explanationText':'Szöveg','settings.explanationVoice':'Hang','settings.explanationTextVoice':'Szöveg és hang','settings.voiceHint':'A hang a már elkészített magyarázatot olvassa fel.',
  'onboarding.welcome': 'Üdvözlünk', 'onboarding.profile': 'Profil', 'onboarding.appLanguage': 'Alkalmazás nyelve',
  'onboarding.explanations': 'Magyarázatok', 'onboarding.reply': 'Válaszok', 'onboarding.privacy': 'Adatvédelem', 'onboarding.modules': 'Modulok',
  'onboarding.step': '{current}. LÉPÉS / {total}', 'onboarding.name': 'Neved', 'onboarding.finish': 'Beállítás befejezése',
  'onboarding.next': 'Tovább', 'onboarding.subtitle': 'A Documenta helyben és áttekinthetően rendezi az irataidat.',
  'onboarding.privacyText': 'A helyi tárolás és az adatvédelmi beállítások előkészítése megtörténik.',
  'onboarding.modulesText': 'A Gmail, Voice, Calendar, Tax, Family, Business és Enterprise modulok jelenleg inaktívak.',
  'onboarding.country':'Ország / régió','onboarding.countryPrompt':'Melyik országban élsz?','onboarding.languagePrompt':'Milyen nyelven szeretnéd használni a Documentát?','onboarding.explanationPrompt':'Milyen nyelven kéred a magyarázatokat?','onboarding.translationMode':'Fordítás','onboarding.translationPrompt':'Mikor készítsen a Documenta fordítást?','onboarding.replyPrompt':'Milyen nyelven szeretnél válaszolni?','onboarding.noUselessTranslation':'Ha a dokumentum nyelve megegyezik a választott nyelvvel, nem fordítjuk feleslegesen.','onboarding.explanationIndependent':'A magyarázatot ettől függetlenül bármikor kérheted.',
  'explanation.localKicker':'HELYI DOKUMENTUMMAGYARÁZAT','explanation.available':'Magyarázat elérhető','explanation.unavailable':'Ehhez a nyelvhez nincs biztonságos magyarázat.','explanation.needsReview':'A magyarázat előtt ellenőrizni kell a bizonytalan adatokat.','explanation.generated':'Magyarázat elkészült','explanation.translationState':'Fordítás','explanation.noTranslation':'Nem szükséges','explanation.translationReady':'Helyi fordítás szükséges','explanation.translationAsk':'Megerősítés szükséges','explanation.translationDisabled':'Kikapcsolva','explanation.translationUnavailable':'Nincs helyi fordítási adapter','explanation.ask':'Kérdés elküldése','explanation.placeholder':'Kérdés erről a dokumentumról','explanation.history':'Kérdések és válaszok','explanation.clearHistory':'Előzmények törlése','explanation.newConversation':'Új beszélgetés','explanation.sources':'Források','explanation.sourceField':'Forrásmező','explanation.confidence':'Bizonyosság','explanation.unsupportedQuestion':'Ezt a kérdést ebből a dokumentumból jelenleg nem tudom biztosan megválaszolni.','explanation.localOnly':'Csak ez a dokumentum és a kifejezetten kapcsolódó, megerősített ügyadatok használhatók helyben.','explanation.voiceTitle':'Magyarázat felolvasása','explanation.voiceReadsText':'A hang a magyarázatot olvassa fel, nem az eredeti dokumentumot.','explanation.play':'Lejátszás','explanation.pause':'Szünet','explanation.resume':'Folytatás','explanation.stop':'Leállítás','explanation.restart':'Újraindítás','explanation.voiceUnavailable':'Ezen az eszközön nincs megfelelő helyi hang. A szöveges magyarázat továbbra is elérhető.',
  'search.title': 'Keresés', 'search.placeholder': 'Cím, feladó, profil, kategória …', 'search.clear': 'Szűrők törlése',
  'search.profile': 'Profilok', 'search.category': 'Kategória', 'search.type': 'Dokumentumtípus', 'search.count': '{documents} dokumentum · {cases} ügy · {tasks} feladat',
  'error.notFound': 'Nem található.', 'error.noReadableOcr': 'Nincs mentett, olvasható OCR-szöveg.',
  'common.version': 'Verzió',
  'document.sampleNoOriginal': 'Ez a mintadokumentum kép vagy PDF nélkül lett mentve.', 'document.task': 'Feladat',
  'document.share': 'Megosztás', 'document.print': 'Nyomtatás', 'document.relationships': 'Kapcsolatok',
  'document.relatedCases': 'Kapcsolódó ügyek', 'document.documentRelationships': 'Dokumentumkapcsolatok',
  'document.linkToCase': 'Ügyhöz kapcsolás', 'document.createRelationship': 'Kapcsolat létrehozása',
  'document.saveRelationship': 'Kapcsolat mentése', 'document.details': 'Dokumentum részletei', 'document.category': 'Kategória',
  'document.subcategory': 'Alkategória', 'document.payrollPeriod': 'Elszámolási időszak', 'document.person': 'Személy',
  'document.profiles': 'Profilok', 'document.tags': 'Címkék', 'document.note': 'Megjegyzés', 'document.localOcr': 'Helyi OCR',
  'document.ocrRecognized': '{count} karakter felismerve', 'document.uncertainFieldsReviewed': '{count} bizonytalan mező ellenőrizve',
  'document.edit': 'Dokumentum szerkesztése', 'document.dueDate': 'Esedékesség dátuma', 'document.tagsHint': 'Címkék (vesszővel elválasztva)',
  'document.assignedProfiles': 'Hozzárendelt profilok', 'document.saveChanges': 'Módosítások mentése',
  'document.actionUnavailable': 'A művelet nem elérhető', 'document.tryAgain': 'Próbáld újra.',
  'document.referenceNumber': 'Ügyiratszám / referencia', 'document.customerNumber': 'Ügyfélszám',
  'document.invoiceNumber': 'Számlaszám', 'document.contractNumber': 'Szerződésszám',
  'document.insuranceNumber': 'Biztosítási szám', 'document.taxNumber': 'Adóazonosító / adószám',
  'document.patientNumber': 'Beteg- / ügyszám', 'document.schoolReference': 'Iskolai / gondozási referencia',
  'document.relationshipPrevious': 'előző dokumentum', 'document.relationshipReply': 'válasz',
  'document.relationshipReminder': 'emlékeztető', 'document.relationshipPayment': 'fizetés', 'document.relationshipCompletion': 'lezárás',
  'intelligence.purpose': 'Cél', 'intelligence.recipient': 'Címzett', 'intelligence.coreData': 'Felismerhető alapadatok',
  'intelligence.whatIsIt': 'Mi ez?', 'intelligence.whatToDo': 'Mit kell tennem?', 'intelligence.byWhen': 'Meddig?',
  'intelligence.howMuch': 'Mennyi?', 'intelligence.ifNoAction': 'Mi történik, ha nem teszek semmit?',
  'intelligence.options': 'Milyen lehetőségeim vannak?', 'intelligence.noConsequence': 'Nem azonosítható kifejezetten igazolt következmény.',
  'intelligence.noOption': 'Nem azonosítható kifejezetten igazolt lehetőség.', 'intelligence.nextDeadline': 'Következő határidő',
  'intelligence.nextStep': 'Következő lépés', 'intelligence.warningConsequence': 'Figyelmeztetés / következmény',
  'intelligence.mostImportant': 'A legfontosabb',
  'error.title': 'Nem található', 'error.missingScreen': 'Ez a képernyő nem létezik.', 'error.goHome': 'Ugrás a kezdőlapra',
  'assistant.kicker': 'HELYI ASSZISZTENS', 'assistant.title': 'Kérdezd a Documentát',
  'assistant.available': 'A helyi, bizonyítékokon alapuló lekérdezés készen áll.', 'assistant.unavailable': 'A helyi alaplekérdezések elérhetők; a bővített asszisztensfunkciók nincsenek bekapcsolva.',
  'assistant.promptDeadlines': 'Milyen határidőket ismert fel?', 'assistant.promptReview': 'Mely dokumentumokat kell ellenőriznem?', 'assistant.promptInvoices': 'Mutasd a kifizetetlen számláimat.',
  'assistant.placeholder': 'Írd be a kérdést vagy keresőkifejezést', 'assistant.ask': 'Helyi lekérdezés',
  'assistant.results': '{count} helyi találat: {titles}', 'assistant.noResults': 'Nem található bizonyított helyi találat. Nem egészítettünk ki és nem találtunk ki adatokat.',
  'assistant.localOnly': 'Csak mentett dokumentumadatokat és helyi elemzési eredményeket használunk.',
  'assistant.scopeAll':'Minden dokumentum','assistant.scopeDocument':'Dokumentum: {name}','assistant.scopeCase':'Ügy: {name}','assistant.resetContext':'Új kérdés minden dokumentumról','assistant.semanticLocal':'Helyi, determinisztikus keresés – embedding és felhőalapú AI nélkül.','assistant.history':'Keresési előzmények','assistant.clearHistory':'Keresési előzmények törlése','assistant.clearConversation':'Beszélgetés törlése','assistant.rebuildIndex':'Helyi index újraépítése','assistant.indexReady':'A(z) v{version} index kész','assistant.archived':'Archivált','assistant.why':'Miért ezt találtam?','assistant.openDocument':'Dokumentum megnyitása','assistant.openCase':'Ügy megnyitása','assistant.openExplanation':'Magyarázat megnyitása','assistant.openTasks':'Task Center megnyitása','assistant.moreResults':'További találatok','assistant.ambiguousTitle':'Több hasonló találat','assistant.ambiguousText':'Válaszd ki, melyikre gondoltál.','assistant.zeroResult':'Nem találtam olyan dokumentumot, amely ezt megbízhatóan alátámasztja.','assistant.missingInformation':'A dokumentumot megtaláltam, de a kérdezett adat nincs benne megbízhatóan igazolva.','assistant.suggestedQuestions':'Lehetséges következő kérdések','assistant.questionSummary':'Mi a lényeg?','assistant.questionDeadline':'Van határidő?','assistant.questionAction':'Mit kell tennem?','assistant.questionRelated':'Van kapcsolódó dokumentum?','assistant.questionChange':'Mi változott?','assistant.questionUncertainty':'Mi bizonytalan?','assistant.confidence':'Relevancia','assistant.resultDocuments':'Dokumentumok','assistant.resultCases':'Ügyek','assistant.resultActions':'Teendők','assistant.foundDocument':'Ezt a dokumentumot találtam: {name}','assistant.foundCase':'Ezt az ügyet találtam: {name}','assistant.noConfirmedDeadline':'Nem találtam megbízhatóan megerősített határidőt.','assistant.noConfirmedAction':'Nem találtam megerősített nyitott teendőt.','assistant.confirmedDeadline':'Megerősített határidő: {value}','assistant.confirmedAction':'Következő megerősített lépés: {value}','assistant.localIndex':'A származtatott keresési index ezen az eszközön marad.','assistant.resultReason':'Egyező jelek: {fields}',
  'journal.eyebrow': 'NAPLÓ', 'journal.title': 'Egy kis hely neked.',
  'journal.intro': 'Nem kell szépen fogalmazni. Csak írd le, ami most igaz.',
  'journal.placeholder': 'Most azt érzem, hogy…', 'journal.characters': '{count} karakter',
  'journal.private': 'A naplód csak a tiéd.', 'journal.save': 'Bejegyzés mentése',
  'journal.previous': 'Korábbi gondolatok', 'journal.emptyTitle': 'Még üres.',
  'journal.emptyText': 'Az első bejegyzésed itt fog megjelenni.', 'journal.deleteHint': 'Hosszan nyomva törölhető',
  'add.kicker':'ÚJ DOKUMENTUM','add.title':'Dokumentum hozzáadása','add.intro':'Válassz forrást, majd egészítsd ki a részleteket.','add.source':'Forrás kiválasztása','add.scanning':'A szkenner indul…','add.scanFeatures':'Élek · vágás · PDF','add.image':'Kép','add.gallery':'Galériából','add.files':'Fájlokból','add.devBuild':'Development Build szükséges','add.privateTitle':'Privát a készülékeden','add.privateText':'Ebben a verzióban a dokumentumok és részletek helyben maradnak.','add.emailTitle':'Az e-mail-import később érkezik','add.emailText':'A Gmail és az Outlook szándékosan még nincs csatlakoztatva.','add.browserScanner':'A böngészőben nem érhető el dokumentumszkenner. Az élérzékelés, automatikus vágás, perspektívajavítás és a négysarkos szerkesztő csak a telepített Android- vagy iOS-alkalmazásban működik.','add.expoScanner':'Az Expo Go nem tudja betölteni a natív dokumentumszkennert. Nyisd meg a Documentát Development Build / Expo Dev Client alkalmazásként. Androidon a Google ML Kit, iOS-en az Apple VisionKit szkennere indul el.','add.scannerError':'A dokumentumszkenner nem indítható. A natív szkennermodult tartalmazó Development Build / Expo Dev Client szükséges; az Expo Go nem támogatott.','add.closeNotice':'Értesítés bezárása',
  'scan.empty':'Nincs szkennelt oldal','scan.cancel':'Szkennelés megszakítása','scan.kicker':'SZKENNELÉS ELLENŐRZÉSE','scan.preview':'Oldalelőnézet','scan.processed':'A szkenner feldolgozta: élek · vágás · perspektíva','scan.variantTitle':'PDF- és OCR-változat','scan.variantHint':'A szerkesztetlen eredeti mindig megmarad.','scan.original':'Eredeti','scan.clean':'Tiszta dokumentum','scan.blackWhite':'Fekete-fehér','scan.rescan':'Sarkok javítása újra','scan.remove':'Eltávolítás','scan.nativeTitle':'Valódi natív dokumentumszkennelés','scan.nativeText':'A natív szkenner felismeri mind a négy papírszélt, levágja a hátteret és kiegyenesíti a perspektívát. Ezután legfeljebb {count} oldal külön-külön optimalizálható világos, kontrasztos PDF-fé.','scan.addPage':'További oldal szkennelése élérzékeléssel','scan.creating':'PDF készül…','scan.create':'PDF létrehozása és elemzése','scan.createSubtitle':'{count} {pages} · {variant} PDF-hez és OCR-hez · helyben','scan.opening':'A szkenner megnyitása…','scan.enhancing':'Oldalak javítása…','scan.recognizing':'Szöveg és dokumentumtípus felismerése…','scan.limit':'Dokumentumonként legfeljebb {count} nagy felbontású oldal. Mentsd az aktuális szkennelést, majd kezdj új dokumentumot.','scan.openError':'A szkenner nem nyitható meg újra. Ellenőrizd a kameraengedélyt.','scan.lastPageTitle':'Utolsó oldal','scan.lastPageText':'Egy dokumentumnak legalább egy oldalt tartalmaznia kell.',
  'details.kicker':'DOKUMENTUM TÁROLÁSA','details.assetSelected':'Dokumentum kiválasztva','details.assetReady':'Tárolásra kész','details.noAsset':'Nincs fájl kiválasztva','details.scannedMeta':'{count} oldal · eredeti és optimalizált PDF mentve','details.analysisComplete':'A helyi dokumentumelemzés elkészült','details.noText':'Nem ismert fel olvasható szöveget','details.analysisUnavailable':'A dokumentumelemzés nem érhető el','details.analysisCompleteText':'A javaslatok csak olvasható dokumentumszövegből származnak. A bizonytalan mezők jelölve vannak, minden szerkeszthető marad.','details.analysisManualText':'Töltsd ki az adatokat kézzel. Nem egészítettünk ki és nem találtunk ki adatokat.','details.requiredHint':'A kötelező mezőket egyértelmű cím jelöli.','details.titleHint':'Csak a dokumentumból egyértelműen következő címet adj meg. Mentés előtt bármikor szerkesztheted.','details.uncertainHint':'Automatikusan felismert · bizonytalan – ellenőrizd','details.unresolvedHint':'Az OCR-szövegben nem található egyértelműen – egészítsd ki kézzel','details.senderInstitution':'Feladó / intézmény','details.documentDate':'Dokumentum dátuma','details.optional':'opcionális','details.person':'Kapcsolódó személy','details.personPlaceholder':'A dokumentumban szereplő név vagy saját hozzárendelés','details.saving':'Fájl mentése…','details.save':'Dokumentum mentése','details.duplicateTitle':'Lehetséges duplikátum','details.duplicateText':'Hasonló dokumentum már létezik: {titles}. Mégis mented?','details.saveAnyway':'Mentés mégis','details.fileSaveError':'A fájl nem menthető.','details.iban':'IBAN',
  'archive.title':'Archívum és kuka','archive.retention':'Helyi megőrzés: {policy} ({days} nap). A kukában lévő elemek végleg törölhetők.','archive.archiveEmpty':'Az archívum üres.','archive.trashEmpty':'A kuka üres.','archive.moveToTrash':'Áthelyezés a kukába','archive.moveTitle':'Áthelyezed a kukába?','archive.moveText':'A kukában a dokumentum végleg törölhető.','archive.deleteTitle':'Végleg törlöd?','archive.deleteText':'Ez a lépés nem vonható vissza.','archive.deleteForever':'Végleges törlés','archive.move':'Áthelyezés',
  'archive.subtitle':'A dokumentum saját keltezése szerint rendezve. Az ügy eredete és a releváns időszak külön marad.','archive.yearOverview':'Éves áttekintés','archive.currentYear':'Aktuális év','archive.previousYear':'Előző év','archive.lastThreeYears':'Utolsó 3 év','archive.allYears':'Összes év','archive.unknownYear':'Ismeretlen év','archive.olderYears':'Régebbi évek','archive.documentsCount':'{count} dokumentum','archive.searchPlaceholder':'Keresés cím, feladó, kategória vagy típus szerint','archive.reviewQueue':'Régi dokumentumok gyors ellenőrzése','archive.reviewHint':'A bizonytalan, konfliktusos vagy duplikált adat nem kap automatikus megerősítést.','archive.bulkAccept':'Biztos javaslatok tömeges elfogadása','archive.bulkBlocked':'Csak magas bizonyosságú, bizonyítékkal alátámasztott és konfliktusmentes javaslat fogadható el tömegesen.','archive.archiveYear':'Archív év','archive.receivedDate':'Beérkezés dátuma','archive.importedAt':'Importálva','archive.relevantPeriod':'Releváns időszak','archive.manual':'Kézzel megerősítve','archive.automatic':'Automatikus javaslat','archive.duplicateWarning':'Lehetséges duplikátum – nincs automatikus törlés','archive.sameDocument':'Ugyanaz','archive.separateDocument':'Külön dokumentum','archive.dontKnow':'Nem tudom','archive.later':'Később','archive.noResults':'Nincs dokumentum ezekkel a szűrőkkel.','archive.month':'{month}. hónap',
  'timeline.title':'Idővonal','timeline.documentCreated':'Dokumentum létrehozva','timeline.documentReceived':'Dokumentum beérkezett','timeline.documentImported':'Dokumentum importálva','timeline.deadlineDetected':'Határidő felismerve','timeline.actionCreated':'Teendő létrehozva','timeline.actionCompleted':'Teendő elvégezve','timeline.actionStatusChanged':'Teendő állapota változott','timeline.reviewAccepted':'Ellenőrzés elfogadva','timeline.reviewCorrected':'Ellenőrzés javítva','timeline.replyDraft':'Választervezet létrehozva','timeline.followUp':'Utánkövetés létrehozva','timeline.relationshipCreated':'Dokumentumkapcsolat létrehozva','timeline.caseOpened':'Ügy megnyitva','timeline.caseStatusChanged':'Ügyállapot változott','timeline.caseClosed':'Ügy lezárva','timeline.caseHistory':'Ügyelőzmény',
  'activity.title':'Tevékenységek','activity.subtitle':'Dokumentumok, ügyek, feladatok, archívumok és exportok helyi módosításai.','activity.empty':'Még nincs tevékenység. Az új műveletek itt jelennek meg.','notifications.title':'Értesítések','notifications.empty':'Nincs értesítés.',
  'export.title':'Exportcsomag','export.hint':'Csak helyi csomag készül elő, fájl nem jön létre.','export.activeDocuments':'Aktív dokumentumok','export.noDocuments':'Nincs aktív dokumentum.','export.recipient':'Címzett (opcionális)','export.case':'Opcionális ügy','export.toc':'Automatikus tartalomjegyzék előkészítése','export.order':'Sorrend és tartalomjegyzék','export.noCase':'ügy nélkül','export.save':'Csomag mentése ({count})',
  'security.title':'Adatvédelem és biztonság','security.biometric':'Biometrikus védelem (helyőrző)','security.pin':'PIN-zár (helyőrző)','security.sensitive':'Érzékeny dokumentumok védelme','security.cloud':'Felhőszinkronizálás','security.gmail':'Gmail-hozzáférés','security.ai':'MI-feldolgozás','security.autoLock':'Automatikus zárolás: {count} perc (helyőrző)','security.retention':'Megőrzés: {policy}','security.audit':'Integráció- és hozzáférés-ellenőrzés','security.auditText':'Gmail: {cloud} · MI: {ai} · Felhőmentés: {cloud}','security.profilesAccess':'Helyi hozzáférésű profilok: {profiles} · Tevékenységek: {count}',
  'backup.title':'Biztonsági mentés és visszaállítás','backup.privacy':'A mentés a jelszavaddal titkosított; a Drive-ba nem kerül titkosítatlan adat.','backup.drive':'Google Drive alkalmazásadatok','backup.connected':'Kapcsolódva','backup.disconnected':'Nincs kapcsolódva','backup.connect':'Google Drive csatlakoztatása','backup.disconnect':'Leválasztás','backup.configuration':'Az OAuth vagy a biztonságos titkosítás konfigurált fejlesztői környezetet igényel.','backup.prepared':'Visszaállítás előkészítése','backup.passphrase':'Mentési jelszó','backup.passphraseHint':'Nem mentjük el és nem naplózzuk.','backup.create':'Titkosított mentés készítése','backup.cancel':'Mentés megszakítása','backup.automatic':'Automatikus mentések egy mentés kézi feloldása után, ebben az alkalmazásmunkamenetben','backup.foreground':'Csak előtérben futnak, a módosítások után késleltetve; a jelszót nem tároljuk.','backup.discover':'Mentések keresése','backup.snapshots':'Elérhető mentések','backup.documentsAssets':'{documents} dokumentum · {assets} fájl · {size}','backup.prepareRestore':'Visszaállítás ellenőrzése','backup.conflicts':'{count} ütközés; a kézi ütközéseket nem írjuk felül.','backup.confirmRestore':'Visszaállítás kifejezett jóváhagyása','backup.delete':'Mentés törlése','backup.deleteTitle':'Törlöd a mentést?','backup.deleteMessage':'A titkosított mentés végleg törlődik a Google Drive-ból.','backup.export':'Titkosított helyi mentés exportálása','backup.import':'Titkosított helyi mentés importálása','backup.latestBackup':'Utolsó mentés: {time}','backup.latestRestore':'Utolsó visszaállítás: {time}','backup.newPhone':'Új telefon?','backup.newPhoneText':'Telepítsd a Documentát, csatlakoztasd ugyanazt a Google-fiókot, keresd meg a mentést és add meg a jelszavad. Az integrációkat és értesítéseket újra kell csatlakoztatni.','backup.noSnapshots':'Még nincs található mentés.',
  'modules.title':'Bővítmények','modules.status':'{name} · hamarosan · kikapcsolva','workspaces.title':'Család és üzlet','workspaces.hint':'Hamarosan · nincs aktív megosztás vagy integráció.','workspaces.family':'Család · Tagok: {count} · A szerepek és hozzáférések helyőrzők','workspaces.business':'Üzlet · A szervezet, tulajdonlás, megosztások és audit helyőrzők · Tagok: {count}',
  'contracts.title':'Szerződések és költségek','contracts.create':'Szerződés létrehozása','contracts.costCreate':'Rendszeres költség létrehozása','contracts.monitor':'Szerződésfigyelő','contracts.none':'Nincs figyelt szerződés.','contracts.costs':'Rendszeres költségek','contracts.noCosts':'Nincs rögzített rendszeres költség.','contracts.requiredContract':'A cím és a szolgáltató kötelező.','contracts.requiredCost':'A cím, szolgáltató, kategória és legalább egy összeg kötelező.','contracts.saveContract':'Szerződés mentése','contracts.saveCost':'Költség mentése','contracts.automaticRenewal':'Automatikus megújulás','contracts.fieldTitle':'Cím','contracts.fieldProvider':'Szolgáltató','contracts.fieldDocument':'Dokumentum','contracts.fieldStartDate':'Kezdő dátum','contracts.fieldEndDate':'Befejező dátum','contracts.fieldCancellationNotice':'Felmondási idő','contracts.fieldNextCancellationDate':'Következő felmondási dátum','contracts.fieldMonthlyFee':'Havi díj','contracts.fieldYearlyFee':'Éves díj','contracts.fieldNextCharge':'Következő terhelés','contracts.fieldContract':'Szerződés','contracts.fieldCategory':'Kategória','contracts.statusActive':'aktív','contracts.statusReview':'ellenőrzendő','contracts.statusEnded':'lezárt','contracts.statusCancelled':'felmondva','contracts.cadenceMonthly':'havonta','contracts.cadenceYearly':'évente',
  'compare.title':'Dokumentumok összehasonlítása','compare.hint':'Pontosan két aktív dokumentumot válassz.','compare.comparison':'Összehasonlítás','compare.unavailable':'A strukturált szerződéses feltételek még nem érhetők el.','compare.save':'Összehasonlítás mentése','compare.history':'Előzmények','compare.empty':'Még nincs mentett összehasonlítás.','compare.amount':'Összeg','compare.deadline':'Határidő','compare.type':'Dokumentumtípus',
};

const en: TranslationDictionary = {
  ...de,
  'settings.voiceSelection':'Local voice','settings.voiceRefresh':'Refresh voices','settings.voicePreview':'Preview voice','settings.voiceAutomatic':'Choose automatically','settings.voiceNone':'No matching local voice','settings.voiceQuality':'Quality',
  'common.back': 'Back', 'common.cancel': 'Cancel', 'common.save': 'Save', 'common.close': 'Close', 'common.edit': 'Edit',
  'common.review': 'Review', 'common.accept': 'Accept', 'common.reject': 'Reject', 'common.complete': 'Complete', 'common.next': 'Next',
  'common.done': 'Done', 'common.unknown': 'Unknown', 'common.none': 'None', 'common.documents': 'Documents', 'common.cases': 'Cases',
  'common.tasks': 'Tasks', 'common.due': 'Due', 'common.language': 'Language', 'common.documentLanguage': 'Document language',
  'common.uncertain': 'Uncertain', 'common.page': 'page', 'common.pages': 'pages', 'common.status': 'Status', 'common.priority': 'Priority',
  'common.high': 'high', 'common.medium': 'medium', 'common.low': 'low', 'common.open': 'open', 'common.loading': 'Loading …', 'common.error': 'Error',
  'nav.home': 'Home', 'nav.documents': 'Documents', 'nav.add': 'Add', 'nav.search': 'Search', 'nav.profile': 'Profile',
  'dashboard.kicker': 'DOCUMENTA', 'dashboard.title': 'Overview', 'dashboard.subtitle': 'Your local documents and tasks.',
  'dashboard.scan': 'Scan', 'dashboard.import': 'Import', 'dashboard.actions': 'Tasks', 'dashboard.assistant': 'Assistant',
  'dashboard.newDocuments': 'New documents', 'dashboard.newDocumentsSubtitle': 'New arrivals', 'dashboard.needsAction': 'Needs attention',
  'dashboard.needsActionSubtitle': 'Documents and cases with open steps', 'dashboard.upcomingDeadlines': 'Upcoming deadlines',
  'dashboard.upcomingDeadlinesSubtitle': 'Within the next seven days', 'dashboard.payable': 'Payable',
  'dashboard.payableSubtitle': 'Documents with payment status', 'dashboard.unresolvedCases': 'Unresolved cases',
  'dashboard.unresolvedCasesSubtitle': 'Not completed yet', 'dashboard.noItems': 'No items in this view',
  'documents.kicker': 'LIBRARY', 'documents.title': 'Documents', 'documents.subtitle': '{count} documents in one place',
  'documents.all': 'All', 'documents.emptyTitle': 'No documents here', 'documents.emptyText': 'Change the filter or add a new document.',
  'documents.add': 'Add document', 'documents.optimizedPdf': 'Optimized PDF', 'documents.original': 'Original',
  'document.title': 'Document', 'document.type': 'Document type', 'document.sender': 'Sender', 'document.date': 'Date',
  'document.amount': 'Amount', 'document.deadline': 'Deadline', 'document.language': 'Document language',
  'document.languageUnknown': 'Uncertain', 'document.ocrText': 'OCR text', 'document.noOcr': 'No readable OCR text available.',
  'document.noDocument': 'Document not found.', 'document.archive': 'Archive', 'document.trash': 'Trash', 'document.restore': 'Restore',
  'document.explain': 'Explain document', 'document.relationship': 'Add relationship', 'document.noOriginal': 'No original image available.',
  'intelligence.title': 'Local document intelligence', 'intelligence.review': 'Review', 'intelligence.evidenced': 'Evidenced',
  'intelligence.humanReview': 'Human review required', 'intelligence.pending': 'critical fields need review.', 'intelligence.reviewFields': 'Review fields',
  'intelligence.risk': 'Risk', 'intelligence.evidence': 'Evidence', 'intelligence.whatItMeans': 'What does this mean?',
  'intelligence.noAnalysis': 'No local analysis is available. No readable OCR text was saved for this document.',
  'intelligence.explanationUnsupported': 'A safe deterministic explanation adapter is not yet available for this language. Structured document data remains unchanged.',
  'review.needsReview': 'Review required', 'review.accepted': 'Accepted', 'review.rejected': 'Rejected', 'review.pending': 'Pending',
  'action.center': 'ACTION CENTER', 'action.title': 'Tasks & next steps', 'action.open': 'open', 'action.toReview': 'to review',
  'action.reminders': 'Reminders', 'action.drafts': 'Drafts', 'action.emptyTitle': 'No tasks in this view',
  'action.emptyText': 'Evidenced suggestions appear automatically. Uncertain data stays marked for review.', 'action.ownTask': 'Own task',
  'action.statusSuggested': 'Suggested', 'action.statusNeedsReview': 'Review', 'action.statusConfirmed': 'Confirmed',
  'action.statusInProgress': 'In progress', 'action.statusWaiting': 'Waiting', 'action.statusCompleted': 'Completed',
  'action.statusCancelled': 'Cancelled', 'action.statusRejected': 'Rejected', 'action.statusArchived': 'Archived', 'action.detail': 'Details',
  'action.history': 'History', 'action.confirm': 'Confirm', 'action.reopen': 'Reopen', 'action.cancel': 'Cancel', 'action.archive': 'Archive',
  'action.source': 'Source', 'action.evidence': 'Evidence', 'action.noEvidence': 'No linked evidence.', 'action.completeBlocked': 'Confirm the suggestion before completing it.',
  'automation.title': 'Automation', 'automation.subtitle': 'Local rules and safe candidates',
  'automation.localOnly': 'Local only: no emails are sent, payments run, or cloud services are activated.',
  'automation.noRules': 'No rules yet.', 'automation.reminderRule': 'Add safe reminder rule', 'automation.candidates': 'Candidates',
  'automation.noCandidates': 'No open candidates.', 'cases.title': 'Cases', 'cases.subtitle': 'Cases group documents, deadlines, and next steps.',
  'cases.new': 'Create new case', 'cases.empty': 'No cases yet. Create one for related documents.', 'cases.closureSafe': 'Case can be safely closed.',
  'cases.closureBlocked': 'Case cannot be closed yet.', 'reply.title': 'Reply draft', 'reply.language': 'Reply language',
  'reply.sourceFacts': 'Source facts used', 'reply.editedWarning': 'A manually edited draft will not be overwritten automatically.',
  'reply.recipient': 'Recipient', 'reply.subject': 'Subject', 'reply.body': 'Message', 'reply.generate': 'Create draft in this language',
  'reply.regenerateTitle': 'Replace edited draft?', 'reply.regenerateMessage': 'Your manual changes remain until you explicitly confirm regeneration.',
  'reply.unsupportedLanguage': 'A safe reply adapter is not yet available for this language. The existing draft will not be changed.',
  'settings.title': 'Settings', 'settings.subtitle': 'Your display is applied immediately in Documenta.', 'settings.appearance': 'Appearance & language',
  'settings.appLanguage': 'App language', 'settings.appLanguageHint': 'Language of the entire Documenta interface.',
  'settings.explanationLanguage': 'Explanation language', 'settings.explanationLanguageHint': 'Language of readable Document Intelligence explanations.',
  'settings.replyLanguage': 'Reply language', 'settings.replyLanguageHint': 'Language for new reply drafts; independent from document and interface.',
  'settings.theme': 'Appearance', 'settings.accent': 'Accent color', 'settings.fontSize': 'Font size', 'settings.explanationMode': 'Explanation mode',
  'settings.languageNames': 'English', 'settings.adapterSupported': 'Adapter available', 'settings.adapterUnsupported': 'Adapter not available yet',
  'settings.region':'Country / region','settings.regionHint':'Only future regional defaults change; existing documents remain unchanged.','settings.countrySearch':'Search country','settings.countryUnknown':'Not set yet','settings.translationMode':'Translation mode','settings.translationAutomatic':'Automatically when needed','settings.translationAskFirst':'Ask first','settings.translationOff':'Off','settings.explanationDisplayMode':'Explanation format','settings.explanationText':'Text','settings.explanationVoice':'Voice','settings.explanationTextVoice':'Text and voice','settings.voiceHint':'Voice reads the explanation text that was already created.',
  'onboarding.welcome': 'Welcome', 'onboarding.profile': 'Profile', 'onboarding.appLanguage': 'App language',
  'onboarding.explanations': 'Explanations', 'onboarding.reply': 'Replies', 'onboarding.privacy': 'Privacy', 'onboarding.modules': 'Modules',
  'onboarding.step': 'STEP {current}/{total}', 'onboarding.name': 'Your name', 'onboarding.finish': 'Finish setup', 'onboarding.next': 'Next',
  'onboarding.subtitle': 'Documenta organizes your documents locally and clearly.', 'onboarding.privacyText': 'Local storage and optional privacy settings are prepared now.',
  'onboarding.modulesText': 'Gmail, Voice, Calendar, Tax, Family, Business, and Enterprise are disabled coming-soon modules.',
  'onboarding.country':'Country / region','onboarding.countryPrompt':'Which country do you live in?','onboarding.languagePrompt':'Which language would you like to use Documenta in?','onboarding.explanationPrompt':'Which language would you like explanations in?','onboarding.translationMode':'Translations','onboarding.translationPrompt':'When should Documenta prepare a translation?','onboarding.replyPrompt':'Which language would you like to reply in?','onboarding.noUselessTranslation':'If the document already uses the selected language, it will not be translated unnecessarily.','onboarding.explanationIndependent':'You can request an explanation at any time regardless.','explanation.localKicker':'LOCAL DOCUMENT EXPLANATION','explanation.available':'Explanation available','explanation.unavailable':'No safe explanation is available for this language.','explanation.needsReview':'Uncertain details need review before explanation.','explanation.generated':'Explanation generated','explanation.translationState':'Translation','explanation.noTranslation':'Not needed','explanation.translationReady':'Local translation needed','explanation.translationAsk':'Confirmation required','explanation.translationDisabled':'Disabled','explanation.translationUnavailable':'No local translation adapter available','explanation.ask':'Ask question','explanation.placeholder':'Question about this document','explanation.history':'Questions and answers','explanation.clearHistory':'Clear history','explanation.newConversation':'New conversation','explanation.sources':'Sources','explanation.sourceField':'Source field','explanation.confidence':'Confidence','explanation.unsupportedQuestion':'I cannot safely answer this question from this document at present.','explanation.localOnly':'Only this document and explicitly linked, confirmed case data are used locally.','explanation.voiceTitle':'Read explanation aloud','explanation.voiceReadsText':'Voice reads the explanation, not the original document.','explanation.play':'Play','explanation.pause':'Pause','explanation.resume':'Resume','explanation.stop':'Stop','explanation.restart':'Restart','explanation.voiceUnavailable':'No suitable local voice is available on this device. The text explanation remains available.',
  'search.title': 'Search', 'search.placeholder': 'Title, sender, profile, category …', 'search.clear': 'Clear all filters',
  'search.profile': 'Profiles', 'search.category': 'Category', 'search.type': 'Document type', 'search.count': '{documents} documents · {cases} cases · {tasks} tasks',
  'error.notFound': 'Not found.', 'error.noReadableOcr': 'No readable OCR text saved.',
  'common.version': 'Version',
  'document.sampleNoOriginal': 'This sample document was saved without an image or PDF.', 'document.task': 'Task',
  'document.share': 'Share', 'document.print': 'Print', 'document.relationships': 'Relationships',
  'document.relatedCases': 'Related cases', 'document.documentRelationships': 'Document relationships',
  'document.linkToCase': 'Link to case', 'document.createRelationship': 'Create relationship',
  'document.saveRelationship': 'Save relationship', 'document.details': 'Document details', 'document.category': 'Category',
  'document.subcategory': 'Subcategory', 'document.payrollPeriod': 'Billing period', 'document.person': 'Person',
  'document.profiles': 'Profiles', 'document.tags': 'Tags', 'document.note': 'Note', 'document.localOcr': 'Local OCR',
  'document.ocrRecognized': '{count} characters recognized', 'document.uncertainFieldsReviewed': '{count} uncertain fields reviewed',
  'document.edit': 'Edit document', 'document.dueDate': 'Due date', 'document.tagsHint': 'Tags (comma-separated)',
  'document.assignedProfiles': 'Assigned profiles', 'document.saveChanges': 'Save changes',
  'document.actionUnavailable': 'Action unavailable', 'document.tryAgain': 'Please try again.',
  'document.referenceNumber': 'File number / reference', 'document.customerNumber': 'Customer number',
  'document.invoiceNumber': 'Invoice number', 'document.contractNumber': 'Contract number',
  'document.insuranceNumber': 'Insurance number', 'document.taxNumber': 'Tax number / ID',
  'document.patientNumber': 'Patient / case number', 'document.schoolReference': 'School / care reference',
  'document.relationshipPrevious': 'previous document', 'document.relationshipReply': 'reply',
  'document.relationshipReminder': 'reminder', 'document.relationshipPayment': 'payment', 'document.relationshipCompletion': 'completion',
  'intelligence.purpose': 'Purpose', 'intelligence.recipient': 'Recipient', 'intelligence.coreData': 'Recognized core data',
  'intelligence.whatIsIt': 'What is this?', 'intelligence.whatToDo': 'What do I need to do?', 'intelligence.byWhen': 'By when?',
  'intelligence.howMuch': 'How much?', 'intelligence.ifNoAction': 'What happens if I do nothing?',
  'intelligence.options': 'What options do I have?', 'intelligence.noConsequence': 'No explicitly evidenced consequence was found.',
  'intelligence.noOption': 'No explicitly evidenced option was found.', 'intelligence.nextDeadline': 'Next deadline',
  'intelligence.nextStep': 'Next step', 'intelligence.warningConsequence': 'Warning / consequence',
  'intelligence.mostImportant': 'Most important',
  'error.title': 'Not found', 'error.missingScreen': 'This screen does not exist.', 'error.goHome': 'Go to home screen',
  'assistant.kicker': 'LOCAL ASSISTANT', 'assistant.title': 'Ask Documenta',
  'assistant.available': 'Local, evidence-based data queries are ready.', 'assistant.unavailable': 'Local basic queries are available; enhanced assistant features are not enabled.',
  'assistant.promptDeadlines': 'Which deadlines were detected?', 'assistant.promptReview': 'Which documents do I need to review?', 'assistant.promptInvoices': 'Show my unpaid invoices.',
  'assistant.placeholder': 'Enter a question or search term', 'assistant.ask': 'Query locally',
  'assistant.results': '{count} local results: {titles}', 'assistant.noResults': 'No evidenced local results were found. No details were added or invented.',
  'assistant.localOnly': 'Only saved document data and local analysis results are used.',
  'assistant.scopeAll':'All documents','assistant.scopeDocument':'Document: {name}','assistant.scopeCase':'Case: {name}','assistant.resetContext':'New question about all documents','assistant.semanticLocal':'Local deterministic search – no embeddings or cloud AI.','assistant.history':'Search history','assistant.clearHistory':'Clear search history','assistant.clearConversation':'Clear conversation','assistant.rebuildIndex':'Rebuild local index','assistant.indexReady':'Index v{version} ready','assistant.archived':'Archived','assistant.why':'Why this result?','assistant.openDocument':'Open document','assistant.openCase':'Open case','assistant.openExplanation':'Open explanation','assistant.openTasks':'Open Task Center','assistant.moreResults':'More results','assistant.ambiguousTitle':'Several similar results','assistant.ambiguousText':'Choose the result you meant.','assistant.zeroResult':'I found no document that reliably supports this.','assistant.missingInformation':'I found the document, but the requested information is not reliably evidenced in it.','assistant.suggestedQuestions':'Possible next questions','assistant.questionSummary':'What is the key point?','assistant.questionDeadline':'Is there a deadline?','assistant.questionAction':'What do I need to do?','assistant.questionRelated':'Is there a related document?','assistant.questionChange':'What changed?','assistant.questionUncertainty':'What is uncertain?','assistant.confidence':'Relevance','assistant.resultDocuments':'Documents','assistant.resultCases':'Cases','assistant.resultActions':'Actions','assistant.foundDocument':'I found this document: {name}','assistant.foundCase':'I found this case: {name}','assistant.noConfirmedDeadline':'I found no reliably confirmed deadline.','assistant.noConfirmedAction':'I found no confirmed open action.','assistant.confirmedDeadline':'Confirmed deadline: {value}','assistant.confirmedAction':'Next confirmed step: {value}','assistant.localIndex':'The derived search index stays on this device.','assistant.resultReason':'Matching signals: {fields}',
  'journal.eyebrow': 'JOURNAL', 'journal.title': 'A little space for you.',
  'journal.intro': 'It does not need to sound polished. Just write down what feels true right now.',
  'journal.placeholder': 'Right now I feel…', 'journal.characters': '{count} characters',
  'journal.private': 'Your journal is yours alone.', 'journal.save': 'Save entry',
  'journal.previous': 'Earlier thoughts', 'journal.emptyTitle': 'Still empty.',
  'journal.emptyText': 'Your first entry will appear here.', 'journal.deleteHint': 'Long press to delete',
  'add.kicker':'NEW DOCUMENT','add.title':'Add document','add.intro':'Choose a source, then add all details.','add.source':'Choose source','add.scanning':'Starting scanner…','add.scanFeatures':'Edges · crop · PDF','add.image':'Image','add.gallery':'From gallery','add.files':'From files','add.devBuild':'Development Build required','add.privateTitle':'Private on your device','add.privateText':'In this version, documents and details stay stored locally.','add.emailTitle':'Email import is coming later','add.emailText':'Gmail and Outlook are intentionally not connected yet.','add.browserScanner':'No document scanner is available in the browser. Edge detection, automatic cropping, perspective correction, and the four-corner editor only run in the installed Android or iOS app.','add.expoScanner':'Expo Go cannot load the native document scanner. Open Documenta as a Development Build / Expo Dev Client. The Google ML Kit scanner runs on Android and the Apple VisionKit scanner on iOS.','add.scannerError':'The document scanner could not start. It requires a Development Build / Expo Dev Client with the native scanner module; Expo Go is not supported.','add.closeNotice':'Close notice',
  'scan.empty':'No scanned page available','scan.cancel':'Cancel scan','scan.kicker':'REVIEW SCAN','scan.preview':'Page preview','scan.processed':'Processed by scanner: edges · crop · perspective','scan.variantTitle':'PDF and OCR variant','scan.variantHint':'The unedited original is always kept as well.','scan.original':'Original','scan.clean':'Clean document','scan.blackWhite':'Black and white','scan.rescan':'Correct corners again','scan.remove':'Remove','scan.nativeTitle':'Real native document scan','scan.nativeText':'The native scanner detects all four paper edges, removes the background, and corrects perspective. Up to {count} pages are then individually optimized for a bright, high-contrast PDF.','scan.addPage':'Scan another page with edge detection','scan.creating':'Creating PDF…','scan.create':'Create and analyze PDF','scan.createSubtitle':'{count} {pages} · {variant} for PDF and OCR · local','scan.opening':'Opening scanner…','scan.enhancing':'Enhancing pages…','scan.recognizing':'Recognizing text and document type…','scan.limit':'A maximum of {count} high-resolution pages per document. Save the current scan, then start a new document.','scan.openError':'The scanner could not be reopened. Check camera access.','scan.lastPageTitle':'Last page','scan.lastPageText':'A document must contain at least one page.',
  'details.kicker':'FILE DOCUMENT','details.assetSelected':'Document selected','details.assetReady':'Ready to file','details.noAsset':'No file selected','details.scannedMeta':'{count} pages · original and optimized PDF saved','details.analysisComplete':'Local document analysis complete','details.noText':'No readable text detected','details.analysisUnavailable':'Document analysis unavailable','details.analysisCompleteText':'Suggestions were taken only from readable document text. Uncertain fields are marked and everything remains editable.','details.analysisManualText':'Please fill in the details manually. No data was added or invented.','details.requiredHint':'Required fields are marked with a clear label.','details.titleHint':'Only enter a title that is clearly supported by the document. You can edit it before saving.','details.uncertainHint':'Detected automatically · uncertain – please review','details.unresolvedHint':'Not found clearly in OCR text – please add manually','details.senderInstitution':'Sender / institution','details.documentDate':'Document date','details.optional':'optional','details.person':'Related person','details.personPlaceholder':'Name from the document or your own assignment','details.saving':'Saving file…','details.save':'Save document','details.duplicateTitle':'Possible duplicate','details.duplicateText':'A similar document already exists: {titles}. Save it anyway?','details.saveAnyway':'Save anyway','details.fileSaveError':'The file could not be saved.','details.iban':'IBAN',
  'archive.title':'Archive and trash','archive.retention':'Local retention: {policy} ({days} days). Items in the trash can be permanently deleted.','archive.archiveEmpty':'The archive is empty.','archive.trashEmpty':'The trash is empty.','archive.moveToTrash':'Move to trash','archive.moveTitle':'Move to trash?','archive.moveText':'The document can be permanently deleted from the trash.','archive.deleteTitle':'Delete permanently?','archive.deleteText':'This cannot be undone.','archive.deleteForever':'Delete permanently','archive.move':'Move',
  'archive.subtitle':'Organized by the document’s own date. Case origin and relevant periods stay separate.','archive.yearOverview':'Year overview','archive.currentYear':'Current year','archive.previousYear':'Previous year','archive.lastThreeYears':'Last 3 years','archive.allYears':'All years','archive.unknownYear':'Unknown year','archive.olderYears':'Older years','archive.documentsCount':'{count} documents','archive.searchPlaceholder':'Search title, sender, category, or type','archive.reviewQueue':'Quick review of older documents','archive.reviewHint':'Uncertain, conflicting, or duplicate data is never confirmed automatically.','archive.bulkAccept':'Accept safe proposals in bulk','archive.bulkBlocked':'Only high-confidence, evidenced, conflict-free proposals can be accepted in bulk.','archive.archiveYear':'Archive year','archive.receivedDate':'Received date','archive.importedAt':'Imported at','archive.relevantPeriod':'Relevant period','archive.manual':'Manually confirmed','archive.automatic':'Automatic proposal','archive.duplicateWarning':'Possible duplicate – no automatic deletion','archive.sameDocument':'Same document','archive.separateDocument':'Separate document','archive.dontKnow':'I don’t know','archive.later':'Later','archive.noResults':'No documents match these filters.','archive.month':'Month {month}',
  'timeline.title':'Timeline','timeline.documentCreated':'Document created','timeline.documentReceived':'Document received','timeline.documentImported':'Document imported','timeline.deadlineDetected':'Deadline detected','timeline.actionCreated':'Action created','timeline.actionCompleted':'Action completed','timeline.actionStatusChanged':'Action status changed','timeline.reviewAccepted':'Review accepted','timeline.reviewCorrected':'Review corrected','timeline.replyDraft':'Reply draft created','timeline.followUp':'Follow-up created','timeline.relationshipCreated':'Document relationship created','timeline.caseOpened':'Case opened','timeline.caseStatusChanged':'Case status changed','timeline.caseClosed':'Case closed','timeline.caseHistory':'Case history',
  'activity.title':'Activity','activity.subtitle':'Local changes to documents, cases, tasks, archive, and exports.','activity.empty':'No activity yet. New actions appear here.','notifications.title':'Notifications','notifications.empty':'No notifications.',
  'export.title':'Export package','export.hint':'Only a local package is prepared; no file is generated.','export.activeDocuments':'Active documents','export.noDocuments':'No active documents.','export.recipient':'Recipient (optional)','export.case':'Optional case','export.toc':'Prepare automatic table of contents','export.order':'Order and table of contents','export.noCase':'without case','export.save':'Save package ({count})',
  'security.title':'Privacy and security','security.biometric':'Biometric protection (placeholder)','security.pin':'PIN lock (placeholder)','security.sensitive':'Protect sensitive documents','security.cloud':'Cloud synchronization','security.gmail':'Gmail access','security.ai':'AI processing','security.autoLock':'Automatic lock: {count} minutes (placeholder)','security.retention':'Retention: {policy}','security.audit':'Integration and access audit','security.auditText':'Gmail: {cloud} · AI: {ai} · Cloud backup: {cloud}','security.profilesAccess':'Profiles with local access: {profiles} · Activities: {count}',
  'backup.title':'Backup and recovery','backup.privacy':'Encrypted with your passphrase. No plaintext is stored in Drive.','backup.drive':'Google Drive app data','backup.connected':'Connected','backup.disconnected':'Not connected','backup.connect':'Connect Google Drive','backup.disconnect':'Disconnect','backup.configuration':'OAuth or secure encryption requires a configured development build.','backup.prepared':'Preparing recovery','backup.passphrase':'Backup passphrase','backup.passphraseHint':'It is never stored or logged.','backup.create':'Create encrypted backup now','backup.cancel':'Cancel backup','backup.automatic':'Automatic backups after manually unlocking a backup in this app session','backup.foreground':'They run only in the foreground and are debounced after changes; the passphrase is not persisted.','backup.discover':'Find backups','backup.snapshots':'Available backups','backup.documentsAssets':'{documents} documents · {assets} files · {size}','backup.prepareRestore':'Review recovery','backup.conflicts':'{count} conflicts; manual conflicts are never overwritten.','backup.confirmRestore':'Explicitly confirm recovery','backup.delete':'Delete backup','backup.deleteTitle':'Delete backup?','backup.deleteMessage':'This encrypted backup will be permanently deleted from Google Drive.','backup.export':'Export encrypted local backup','backup.import':'Import encrypted local backup','backup.latestBackup':'Latest backup: {time}','backup.latestRestore':'Latest recovery: {time}','backup.newPhone':'New phone?','backup.newPhoneText':'Install Documenta, connect the same Google account, find your backup, and enter your passphrase. Integrations and notifications must then be reconnected.','backup.noSnapshots':'No backups found yet.',
  'modules.title':'Extensions','modules.status':'{name} · coming soon · disabled','workspaces.title':'Family and business','workspaces.hint':'Coming soon · no sharing or integrations are active.','workspaces.family':'Family · Members: {count} · Roles and access are placeholders','workspaces.business':'Business · Organization, ownership, sharing, and audit are placeholders · Members: {count}',
  'contracts.title':'Contracts and costs','contracts.create':'Create contract','contracts.costCreate':'Create recurring cost','contracts.monitor':'Contract monitor','contracts.none':'No contracts monitored.','contracts.costs':'Recurring costs','contracts.noCosts':'No recurring costs saved.','contracts.requiredContract':'Title and provider are required.','contracts.requiredCost':'Title, provider, category, and at least one amount are required.','contracts.saveContract':'Save contract','contracts.saveCost':'Save cost','contracts.automaticRenewal':'Automatic renewal','contracts.fieldTitle':'Title','contracts.fieldProvider':'Provider','contracts.fieldDocument':'Document','contracts.fieldStartDate':'Start date','contracts.fieldEndDate':'End date','contracts.fieldCancellationNotice':'Cancellation notice','contracts.fieldNextCancellationDate':'Next cancellation date','contracts.fieldMonthlyFee':'Monthly fee','contracts.fieldYearlyFee':'Yearly fee','contracts.fieldNextCharge':'Next charge','contracts.fieldContract':'Contract','contracts.fieldCategory':'Category','contracts.statusActive':'active','contracts.statusReview':'review','contracts.statusEnded':'ended','contracts.statusCancelled':'cancelled','contracts.cadenceMonthly':'monthly','contracts.cadenceYearly':'yearly',
  'compare.title':'Compare documents','compare.hint':'Select exactly two active documents.','compare.comparison':'Comparison','compare.unavailable':'Structured contract terms are not available yet.','compare.save':'Save comparison','compare.history':'History','compare.empty':'No saved comparisons yet.','compare.amount':'Amount','compare.deadline':'Deadline','compare.type':'Document type',
};

const newLocaleOverrides: Record<Exclude<AppLanguage, 'de' | 'hu' | 'en'>, Partial<Record<TranslationKey, string>>> = {
  ro: {'settings.region':'Țară / regiune','settings.regionHint':'Se schimbă doar setările regionale viitoare; documentele existente rămân neschimbate.','settings.countrySearch':'Caută țara','settings.countryUnknown':'Încă nesetat','settings.translationMode':'Mod de traducere','settings.translationAutomatic':'Automat când este nevoie','settings.translationAskFirst':'Întreabă mai întâi','settings.translationOff':'Dezactivat','settings.explanationDisplayMode':'Afișarea explicației','settings.explanationText':'Text','settings.explanationVoice':'Voce','settings.explanationTextVoice':'Text și voce','settings.voiceHint':'Vocea citește explicația deja creată.','onboarding.country':'Țară / regiune','onboarding.countryPrompt':'În ce țară locuiești?','onboarding.languagePrompt':'În ce limbă vrei să folosești Documenta?','onboarding.explanationPrompt':'În ce limbă vrei explicațiile?','onboarding.translationMode':'Traduceri','onboarding.translationPrompt':'Când să pregătească Documenta o traducere?','onboarding.replyPrompt':'În ce limbă vrei să răspunzi?','onboarding.noUselessTranslation':'Documentele deja în limba selectată nu sunt traduse inutil.','onboarding.explanationIndependent':'Poți cere oricând o explicație, independent.','explanation.localKicker':'EXPLICAȚIE LOCALĂ A DOCUMENTULUI','explanation.available':'Explicație disponibilă','explanation.unavailable':'Nu este disponibilă o explicație sigură pentru această limbă.','explanation.needsReview':'Detaliile nesigure trebuie verificate înainte de explicație.','explanation.generated':'Explicație creată','explanation.translationState':'Traducere','explanation.noTranslation':'Nu este necesară','explanation.translationReady':'Este necesară traducerea locală','explanation.translationAsk':'Este necesară confirmarea','explanation.translationDisabled':'Dezactivată','explanation.translationUnavailable':'Nu există traducere locală disponibilă','explanation.ask':'Pune o întrebare','explanation.placeholder':'Întrebare despre acest document','explanation.history':'Întrebări și răspunsuri','explanation.clearHistory':'Șterge istoricul','explanation.newConversation':'Conversație nouă','explanation.sources':'Surse','explanation.sourceField':'Câmp sursă','explanation.confidence':'Încredere','explanation.unsupportedQuestion':'Nu pot răspunde în siguranță la această întrebare din acest document.','explanation.localOnly':'Sunt folosite local doar acest document și datele confirmate ale dosarului asociat.','explanation.voiceTitle':'Citește explicația','explanation.voiceReadsText':'Vocea citește explicația, nu documentul original.','explanation.play':'Redă','explanation.pause':'Pauză','explanation.resume':'Reia','explanation.stop':'Oprește','explanation.restart':'Repornește','explanation.voiceUnavailable':'Nu există o voce locală potrivită pe acest dispozitiv. Explicația text rămâne disponibilă.'},
  pl: {'settings.region':'Kraj / region','settings.regionHint':'Zmieniają się tylko przyszłe ustawienia regionalne; istniejące dokumenty pozostają bez zmian.','settings.countrySearch':'Szukaj kraju','settings.countryUnknown':'Jeszcze nie ustawiono','settings.translationMode':'Tryb tłumaczenia','settings.translationAutomatic':'Automatycznie, gdy potrzeba','settings.translationAskFirst':'Zapytaj najpierw','settings.translationOff':'Wyłączone','settings.explanationDisplayMode':'Forma wyjaśnienia','settings.explanationText':'Tekst','settings.explanationVoice':'Głos','settings.explanationTextVoice':'Tekst i głos','settings.voiceHint':'Głos odczytuje już utworzone wyjaśnienie.','onboarding.country':'Kraj / region','onboarding.countryPrompt':'W jakim kraju mieszkasz?','onboarding.languagePrompt':'W jakim języku chcesz używać Documenta?','onboarding.explanationPrompt':'W jakim języku chcesz otrzymywać wyjaśnienia?','onboarding.translationMode':'Tłumaczenia','onboarding.translationPrompt':'Kiedy Documenta ma przygotować tłumaczenie?','onboarding.replyPrompt':'W jakim języku chcesz odpowiadać?','onboarding.noUselessTranslation':'Dokument w wybranym języku nie będzie tłumaczony niepotrzebnie.','onboarding.explanationIndependent':'Niezależnie od tego możesz zawsze poprosić o wyjaśnienie.','explanation.localKicker':'LOKALNE WYJAŚNIENIE DOKUMENTU','explanation.available':'Wyjaśnienie dostępne','explanation.unavailable':'Bezpieczne wyjaśnienie nie jest dostępne dla tego języka.','explanation.needsReview':'Niepewne dane wymagają sprawdzenia przed wyjaśnieniem.','explanation.generated':'Utworzono wyjaśnienie','explanation.translationState':'Tłumaczenie','explanation.noTranslation':'Niepotrzebne','explanation.translationReady':'Potrzebne lokalne tłumaczenie','explanation.translationAsk':'Wymagane potwierdzenie','explanation.translationDisabled':'Wyłączone','explanation.translationUnavailable':'Lokalne tłumaczenie niedostępne','explanation.ask':'Zadaj pytanie','explanation.placeholder':'Pytanie o ten dokument','explanation.history':'Pytania i odpowiedzi','explanation.clearHistory':'Wyczyść historię','explanation.newConversation':'Nowa rozmowa','explanation.sources':'Źródła','explanation.sourceField':'Pole źródłowe','explanation.confidence':'Pewność','explanation.unsupportedQuestion':'Nie mogę bezpiecznie odpowiedzieć na to pytanie na podstawie tego dokumentu.','explanation.localOnly':'Lokalnie używane są tylko ten dokument i wyraźnie powiązane, potwierdzone dane sprawy.','explanation.voiceTitle':'Odczytaj wyjaśnienie','explanation.voiceReadsText':'Głos odczytuje wyjaśnienie, nie oryginalny dokument.','explanation.play':'Odtwórz','explanation.pause':'Wstrzymaj','explanation.resume':'Wznów','explanation.stop':'Zatrzymaj','explanation.restart':'Uruchom ponownie','explanation.voiceUnavailable':'Na tym urządzeniu nie ma odpowiedniego lokalnego głosu. Wyjaśnienie tekstowe pozostaje dostępne.'},
  sk: {'settings.region':'Krajina / región','settings.regionHint':'Zmenia sa len budúce regionálne nastavenia; existujúce dokumenty zostanú nezmenené.','settings.countrySearch':'Hľadať krajinu','settings.countryUnknown':'Zatiaľ nenastavené','settings.translationMode':'Režim prekladu','settings.translationAutomatic':'Automaticky podľa potreby','settings.translationAskFirst':'Najprv sa opýtať','settings.translationOff':'Vypnuté','settings.explanationDisplayMode':'Zobrazenie vysvetlenia','settings.explanationText':'Text','settings.explanationVoice':'Hlas','settings.explanationTextVoice':'Text a hlas','settings.voiceHint':'Hlas prečíta už vytvorené vysvetlenie.','onboarding.country':'Krajina / región','onboarding.countryPrompt':'V ktorej krajine žijete?','onboarding.languagePrompt':'V akom jazyku chcete používať Documenta?','onboarding.explanationPrompt':'V akom jazyku chcete vysvetlenia?','onboarding.translationMode':'Preklady','onboarding.translationPrompt':'Kedy má Documenta pripraviť preklad?','onboarding.replyPrompt':'V akom jazyku chcete odpovedať?','onboarding.noUselessTranslation':'Dokument v zvolenom jazyku sa nebude zbytočne prekladať.','onboarding.explanationIndependent':'O vysvetlenie môžete požiadať kedykoľvek nezávisle od toho.','explanation.localKicker':'MIESTNE VYSVETLENIE DOKUMENTU','explanation.available':'Vysvetlenie je dostupné','explanation.unavailable':'Pre tento jazyk nie je dostupné bezpečné vysvetlenie.','explanation.needsReview':'Neisté údaje treba pred vysvetlením skontrolovať.','explanation.generated':'Vysvetlenie vytvorené','explanation.translationState':'Preklad','explanation.noTranslation':'Nie je potrebný','explanation.translationReady':'Je potrebný miestny preklad','explanation.translationAsk':'Vyžaduje sa potvrdenie','explanation.translationDisabled':'Vypnuté','explanation.translationUnavailable':'Miestny preklad nie je dostupný','explanation.ask':'Položiť otázku','explanation.placeholder':'Otázka k tomuto dokumentu','explanation.history':'Otázky a odpovede','explanation.clearHistory':'Vymazať históriu','explanation.newConversation':'Nový rozhovor','explanation.sources':'Zdroje','explanation.sourceField':'Zdrojové pole','explanation.confidence':'Istota','explanation.unsupportedQuestion':'Na túto otázku z tohto dokumentu teraz nemôžem bezpečne odpovedať.','explanation.localOnly':'Miestne sa použije len tento dokument a výslovne prepojené, potvrdené údaje prípadu.','explanation.voiceTitle':'Prečítať vysvetlenie','explanation.voiceReadsText':'Hlas číta vysvetlenie, nie pôvodný dokument.','explanation.play':'Prehrať','explanation.pause':'Pozastaviť','explanation.resume':'Pokračovať','explanation.stop':'Zastaviť','explanation.restart':'Spustiť znova','explanation.voiceUnavailable':'Na tomto zariadení nie je vhodný miestny hlas. Textové vysvetlenie zostáva dostupné.'},
  uk: {'settings.region':'Країна / регіон','settings.regionHint':'Зміняться лише майбутні регіональні налаштування; наявні документи не зміняться.','settings.countrySearch':'Шукати країну','settings.countryUnknown':'Ще не встановлено','settings.translationMode':'Режим перекладу','settings.translationAutomatic':'Автоматично за потреби','settings.translationAskFirst':'Спочатку запитати','settings.translationOff':'Вимкнено','settings.explanationDisplayMode':'Відображення пояснення','settings.explanationText':'Текст','settings.explanationVoice':'Голос','settings.explanationTextVoice':'Текст і голос','settings.voiceHint':'Голос читає вже створене пояснення.','onboarding.country':'Країна / регіон','onboarding.countryPrompt':'У якій країні ви живете?','onboarding.languagePrompt':'Якою мовою ви хочете користуватися Documenta?','onboarding.explanationPrompt':'Якою мовою ви хочете отримувати пояснення?','onboarding.translationMode':'Переклади','onboarding.translationPrompt':'Коли Documenta має підготувати переклад?','onboarding.replyPrompt':'Якою мовою ви хочете відповідати?','onboarding.noUselessTranslation':'Документ вибраною мовою не перекладатиметься без потреби.','onboarding.explanationIndependent':'Незалежно від цього ви можете будь-коли попросити пояснення.','explanation.localKicker':'ЛОКАЛЬНЕ ПОЯСНЕННЯ ДОКУМЕНТА','explanation.available':'Пояснення доступне','explanation.unavailable':'Для цієї мови безпечне пояснення недоступне.','explanation.needsReview':'Невизначені дані слід перевірити перед поясненням.','explanation.generated':'Пояснення створено','explanation.translationState':'Переклад','explanation.noTranslation':'Не потрібен','explanation.translationReady':'Потрібен локальний переклад','explanation.translationAsk':'Потрібне підтвердження','explanation.translationDisabled':'Вимкнено','explanation.translationUnavailable':'Локальний переклад недоступний','explanation.ask':'Поставити запитання','explanation.placeholder':'Запитання про цей документ','explanation.history':'Запитання та відповіді','explanation.clearHistory':'Очистити історію','explanation.newConversation':'Нова розмова','explanation.sources':'Джерела','explanation.sourceField':'Поле джерела','explanation.confidence':'Впевненість','explanation.unsupportedQuestion':'Я не можу безпечно відповісти на це запитання з цього документа.','explanation.localOnly':'Локально використовуються лише цей документ і явно пов’язані підтверджені дані справи.','explanation.voiceTitle':'Озвучити пояснення','explanation.voiceReadsText':'Голос читає пояснення, а не оригінальний документ.','explanation.play':'Відтворити','explanation.pause':'Пауза','explanation.resume':'Продовжити','explanation.stop':'Зупинити','explanation.restart':'Почати знову','explanation.voiceUnavailable':'На цьому пристрої немає відповідного локального голосу. Текстове пояснення залишається доступним.'},
  tr: {'settings.region':'Ülke / bölge','settings.regionHint':'Yalnızca gelecekteki bölgesel ayarlar değişir; mevcut belgeler değişmeden kalır.','settings.countrySearch':'Ülke ara','settings.countryUnknown':'Henüz ayarlanmadı','settings.translationMode':'Çeviri modu','settings.translationAutomatic':'Gerektiğinde otomatik','settings.translationAskFirst':'Önce sor','settings.translationOff':'Kapalı','settings.explanationDisplayMode':'Açıklama gösterimi','settings.explanationText':'Metin','settings.explanationVoice':'Ses','settings.explanationTextVoice':'Metin ve ses','settings.voiceHint':'Ses, önceden oluşturulan açıklamayı okur.','onboarding.country':'Ülke / bölge','onboarding.countryPrompt':'Hangi ülkede yaşıyorsunuz?','onboarding.languagePrompt':'Documenta’yı hangi dilde kullanmak istersiniz?','onboarding.explanationPrompt':'Açıklamaları hangi dilde istersiniz?','onboarding.translationMode':'Çeviriler','onboarding.translationPrompt':'Documenta çeviriyi ne zaman hazırlasın?','onboarding.replyPrompt':'Hangi dilde yanıt vermek istersiniz?','onboarding.noUselessTranslation':'Belge seçilen dildeyse gereksiz yere çevrilmez.','onboarding.explanationIndependent':'Bundan bağımsız olarak istediğiniz zaman açıklama isteyebilirsiniz.','explanation.localKicker':'YEREL BELGE AÇIKLAMASI','explanation.available':'Açıklama mevcut','explanation.unavailable':'Bu dil için güvenli açıklama yok.','explanation.needsReview':'Belirsiz bilgiler açıklamadan önce gözden geçirilmeli.','explanation.generated':'Açıklama oluşturuldu','explanation.translationState':'Çeviri','explanation.noTranslation':'Gerekli değil','explanation.translationReady':'Yerel çeviri gerekli','explanation.translationAsk':'Onay gerekli','explanation.translationDisabled':'Devre dışı','explanation.translationUnavailable':'Yerel çeviri yok','explanation.ask':'Soru sor','explanation.placeholder':'Bu belge hakkında soru','explanation.history':'Sorular ve yanıtlar','explanation.clearHistory':'Geçmişi temizle','explanation.newConversation':'Yeni konuşma','explanation.sources':'Kaynaklar','explanation.sourceField':'Kaynak alanı','explanation.confidence':'Güven','explanation.unsupportedQuestion':'Bu belgeden bu soruyu şu anda güvenle yanıtlayamıyorum.','explanation.localOnly':'Yalnızca bu belge ve açıkça bağlı, onaylanmış dosya verileri yerel olarak kullanılır.','explanation.voiceTitle':'Açıklamayı sesli oku','explanation.voiceReadsText':'Ses, özgün belgeyi değil açıklamayı okur.','explanation.play':'Oynat','explanation.pause':'Duraklat','explanation.resume':'Sürdür','explanation.stop':'Durdur','explanation.restart':'Yeniden başlat','explanation.voiceUnavailable':'Bu cihazda uygun yerel ses yok. Metin açıklaması kullanılabilir durumda kalır.'},
  ar: {'settings.region':'البلد / المنطقة','settings.regionHint':'تتغير الإعدادات الإقليمية المستقبلية فقط؛ تبقى المستندات الحالية دون تغيير.','settings.countrySearch':'ابحث عن بلد','settings.countryUnknown':'لم يُحدد بعد','settings.translationMode':'وضع الترجمة','settings.translationAutomatic':'تلقائياً عند الحاجة','settings.translationAskFirst':'اسأل أولاً','settings.translationOff':'إيقاف','settings.explanationDisplayMode':'عرض الشرح','settings.explanationText':'نص','settings.explanationVoice':'صوت','settings.explanationTextVoice':'نص وصوت','settings.voiceHint':'يقرأ الصوت الشرح الذي تم إنشاؤه بالفعل.','onboarding.country':'البلد / المنطقة','onboarding.countryPrompt':'في أي بلد تعيش؟','onboarding.languagePrompt':'بأي لغة تريد استخدام Documenta؟','onboarding.explanationPrompt':'بأي لغة تريد الشروحات؟','onboarding.translationMode':'الترجمات','onboarding.translationPrompt':'متى يجب أن تُعِد Documenta ترجمة؟','onboarding.replyPrompt':'بأي لغة تريد الرد؟','onboarding.noUselessTranslation':'لن يُترجم المستند بلا حاجة إذا كان بالفعل باللغة المختارة.','onboarding.explanationIndependent':'يمكنك طلب شرح في أي وقت بشكل مستقل.','explanation.localKicker':'شرح المستند المحلي','explanation.available':'الشرح متاح','explanation.unavailable':'لا يتوفر شرح آمن لهذه اللغة.','explanation.needsReview':'يجب مراجعة التفاصيل غير المؤكدة قبل الشرح.','explanation.generated':'تم إنشاء الشرح','explanation.translationState':'الترجمة','explanation.noTranslation':'غير مطلوبة','explanation.translationReady':'الترجمة المحلية مطلوبة','explanation.translationAsk':'التأكيد مطلوب','explanation.translationDisabled':'معطلة','explanation.translationUnavailable':'لا تتوفر ترجمة محلية','explanation.ask':'اطرح سؤالاً','explanation.placeholder':'سؤال عن هذا المستند','explanation.history':'الأسئلة والأجوبة','explanation.clearHistory':'امسح السجل','explanation.newConversation':'محادثة جديدة','explanation.sources':'المصادر','explanation.sourceField':'حقل المصدر','explanation.confidence':'الثقة','explanation.unsupportedQuestion':'لا أستطيع الإجابة عن هذا السؤال بأمان من هذا المستند حالياً.','explanation.localOnly':'يُستخدم محلياً هذا المستند وبيانات الملف المؤكدة والمرتبطة صراحةً فقط.','explanation.voiceTitle':'اقرأ الشرح بصوت','explanation.voiceReadsText':'يقرأ الصوت الشرح لا المستند الأصلي.','explanation.play':'تشغيل','explanation.pause':'إيقاف مؤقت','explanation.resume':'استئناف','explanation.stop':'إيقاف','explanation.restart':'إعادة التشغيل','explanation.voiceUnavailable':'لا يتوفر صوت محلي مناسب على هذا الجهاز. يبقى الشرح النصي متاحاً.'},
  cs: {'settings.region':'Země / region','settings.regionHint':'Změní se jen budoucí regionální nastavení; stávající dokumenty zůstanou beze změny.','settings.countrySearch':'Hledat zemi','settings.countryUnknown':'Zatím nenastaveno','settings.translationMode':'Režim překladu','settings.translationAutomatic':'Automaticky podle potřeby','settings.translationAskFirst':'Nejprve se zeptat','settings.translationOff':'Vypnuto','settings.explanationDisplayMode':'Zobrazení vysvětlení','settings.explanationText':'Text','settings.explanationVoice':'Hlas','settings.explanationTextVoice':'Text a hlas','settings.voiceHint':'Hlas přečte již vytvořené vysvětlení.','onboarding.country':'Země / region','onboarding.countryPrompt':'V jaké zemi žijete?','onboarding.languagePrompt':'V jakém jazyce chcete používat Documenta?','onboarding.explanationPrompt':'V jakém jazyce chcete vysvětlení?','onboarding.translationMode':'Překlady','onboarding.translationPrompt':'Kdy má Documenta připravit překlad?','onboarding.replyPrompt':'V jakém jazyce chcete odpovídat?','onboarding.noUselessTranslation':'Dokument ve zvoleném jazyce se nebude zbytečně překládat.','onboarding.explanationIndependent':'O vysvětlení můžete požádat kdykoli nezávisle na tom.','explanation.localKicker':'MÍSTNÍ VYSVĚTLENÍ DOKUMENTU','explanation.available':'Vysvětlení je dostupné','explanation.unavailable':'Pro tento jazyk není bezpečné vysvětlení dostupné.','explanation.needsReview':'Nejisté údaje je třeba před vysvětlením zkontrolovat.','explanation.generated':'Vysvětlení vytvořeno','explanation.translationState':'Překlad','explanation.noTranslation':'Není potřeba','explanation.translationReady':'Je potřeba místní překlad','explanation.translationAsk':'Vyžaduje potvrzení','explanation.translationDisabled':'Vypnuto','explanation.translationUnavailable':'Místní překlad není dostupný','explanation.ask':'Položit otázku','explanation.placeholder':'Otázka k tomuto dokumentu','explanation.history':'Otázky a odpovědi','explanation.clearHistory':'Vymazat historii','explanation.newConversation':'Nový rozhovor','explanation.sources':'Zdroje','explanation.sourceField':'Zdrojové pole','explanation.confidence':'Jistota','explanation.unsupportedQuestion':'Na tuto otázku z tohoto dokumentu nyní nemohu bezpečně odpovědět.','explanation.localOnly':'Místně se použije jen tento dokument a výslovně propojené, potvrzené údaje případu.','explanation.voiceTitle':'Přečíst vysvětlení','explanation.voiceReadsText':'Hlas čte vysvětlení, ne původní dokument.','explanation.play':'Přehrát','explanation.pause':'Pozastavit','explanation.resume':'Pokračovat','explanation.stop':'Zastavit','explanation.restart':'Spustit znovu','explanation.voiceUnavailable':'Na tomto zařízení není vhodný místní hlas. Textové vysvětlení zůstává dostupné.'},
  bg: {'settings.region':'Държава / регион','settings.regionHint':'Променят се само бъдещите регионални настройки; текущите документи остават непроменени.','settings.countrySearch':'Търсене на държава','settings.countryUnknown':'Още не е зададено','settings.translationMode':'Режим на превод','settings.translationAutomatic':'Автоматично при нужда','settings.translationAskFirst':'Питай първо','settings.translationOff':'Изключено','settings.explanationDisplayMode':'Показване на обяснението','settings.explanationText':'Текст','settings.explanationVoice':'Глас','settings.explanationTextVoice':'Текст и глас','settings.voiceHint':'Гласът прочита вече създаденото обяснение.','onboarding.country':'Държава / регион','onboarding.countryPrompt':'В коя държава живеете?','onboarding.languagePrompt':'На какъв език искате да използвате Documenta?','onboarding.explanationPrompt':'На какъв език искате обясненията?','onboarding.translationMode':'Преводи','onboarding.translationPrompt':'Кога Documenta да подготви превод?','onboarding.replyPrompt':'На какъв език искате да отговаряте?','onboarding.noUselessTranslation':'Документ на избрания език няма да се превежда излишно.','onboarding.explanationIndependent':'Можете да поискате обяснение по всяко време независимо от това.','explanation.localKicker':'ЛОКАЛНО ОБЯСНЕНИЕ НА ДОКУМЕНТА','explanation.available':'Обяснението е налично','explanation.unavailable':'За този език няма безопасно обяснение.','explanation.needsReview':'Несигурните данни трябва да се прегледат преди обяснението.','explanation.generated':'Обяснението е създадено','explanation.translationState':'Превод','explanation.noTranslation':'Не е нужен','explanation.translationReady':'Нужен е локален превод','explanation.translationAsk':'Нужно е потвърждение','explanation.translationDisabled':'Изключено','explanation.translationUnavailable':'Няма локален превод','explanation.ask':'Задай въпрос','explanation.placeholder':'Въпрос за този документ','explanation.history':'Въпроси и отговори','explanation.clearHistory':'Изчисти историята','explanation.newConversation':'Нов разговор','explanation.sources':'Източници','explanation.sourceField':'Поле източник','explanation.confidence':'Увереност','explanation.unsupportedQuestion':'Не мога безопасно да отговоря на този въпрос от този документ.','explanation.localOnly':'Локално се използват само този документ и изрично свързани, потвърдени данни по случая.','explanation.voiceTitle':'Прочети обяснението','explanation.voiceReadsText':'Гласът чете обяснението, не оригиналния документ.','explanation.play':'Пусни','explanation.pause':'Пауза','explanation.resume':'Продължи','explanation.stop':'Спри','explanation.restart':'Започни отново','explanation.voiceUnavailable':'На това устройство няма подходящ локален глас. Текстовото обяснение остава налично.'},
  hr: {'settings.region':'Država / regija','settings.regionHint':'Mijenjaju se samo buduće regionalne postavke; postojeći dokumenti ostaju nepromijenjeni.','settings.countrySearch':'Pretraži državu','settings.countryUnknown':'Još nije postavljeno','settings.translationMode':'Način prijevoda','settings.translationAutomatic':'Automatski po potrebi','settings.translationAskFirst':'Najprije pitaj','settings.translationOff':'Isključeno','settings.explanationDisplayMode':'Prikaz objašnjenja','settings.explanationText':'Tekst','settings.explanationVoice':'Glas','settings.explanationTextVoice':'Tekst i glas','settings.voiceHint':'Glas čita već izrađeno objašnjenje.','onboarding.country':'Država / regija','onboarding.countryPrompt':'U kojoj zemlji živite?','onboarding.languagePrompt':'Na kojem jeziku želite koristiti Documenta?','onboarding.explanationPrompt':'Na kojem jeziku želite objašnjenja?','onboarding.translationMode':'Prijevodi','onboarding.translationPrompt':'Kada Documenta treba pripremiti prijevod?','onboarding.replyPrompt':'Na kojem jeziku želite odgovoriti?','onboarding.noUselessTranslation':'Dokument na odabranom jeziku neće se nepotrebno prevoditi.','onboarding.explanationIndependent':'Objašnjenje možete zatražiti bilo kada, neovisno o tome.','explanation.localKicker':'LOKALNO OBJAŠNJENJE DOKUMENTA','explanation.available':'Objašnjenje je dostupno','explanation.unavailable':'Sigurno objašnjenje nije dostupno za ovaj jezik.','explanation.needsReview':'Nesigurne podatke treba provjeriti prije objašnjenja.','explanation.generated':'Objašnjenje je izrađeno','explanation.translationState':'Prijevod','explanation.noTranslation':'Nije potreban','explanation.translationReady':'Potreban je lokalni prijevod','explanation.translationAsk':'Potrebna je potvrda','explanation.translationDisabled':'Isključeno','explanation.translationUnavailable':'Lokalni prijevod nije dostupan','explanation.ask':'Postavi pitanje','explanation.placeholder':'Pitanje o ovom dokumentu','explanation.history':'Pitanja i odgovori','explanation.clearHistory':'Obriši povijest','explanation.newConversation':'Novi razgovor','explanation.sources':'Izvori','explanation.sourceField':'Polje izvora','explanation.confidence':'Pouzdanost','explanation.unsupportedQuestion':'Ne mogu sigurno odgovoriti na ovo pitanje na temelju ovog dokumenta.','explanation.localOnly':'Lokalno se koriste samo ovaj dokument i izričito povezani, potvrđeni podaci slučaja.','explanation.voiceTitle':'Pročitaj objašnjenje','explanation.voiceReadsText':'Glas čita objašnjenje, a ne izvorni dokument.','explanation.play':'Reproduciraj','explanation.pause':'Pauziraj','explanation.resume':'Nastavi','explanation.stop':'Zaustavi','explanation.restart':'Pokreni ponovno','explanation.voiceUnavailable':'Na ovom uređaju nema odgovarajućeg lokalnog glasa. Tekstualno objašnjenje ostaje dostupno.'},
  sr: {'settings.region':'Земља / регион','settings.regionHint':'Мењају се само будућа регионална подешавања; постојећи документи остају непромењени.','settings.countrySearch':'Претражи земљу','settings.countryUnknown':'Још није подешено','settings.translationMode':'Режим превода','settings.translationAutomatic':'Аутоматски по потреби','settings.translationAskFirst':'Прво питај','settings.translationOff':'Искључено','settings.explanationDisplayMode':'Приказ објашњења','settings.explanationText':'Текст','settings.explanationVoice':'Глас','settings.explanationTextVoice':'Текст и глас','settings.voiceHint':'Глас чита већ направљено објашњење.','onboarding.country':'Земља / регион','onboarding.countryPrompt':'У којој земљи живите?','onboarding.languagePrompt':'На ком језику желите да користите Documenta?','onboarding.explanationPrompt':'На ком језику желите објашњења?','onboarding.translationMode':'Преводи','onboarding.translationPrompt':'Када Documenta треба да припреми превод?','onboarding.replyPrompt':'На ком језику желите да одговорите?','onboarding.noUselessTranslation':'Документ на изабраном језику неће се непотребно преводити.','onboarding.explanationIndependent':'Објашњење можете затражити у сваком тренутку, независно од тога.','explanation.localKicker':'ЛОКАЛНО ОБЈАШЊЕЊЕ ДОКУМЕНТА','explanation.available':'Објашњење је доступно','explanation.unavailable':'Безбедно објашњење није доступно за овај језик.','explanation.needsReview':'Несигурне податке треба проверити пре објашњења.','explanation.generated':'Објашњење је направљено','explanation.translationState':'Превод','explanation.noTranslation':'Није потребан','explanation.translationReady':'Потребан је локални превод','explanation.translationAsk':'Потребна је потврда','explanation.translationDisabled':'Искључено','explanation.translationUnavailable':'Локални превод није доступан','explanation.ask':'Постави питање','explanation.placeholder':'Питање о овом документу','explanation.history':'Питања и одговори','explanation.clearHistory':'Обриши историју','explanation.newConversation':'Нови разговор','explanation.sources':'Извори','explanation.sourceField':'Поље извора','explanation.confidence':'Поузданост','explanation.unsupportedQuestion':'Не могу безбедно да одговорим на ово питање на основу овог документа.','explanation.localOnly':'Локално се користе само овај документ и изричито повезани, потврђени подаци предмета.','explanation.voiceTitle':'Прочитај објашњење','explanation.voiceReadsText':'Глас чита објашњење, не изворни документ.','explanation.play':'Пусти','explanation.pause':'Пауза','explanation.resume':'Настави','explanation.stop':'Заустави','explanation.restart':'Покрени поново','explanation.voiceUnavailable':'На овом уређају нема одговарајућег локалног гласа. Текстуално објашњење остаје доступно.'},
  it: {'settings.region':'Paese / regione','settings.regionHint':'Cambiano solo le impostazioni regionali future; i documenti esistenti restano invariati.','settings.countrySearch':'Cerca paese','settings.countryUnknown':'Non ancora impostato','settings.translationMode':'Modalità di traduzione','settings.translationAutomatic':'Automaticamente quando serve','settings.translationAskFirst':'Chiedi prima','settings.translationOff':'Disattivata','settings.explanationDisplayMode':'Visualizzazione spiegazione','settings.explanationText':'Testo','settings.explanationVoice':'Voce','settings.explanationTextVoice':'Testo e voce','settings.voiceHint':'La voce legge la spiegazione già creata.','onboarding.country':'Paese / regione','onboarding.countryPrompt':'In quale paese vivi?','onboarding.languagePrompt':'In quale lingua vuoi usare Documenta?','onboarding.explanationPrompt':'In quale lingua vuoi le spiegazioni?','onboarding.translationMode':'Traduzioni','onboarding.translationPrompt':'Quando deve Documenta preparare una traduzione?','onboarding.replyPrompt':'In quale lingua vuoi rispondere?','onboarding.noUselessTranslation':'Un documento già nella lingua selezionata non sarà tradotto inutilmente.','onboarding.explanationIndependent':'Puoi richiedere una spiegazione in qualsiasi momento, indipendentemente da questo.','explanation.localKicker':'SPIEGAZIONE LOCALE DEL DOCUMENTO','explanation.available':'Spiegazione disponibile','explanation.unavailable':'Non è disponibile una spiegazione sicura per questa lingua.','explanation.needsReview':'I dettagli incerti vanno verificati prima della spiegazione.','explanation.generated':'Spiegazione creata','explanation.translationState':'Traduzione','explanation.noTranslation':'Non necessaria','explanation.translationReady':'Serve una traduzione locale','explanation.translationAsk':'Conferma richiesta','explanation.translationDisabled':'Disattivata','explanation.translationUnavailable':'Traduzione locale non disponibile','explanation.ask':'Fai una domanda','explanation.placeholder':'Domanda su questo documento','explanation.history':'Domande e risposte','explanation.clearHistory':'Cancella cronologia','explanation.newConversation':'Nuova conversazione','explanation.sources':'Fonti','explanation.sourceField':'Campo di origine','explanation.confidence':'Affidabilità','explanation.unsupportedQuestion':'Non posso rispondere in modo sicuro a questa domanda da questo documento.','explanation.localOnly':'Localmente sono usati solo questo documento e i dati della pratica confermati e collegati esplicitamente.','explanation.voiceTitle':'Leggi la spiegazione','explanation.voiceReadsText':'La voce legge la spiegazione, non il documento originale.','explanation.play':'Riproduci','explanation.pause':'Pausa','explanation.resume':'Riprendi','explanation.stop':'Ferma','explanation.restart':'Riavvia','explanation.voiceUnavailable':'Su questo dispositivo non è disponibile una voce locale adatta. La spiegazione testuale resta disponibile.'},
  fr: {'settings.region':'Pays / région','settings.regionHint':'Seuls les réglages régionaux futurs changent ; les documents existants restent inchangés.','settings.countrySearch':'Rechercher un pays','settings.countryUnknown':'Pas encore défini','settings.translationMode':'Mode de traduction','settings.translationAutomatic':'Automatiquement si nécessaire','settings.translationAskFirst':'Demander d’abord','settings.translationOff':'Désactivé','settings.explanationDisplayMode':'Affichage de l’explication','settings.explanationText':'Texte','settings.explanationVoice':'Voix','settings.explanationTextVoice':'Texte et voix','settings.voiceHint':'La voix lit l’explication déjà créée.','onboarding.country':'Pays / région','onboarding.countryPrompt':'Dans quel pays vivez-vous ?','onboarding.languagePrompt':'Dans quelle langue souhaitez-vous utiliser Documenta ?','onboarding.explanationPrompt':'Dans quelle langue souhaitez-vous les explications ?','onboarding.translationMode':'Traductions','onboarding.translationPrompt':'Quand Documenta doit-il préparer une traduction ?','onboarding.replyPrompt':'Dans quelle langue souhaitez-vous répondre ?','onboarding.noUselessTranslation':'Un document déjà dans la langue choisie ne sera pas traduit inutilement.','onboarding.explanationIndependent':'Vous pouvez demander une explication à tout moment, indépendamment de cela.','explanation.localKicker':'EXPLICATION LOCALE DU DOCUMENT','explanation.available':'Explication disponible','explanation.unavailable':'Aucune explication sûre n’est disponible pour cette langue.','explanation.needsReview':'Les détails incertains doivent être vérifiés avant l’explication.','explanation.generated':'Explication créée','explanation.translationState':'Traduction','explanation.noTranslation':'Non nécessaire','explanation.translationReady':'Traduction locale nécessaire','explanation.translationAsk':'Confirmation requise','explanation.translationDisabled':'Désactivée','explanation.translationUnavailable':'Traduction locale indisponible','explanation.ask':'Poser une question','explanation.placeholder':'Question sur ce document','explanation.history':'Questions et réponses','explanation.clearHistory':'Effacer l’historique','explanation.newConversation':'Nouvelle conversation','explanation.sources':'Sources','explanation.sourceField':'Champ source','explanation.confidence':'Fiabilité','explanation.unsupportedQuestion':'Je ne peux pas répondre à cette question de façon sûre à partir de ce document.','explanation.localOnly':'Seuls ce document et les données de dossier confirmées et explicitement liées sont utilisés localement.','explanation.voiceTitle':'Lire l’explication','explanation.voiceReadsText':'La voix lit l’explication, pas le document original.','explanation.play':'Lire','explanation.pause':'Pause','explanation.resume':'Reprendre','explanation.stop':'Arrêter','explanation.restart':'Recommencer','explanation.voiceUnavailable':'Aucune voix locale adaptée n’est disponible sur cet appareil. L’explication textuelle reste disponible.'},
};

const assistantLocaleOverrides: Record<Exclude<AppLanguage, 'de' | 'hu' | 'en'>, Partial<Record<TranslationKey, string>>> = {
  ro: {'assistant.scopeAll':'Toate documentele','assistant.scopeDocument':'Document: {name}','assistant.scopeCase':'Dosar: {name}','assistant.resetContext':'Întrebare nouă despre toate documentele','assistant.semanticLocal':'Căutare locală deterministă – fără încorporări sau AI în cloud.','assistant.history':'Istoric căutări','assistant.clearHistory':'Șterge istoricul căutărilor','assistant.clearConversation':'Șterge conversația','assistant.rebuildIndex':'Reconstruiește indexul local','assistant.indexReady':'Indexul v{version} este gata','assistant.archived':'Arhivat','assistant.why':'De ce acest rezultat?','assistant.openDocument':'Deschide documentul','assistant.openCase':'Deschide dosarul','assistant.openExplanation':'Deschide explicația','assistant.openTasks':'Deschide centrul de sarcini','assistant.moreResults':'Mai multe rezultate','assistant.ambiguousTitle':'Mai multe rezultate similare','assistant.ambiguousText':'Alege rezultatul la care te referi.','assistant.zeroResult':'Nu am găsit niciun document care să confirme acest lucru în mod fiabil.','assistant.missingInformation':'Am găsit documentul, dar informația solicitată nu este confirmată în mod fiabil în acesta.','assistant.suggestedQuestions':'Posibile întrebări următoare','assistant.questionSummary':'Care este ideea principală?','assistant.questionDeadline':'Există un termen-limită?','assistant.questionAction':'Ce trebuie să fac?','assistant.questionRelated':'Există un document asociat?','assistant.questionChange':'Ce s-a schimbat?','assistant.questionUncertainty':'Ce este incert?','assistant.confidence':'Relevanță','assistant.resultDocuments':'Documente','assistant.resultCases':'Dosare','assistant.resultActions':'Sarcini','assistant.foundDocument':'Am găsit acest document: {name}','assistant.foundCase':'Am găsit acest dosar: {name}','assistant.noConfirmedDeadline':'Nu am găsit niciun termen confirmat în mod fiabil.','assistant.noConfirmedAction':'Nu am găsit nicio sarcină deschisă confirmată.','assistant.confirmedDeadline':'Termen confirmat: {value}','assistant.confirmedAction':'Următorul pas confirmat: {value}','assistant.localIndex':'Indexul de căutare derivat rămâne pe acest dispozitiv.','assistant.resultReason':'Semnale corespunzătoare: {fields}'},
  pl: {'assistant.scopeAll':'Wszystkie dokumenty','assistant.scopeDocument':'Dokument: {name}','assistant.scopeCase':'Sprawa: {name}','assistant.resetContext':'Nowe pytanie o wszystkie dokumenty','assistant.semanticLocal':'Lokalne, deterministyczne wyszukiwanie – bez embeddingów i AI w chmurze.','assistant.history':'Historia wyszukiwania','assistant.clearHistory':'Wyczyść historię wyszukiwania','assistant.clearConversation':'Wyczyść rozmowę','assistant.rebuildIndex':'Odbuduj lokalny indeks','assistant.indexReady':'Indeks v{version} jest gotowy','assistant.archived':'Zarchiwizowano','assistant.why':'Dlaczego ten wynik?','assistant.openDocument':'Otwórz dokument','assistant.openCase':'Otwórz sprawę','assistant.openExplanation':'Otwórz wyjaśnienie','assistant.openTasks':'Otwórz centrum zadań','assistant.moreResults':'Więcej wyników','assistant.ambiguousTitle':'Kilka podobnych wyników','assistant.ambiguousText':'Wybierz wynik, o który Ci chodzi.','assistant.zeroResult':'Nie znaleziono dokumentu, który wiarygodnie to potwierdza.','assistant.missingInformation':'Znaleziono dokument, ale żądana informacja nie jest w nim wiarygodnie potwierdzona.','assistant.suggestedQuestions':'Możliwe kolejne pytania','assistant.questionSummary':'Co jest najważniejsze?','assistant.questionDeadline':'Czy jest termin?','assistant.questionAction':'Co muszę zrobić?','assistant.questionRelated':'Czy jest powiązany dokument?','assistant.questionChange':'Co się zmieniło?','assistant.questionUncertainty':'Co jest niepewne?','assistant.confidence':'Trafność','assistant.resultDocuments':'Dokumenty','assistant.resultCases':'Sprawy','assistant.resultActions':'Zadania','assistant.foundDocument':'Znaleziono dokument: {name}','assistant.foundCase':'Znaleziono sprawę: {name}','assistant.noConfirmedDeadline':'Nie znaleziono wiarygodnie potwierdzonego terminu.','assistant.noConfirmedAction':'Nie znaleziono potwierdzonego otwartego zadania.','assistant.confirmedDeadline':'Potwierdzony termin: {value}','assistant.confirmedAction':'Kolejny potwierdzony krok: {value}','assistant.localIndex':'Utworzony indeks wyszukiwania pozostaje na tym urządzeniu.','assistant.resultReason':'Pasujące sygnały: {fields}'},
  sk: {'assistant.scopeAll':'Všetky dokumenty','assistant.scopeDocument':'Dokument: {name}','assistant.scopeCase':'Prípad: {name}','assistant.resetContext':'Nová otázka o všetkých dokumentoch','assistant.semanticLocal':'Miestne deterministické vyhľadávanie – bez embeddingov a cloudovej AI.','assistant.history':'História vyhľadávania','assistant.clearHistory':'Vymazať históriu vyhľadávania','assistant.clearConversation':'Vymazať rozhovor','assistant.rebuildIndex':'Znova vytvoriť miestny index','assistant.indexReady':'Index v{version} je pripravený','assistant.archived':'Archivované','assistant.why':'Prečo tento výsledok?','assistant.openDocument':'Otvoriť dokument','assistant.openCase':'Otvoriť prípad','assistant.openExplanation':'Otvoriť vysvetlenie','assistant.openTasks':'Otvoriť centrum úloh','assistant.moreResults':'Ďalšie výsledky','assistant.ambiguousTitle':'Viacero podobných výsledkov','assistant.ambiguousText':'Vyberte výsledok, ktorý ste mali na mysli.','assistant.zeroResult':'Nenašiel som dokument, ktorý by to spoľahlivo potvrdzoval.','assistant.missingInformation':'Dokument som našiel, ale požadovaná informácia v ňom nie je spoľahlivo doložená.','assistant.suggestedQuestions':'Možné ďalšie otázky','assistant.questionSummary':'Čo je najdôležitejšie?','assistant.questionDeadline':'Je tam lehota?','assistant.questionAction':'Čo mám urobiť?','assistant.questionRelated':'Existuje súvisiaci dokument?','assistant.questionChange':'Čo sa zmenilo?','assistant.questionUncertainty':'Čo je neisté?','assistant.confidence':'Relevantnosť','assistant.resultDocuments':'Dokumenty','assistant.resultCases':'Prípady','assistant.resultActions':'Úlohy','assistant.foundDocument':'Našiel som tento dokument: {name}','assistant.foundCase':'Našiel som tento prípad: {name}','assistant.noConfirmedDeadline':'Nenašiel som spoľahlivo potvrdenú lehotu.','assistant.noConfirmedAction':'Nenašiel som potvrdenú otvorenú úlohu.','assistant.confirmedDeadline':'Potvrdená lehota: {value}','assistant.confirmedAction':'Ďalší potvrdený krok: {value}','assistant.localIndex':'Odvodený vyhľadávací index zostáva v tomto zariadení.','assistant.resultReason':'Zhodné signály: {fields}'},
  uk: {'assistant.scopeAll':'Усі документи','assistant.scopeDocument':'Документ: {name}','assistant.scopeCase':'Справа: {name}','assistant.resetContext':'Нове запитання про всі документи','assistant.semanticLocal':'Локальний детермінований пошук — без ембедингів і хмарного ШІ.','assistant.history':'Історія пошуку','assistant.clearHistory':'Очистити історію пошуку','assistant.clearConversation':'Очистити розмову','assistant.rebuildIndex':'Перебудувати локальний індекс','assistant.indexReady':'Індекс v{version} готовий','assistant.archived':'Архівовано','assistant.why':'Чому цей результат?','assistant.openDocument':'Відкрити документ','assistant.openCase':'Відкрити справу','assistant.openExplanation':'Відкрити пояснення','assistant.openTasks':'Відкрити центр завдань','assistant.moreResults':'Більше результатів','assistant.ambiguousTitle':'Кілька схожих результатів','assistant.ambiguousText':'Виберіть результат, який ви мали на увазі.','assistant.zeroResult':'Я не знайшов документа, який надійно це підтверджує.','assistant.missingInformation':'Я знайшов документ, але запитувана інформація в ньому не підтверджена належним чином.','assistant.suggestedQuestions':'Можливі наступні запитання','assistant.questionSummary':'Що найважливіше?','assistant.questionDeadline':'Чи є термін?','assistant.questionAction':'Що мені потрібно зробити?','assistant.questionRelated':'Чи є пов’язаний документ?','assistant.questionChange':'Що змінилося?','assistant.questionUncertainty':'Що є невизначеним?','assistant.confidence':'Релевантність','assistant.resultDocuments':'Документи','assistant.resultCases':'Справи','assistant.resultActions':'Завдання','assistant.foundDocument':'Я знайшов цей документ: {name}','assistant.foundCase':'Я знайшов цю справу: {name}','assistant.noConfirmedDeadline':'Я не знайшов надійно підтвердженого терміну.','assistant.noConfirmedAction':'Я не знайшов підтвердженого відкритого завдання.','assistant.confirmedDeadline':'Підтверджений термін: {value}','assistant.confirmedAction':'Наступний підтверджений крок: {value}','assistant.localIndex':'Похідний пошуковий індекс залишається на цьому пристрої.','assistant.resultReason':'Збіги сигналів: {fields}'},
  tr: {'assistant.scopeAll':'Tüm belgeler','assistant.scopeDocument':'Belge: {name}','assistant.scopeCase':'Dosya: {name}','assistant.resetContext':'Tüm belgeler hakkında yeni soru','assistant.semanticLocal':'Yerel, deterministik arama – gömme veya bulut yapay zekâsı yok.','assistant.history':'Arama geçmişi','assistant.clearHistory':'Arama geçmişini temizle','assistant.clearConversation':'Konuşmayı temizle','assistant.rebuildIndex':'Yerel dizini yeniden oluştur','assistant.indexReady':'v{version} dizini hazır','assistant.archived':'Arşivlendi','assistant.why':'Bu sonuç neden?','assistant.openDocument':'Belgeyi aç','assistant.openCase':'Dosyayı aç','assistant.openExplanation':'Açıklamayı aç','assistant.openTasks':'Görev Merkezini aç','assistant.moreResults':'Daha fazla sonuç','assistant.ambiguousTitle':'Birden fazla benzer sonuç','assistant.ambiguousText':'Kastettiğiniz sonucu seçin.','assistant.zeroResult':'Bunu güvenilir biçimde destekleyen bir belge bulamadım.','assistant.missingInformation':'Belgeyi buldum, ancak istenen bilgi içinde güvenilir biçimde kanıtlanmıyor.','assistant.suggestedQuestions':'Olası sonraki sorular','assistant.questionSummary':'En önemli nokta nedir?','assistant.questionDeadline':'Bir son tarih var mı?','assistant.questionAction':'Ne yapmam gerekiyor?','assistant.questionRelated':'İlgili bir belge var mı?','assistant.questionChange':'Ne değişti?','assistant.questionUncertainty':'Belirsiz olan nedir?','assistant.confidence':'Alaka düzeyi','assistant.resultDocuments':'Belgeler','assistant.resultCases':'Dosyalar','assistant.resultActions':'Görevler','assistant.foundDocument':'Bu belgeyi buldum: {name}','assistant.foundCase':'Bu dosyayı buldum: {name}','assistant.noConfirmedDeadline':'Güvenilir biçimde onaylanmış bir son tarih bulamadım.','assistant.noConfirmedAction':'Onaylanmış açık görev bulamadım.','assistant.confirmedDeadline':'Onaylanmış son tarih: {value}','assistant.confirmedAction':'Sonraki onaylanmış adım: {value}','assistant.localIndex':'Türetilen arama dizini bu cihazda kalır.','assistant.resultReason':'Eşleşen sinyaller: {fields}'},
  ar: {'assistant.scopeAll':'كل المستندات','assistant.scopeDocument':'المستند: {name}','assistant.scopeCase':'الملف: {name}','assistant.resetContext':'سؤال جديد عن كل المستندات','assistant.semanticLocal':'بحث محلي حتمي — دون تضمينات أو ذكاء اصطناعي سحابي.','assistant.history':'سجل البحث','assistant.clearHistory':'مسح سجل البحث','assistant.clearConversation':'مسح المحادثة','assistant.rebuildIndex':'إعادة إنشاء الفهرس المحلي','assistant.indexReady':'الفهرس v{version} جاهز','assistant.archived':'مؤرشف','assistant.why':'لماذا هذه النتيجة؟','assistant.openDocument':'فتح المستند','assistant.openCase':'فتح الملف','assistant.openExplanation':'فتح الشرح','assistant.openTasks':'فتح مركز المهام','assistant.moreResults':'نتائج إضافية','assistant.ambiguousTitle':'عدة نتائج متشابهة','assistant.ambiguousText':'اختر النتيجة التي تقصدها.','assistant.zeroResult':'لم أجد مستنداً يؤكد ذلك بشكل موثوق.','assistant.missingInformation':'وجدت المستند، لكن المعلومة المطلوبة غير مثبتة فيه بشكل موثوق.','assistant.suggestedQuestions':'أسئلة تالية محتملة','assistant.questionSummary':'ما أهم نقطة؟','assistant.questionDeadline':'هل يوجد موعد نهائي؟','assistant.questionAction':'ماذا عليّ أن أفعل؟','assistant.questionRelated':'هل يوجد مستند مرتبط؟','assistant.questionChange':'ما الذي تغيّر؟','assistant.questionUncertainty':'ما غير المؤكد؟','assistant.confidence':'الصلة','assistant.resultDocuments':'المستندات','assistant.resultCases':'الملفات','assistant.resultActions':'المهام','assistant.foundDocument':'وجدت هذا المستند: {name}','assistant.foundCase':'وجدت هذا الملف: {name}','assistant.noConfirmedDeadline':'لم أجد موعداً نهائياً مؤكداً بشكل موثوق.','assistant.noConfirmedAction':'لم أجد مهمة مفتوحة مؤكدة.','assistant.confirmedDeadline':'الموعد النهائي المؤكد: {value}','assistant.confirmedAction':'الخطوة التالية المؤكدة: {value}','assistant.localIndex':'يبقى فهرس البحث المُشتق على هذا الجهاز.','assistant.resultReason':'الإشارات المتطابقة: {fields}'},
  cs: {'assistant.scopeAll':'Všechny dokumenty','assistant.scopeDocument':'Dokument: {name}','assistant.scopeCase':'Případ: {name}','assistant.resetContext':'Nový dotaz ke všem dokumentům','assistant.semanticLocal':'Místní deterministické vyhledávání – bez embeddingů a cloudové AI.','assistant.history':'Historie vyhledávání','assistant.clearHistory':'Vymazat historii vyhledávání','assistant.clearConversation':'Vymazat konverzaci','assistant.rebuildIndex':'Znovu vytvořit místní index','assistant.indexReady':'Index v{version} je připraven','assistant.archived':'Archivováno','assistant.why':'Proč tento výsledek?','assistant.openDocument':'Otevřít dokument','assistant.openCase':'Otevřít případ','assistant.openExplanation':'Otevřít vysvětlení','assistant.openTasks':'Otevřít centrum úkolů','assistant.moreResults':'Další výsledky','assistant.ambiguousTitle':'Několik podobných výsledků','assistant.ambiguousText':'Vyberte výsledek, který jste měli na mysli.','assistant.zeroResult':'Nenašel jsem dokument, který by to spolehlivě dokládal.','assistant.missingInformation':'Dokument jsem našel, ale požadovaná informace v něm není spolehlivě doložena.','assistant.suggestedQuestions':'Možné další otázky','assistant.questionSummary':'Co je nejdůležitější?','assistant.questionDeadline':'Je zde termín?','assistant.questionAction':'Co musím udělat?','assistant.questionRelated':'Existuje související dokument?','assistant.questionChange':'Co se změnilo?','assistant.questionUncertainty':'Co je nejisté?','assistant.confidence':'Relevantnost','assistant.resultDocuments':'Dokumenty','assistant.resultCases':'Případy','assistant.resultActions':'Úkoly','assistant.foundDocument':'Našel jsem tento dokument: {name}','assistant.foundCase':'Našel jsem tento případ: {name}','assistant.noConfirmedDeadline':'Nenašel jsem spolehlivě potvrzený termín.','assistant.noConfirmedAction':'Nenašel jsem potvrzený otevřený úkol.','assistant.confirmedDeadline':'Potvrzený termín: {value}','assistant.confirmedAction':'Další potvrzený krok: {value}','assistant.localIndex':'Odvozený vyhledávací index zůstává v tomto zařízení.','assistant.resultReason':'Odpovídající signály: {fields}'},
  bg: {'assistant.scopeAll':'Всички документи','assistant.scopeDocument':'Документ: {name}','assistant.scopeCase':'Случай: {name}','assistant.resetContext':'Нов въпрос за всички документи','assistant.semanticLocal':'Локално детерминистично търсене – без вграждания и облачен ИИ.','assistant.history':'История на търсенето','assistant.clearHistory':'Изчисти историята на търсенето','assistant.clearConversation':'Изчисти разговора','assistant.rebuildIndex':'Изгради отново локалния индекс','assistant.indexReady':'Индекс v{version} е готов','assistant.archived':'Архивирано','assistant.why':'Защо този резултат?','assistant.openDocument':'Отвори документа','assistant.openCase':'Отвори случая','assistant.openExplanation':'Отвори обяснението','assistant.openTasks':'Отвори центъра за задачи','assistant.moreResults':'Още резултати','assistant.ambiguousTitle':'Няколко сходни резултата','assistant.ambiguousText':'Изберете резултата, който имате предвид.','assistant.zeroResult':'Не намерих документ, който надеждно потвърждава това.','assistant.missingInformation':'Намерих документа, но поисканата информация не е надеждно потвърдена в него.','assistant.suggestedQuestions':'Възможни следващи въпроси','assistant.questionSummary':'Кое е най-важното?','assistant.questionDeadline':'Има ли краен срок?','assistant.questionAction':'Какво трябва да направя?','assistant.questionRelated':'Има ли свързан документ?','assistant.questionChange':'Какво се промени?','assistant.questionUncertainty':'Какво е несигурно?','assistant.confidence':'Релевантност','assistant.resultDocuments':'Документи','assistant.resultCases':'Случаи','assistant.resultActions':'Задачи','assistant.foundDocument':'Намерих този документ: {name}','assistant.foundCase':'Намерих този случай: {name}','assistant.noConfirmedDeadline':'Не намерих надеждно потвърден краен срок.','assistant.noConfirmedAction':'Не намерих потвърдена отворена задача.','assistant.confirmedDeadline':'Потвърден краен срок: {value}','assistant.confirmedAction':'Следваща потвърдена стъпка: {value}','assistant.localIndex':'Изведеният индекс за търсене остава на това устройство.','assistant.resultReason':'Съвпадащи сигнали: {fields}'},
  hr: {'assistant.scopeAll':'Svi dokumenti','assistant.scopeDocument':'Dokument: {name}','assistant.scopeCase':'Slučaj: {name}','assistant.resetContext':'Novo pitanje o svim dokumentima','assistant.semanticLocal':'Lokalno determinističko pretraživanje – bez ugradnji i AI-ja u oblaku.','assistant.history':'Povijest pretraživanja','assistant.clearHistory':'Izbriši povijest pretraživanja','assistant.clearConversation':'Izbriši razgovor','assistant.rebuildIndex':'Ponovno izgradi lokalni indeks','assistant.indexReady':'Indeks v{version} je spreman','assistant.archived':'Arhivirano','assistant.why':'Zašto ovaj rezultat?','assistant.openDocument':'Otvori dokument','assistant.openCase':'Otvori slučaj','assistant.openExplanation':'Otvori objašnjenje','assistant.openTasks':'Otvori centar zadataka','assistant.moreResults':'Više rezultata','assistant.ambiguousTitle':'Nekoliko sličnih rezultata','assistant.ambiguousText':'Odaberite rezultat na koji ste mislili.','assistant.zeroResult':'Nisam pronašao dokument koji to pouzdano potvrđuje.','assistant.missingInformation':'Pronašao sam dokument, ali tražena informacija u njemu nije pouzdano potkrijepljena.','assistant.suggestedQuestions':'Moguća sljedeća pitanja','assistant.questionSummary':'Što je najvažnije?','assistant.questionDeadline':'Postoji li rok?','assistant.questionAction':'Što trebam učiniti?','assistant.questionRelated':'Postoji li povezani dokument?','assistant.questionChange':'Što se promijenilo?','assistant.questionUncertainty':'Što je nesigurno?','assistant.confidence':'Relevantnost','assistant.resultDocuments':'Dokumenti','assistant.resultCases':'Slučajevi','assistant.resultActions':'Zadaci','assistant.foundDocument':'Pronašao sam ovaj dokument: {name}','assistant.foundCase':'Pronašao sam ovaj slučaj: {name}','assistant.noConfirmedDeadline':'Nisam pronašao pouzdano potvrđen rok.','assistant.noConfirmedAction':'Nisam pronašao potvrđeni otvoreni zadatak.','assistant.confirmedDeadline':'Potvrđeni rok: {value}','assistant.confirmedAction':'Sljedeći potvrđeni korak: {value}','assistant.localIndex':'Izvedeni indeks pretraživanja ostaje na ovom uređaju.','assistant.resultReason':'Podudarni signali: {fields}'},
  sr: {'assistant.scopeAll':'Сва документа','assistant.scopeDocument':'Документ: {name}','assistant.scopeCase':'Предмет: {name}','assistant.resetContext':'Ново питање о свим документима','assistant.semanticLocal':'Локална детерминистичка претрага — без ембединга и ИИ-ја у облаку.','assistant.history':'Историја претраге','assistant.clearHistory':'Обриши историју претраге','assistant.clearConversation':'Обриши разговор','assistant.rebuildIndex':'Поново изгради локални индекс','assistant.indexReady':'Индекс v{version} је спреман','assistant.archived':'Архивирано','assistant.why':'Зашто овај резултат?','assistant.openDocument':'Отвори документ','assistant.openCase':'Отвори предмет','assistant.openExplanation':'Отвори објашњење','assistant.openTasks':'Отвори центар задатака','assistant.moreResults':'Још резултата','assistant.ambiguousTitle':'Више сличних резултата','assistant.ambiguousText':'Изаберите резултат на који сте мислили.','assistant.zeroResult':'Нисам пронашао документ који то поуздано потврђује.','assistant.missingInformation':'Пронашао сам документ, али тражена информација у њему није поуздано поткрепљена.','assistant.suggestedQuestions':'Могућа следећа питања','assistant.questionSummary':'Шта је најважније?','assistant.questionDeadline':'Постоји ли рок?','assistant.questionAction':'Шта треба да урадим?','assistant.questionRelated':'Постоји ли повезан документ?','assistant.questionChange':'Шта се променило?','assistant.questionUncertainty':'Шта је неизвесно?','assistant.confidence':'Релевантност','assistant.resultDocuments':'Документи','assistant.resultCases':'Предмети','assistant.resultActions':'Задаци','assistant.foundDocument':'Пронашао сам овај документ: {name}','assistant.foundCase':'Пронашао сам овај предмет: {name}','assistant.noConfirmedDeadline':'Нисам пронашао поуздано потврђен рок.','assistant.noConfirmedAction':'Нисам пронашао потврђен отворен задатак.','assistant.confirmedDeadline':'Потврђен рок: {value}','assistant.confirmedAction':'Следећи потврђени корак: {value}','assistant.localIndex':'Изведени индекс претраге остаје на овом уређају.','assistant.resultReason':'Поклопљени сигнали: {fields}'},
  it: {'assistant.scopeAll':'Tutti i documenti','assistant.scopeDocument':'Documento: {name}','assistant.scopeCase':'Pratica: {name}','assistant.resetContext':'Nuova domanda su tutti i documenti','assistant.semanticLocal':'Ricerca locale deterministica – senza embedding né IA nel cloud.','assistant.history':'Cronologia delle ricerche','assistant.clearHistory':'Cancella la cronologia delle ricerche','assistant.clearConversation':'Cancella la conversazione','assistant.rebuildIndex':'Ricostruisci l’indice locale','assistant.indexReady':'Indice v{version} pronto','assistant.archived':'Archiviato','assistant.why':'Perché questo risultato?','assistant.openDocument':'Apri documento','assistant.openCase':'Apri pratica','assistant.openExplanation':'Apri spiegazione','assistant.openTasks':'Apri centro attività','assistant.moreResults':'Altri risultati','assistant.ambiguousTitle':'Diversi risultati simili','assistant.ambiguousText':'Scegli il risultato a cui ti riferisci.','assistant.zeroResult':'Non ho trovato un documento che lo confermi in modo affidabile.','assistant.missingInformation':'Ho trovato il documento, ma l’informazione richiesta non vi è comprovata in modo affidabile.','assistant.suggestedQuestions':'Possibili domande successive','assistant.questionSummary':'Qual è il punto principale?','assistant.questionDeadline':'C’è una scadenza?','assistant.questionAction':'Cosa devo fare?','assistant.questionRelated':'C’è un documento correlato?','assistant.questionChange':'Cosa è cambiato?','assistant.questionUncertainty':'Cosa è incerto?','assistant.confidence':'Rilevanza','assistant.resultDocuments':'Documenti','assistant.resultCases':'Pratiche','assistant.resultActions':'Attività','assistant.foundDocument':'Ho trovato questo documento: {name}','assistant.foundCase':'Ho trovato questa pratica: {name}','assistant.noConfirmedDeadline':'Non ho trovato una scadenza confermata in modo affidabile.','assistant.noConfirmedAction':'Non ho trovato un’attività aperta confermata.','assistant.confirmedDeadline':'Scadenza confermata: {value}','assistant.confirmedAction':'Prossimo passo confermato: {value}','assistant.localIndex':'L’indice di ricerca derivato resta su questo dispositivo.','assistant.resultReason':'Segnali corrispondenti: {fields}'},
  fr: {'assistant.scopeAll':'Tous les documents','assistant.scopeDocument':'Document : {name}','assistant.scopeCase':'Dossier : {name}','assistant.resetContext':'Nouvelle question sur tous les documents','assistant.semanticLocal':'Recherche locale déterministe – sans embeddings ni IA dans le cloud.','assistant.history':'Historique des recherches','assistant.clearHistory':'Effacer l’historique des recherches','assistant.clearConversation':'Effacer la conversation','assistant.rebuildIndex':'Reconstruire l’index local','assistant.indexReady':'Index v{version} prêt','assistant.archived':'Archivé','assistant.why':'Pourquoi ce résultat ?','assistant.openDocument':'Ouvrir le document','assistant.openCase':'Ouvrir le dossier','assistant.openExplanation':'Ouvrir l’explication','assistant.openTasks':'Ouvrir le centre des tâches','assistant.moreResults':'Plus de résultats','assistant.ambiguousTitle':'Plusieurs résultats similaires','assistant.ambiguousText':'Choisissez le résultat auquel vous faites référence.','assistant.zeroResult':'Je n’ai trouvé aucun document qui confirme cela de manière fiable.','assistant.missingInformation':'J’ai trouvé le document, mais l’information demandée n’y est pas étayée de manière fiable.','assistant.suggestedQuestions':'Questions suivantes possibles','assistant.questionSummary':'Quel est le point essentiel ?','assistant.questionDeadline':'Y a-t-il une échéance ?','assistant.questionAction':'Que dois-je faire ?','assistant.questionRelated':'Y a-t-il un document associé ?','assistant.questionChange':'Qu’est-ce qui a changé ?','assistant.questionUncertainty':'Qu’est-ce qui est incertain ?','assistant.confidence':'Pertinence','assistant.resultDocuments':'Documents','assistant.resultCases':'Dossiers','assistant.resultActions':'Tâches','assistant.foundDocument':'J’ai trouvé ce document : {name}','assistant.foundCase':'J’ai trouvé ce dossier : {name}','assistant.noConfirmedDeadline':'Je n’ai trouvé aucune échéance confirmée de manière fiable.','assistant.noConfirmedAction':'Je n’ai trouvé aucune tâche ouverte confirmée.','assistant.confirmedDeadline':'Échéance confirmée : {value}','assistant.confirmedAction':'Prochaine étape confirmée : {value}','assistant.localIndex':'L’index de recherche dérivé reste sur cet appareil.','assistant.resultReason':'Signaux correspondants : {fields}'},
};

const backupLocaleOverrides: Record<Exclude<AppLanguage, 'de' | 'hu' | 'en'>, Partial<Record<TranslationKey, string>>> = {
  ro: {'security.cloud':'Sincronizare în cloud','security.gmail':'Acces Gmail','backup.title':'Copie de siguranță și recuperare','backup.privacy':'Criptată cu fraza ta secretă; în Drive nu se stochează text necriptat.','backup.drive':'Datele aplicației Google Drive','backup.connected':'Conectat','backup.disconnected':'Neconectat','backup.connect':'Conectează Google Drive','backup.disconnect':'Deconectează','backup.configuration':'OAuth și criptarea sigură necesită o versiune de dezvoltare configurată.','backup.prepared':'Se pregătește recuperarea','backup.passphrase':'Frază secretă pentru copie','backup.passphraseHint':'Nu este salvată și nu este înregistrată.','backup.create':'Creează acum o copie criptată','backup.cancel':'Anulează copia','backup.automatic':'Copii automate după deblocarea manuală a unei copii în această sesiune','backup.foreground':'Rulează doar în prim-plan, cu întârziere între modificări; fraza secretă nu se păstrează.','backup.discover':'Caută copii','backup.snapshots':'Copii disponibile','backup.documentsAssets':'{documents} documente · {assets} fișiere · {size}','backup.prepareRestore':'Verifică recuperarea','backup.conflicts':'{count} conflicte; conflictele manuale nu sunt suprascrise.','backup.confirmRestore':'Confirmă explicit recuperarea','backup.delete':'Șterge copia','backup.deleteTitle':'Ștergi copia?','backup.deleteMessage':'Această copie criptată va fi ștearsă definitiv din Google Drive.','backup.export':'Exportă copie locală criptată','backup.import':'Importă copie locală criptată','backup.latestBackup':'Ultima copie: {time}','backup.latestRestore':'Ultima recuperare: {time}','backup.newPhone':'Telefon nou?','backup.newPhoneText':'Instalează Documenta, conectează același cont Google, găsește copia și introdu fraza secretă. Apoi reconectează integrările și notificările.','backup.noSnapshots':'Nu s-au găsit copii încă.'},
  pl: {'security.cloud':'Synchronizacja w chmurze','security.gmail':'Dostęp do Gmaila','backup.title':'Kopia zapasowa i odzyskiwanie','backup.privacy':'Szyfrowana Twoim hasłem; w Drive nie jest przechowywany zwykły tekst.','backup.drive':'Dane aplikacji Google Drive','backup.connected':'Połączono','backup.disconnected':'Nie połączono','backup.connect':'Połącz z Google Drive','backup.disconnect':'Rozłącz','backup.configuration':'OAuth i bezpieczne szyfrowanie wymagają skonfigurowanej wersji deweloperskiej.','backup.prepared':'Przygotowywanie odzyskiwania','backup.passphrase':'Hasło kopii zapasowej','backup.passphraseHint':'Nigdy nie jest zapisywane ani rejestrowane.','backup.create':'Utwórz zaszyfrowaną kopię','backup.cancel':'Anuluj tworzenie kopii','backup.automatic':'Automatyczne kopie po ręcznym odblokowaniu kopii w tej sesji','backup.foreground':'Działają tylko na pierwszym planie i z opóźnieniem po zmianach; hasło nie jest zapisywane.','backup.discover':'Znajdź kopie','backup.snapshots':'Dostępne kopie','backup.documentsAssets':'{documents} dokumentów · {assets} plików · {size}','backup.prepareRestore':'Sprawdź odzyskiwanie','backup.conflicts':'{count} konfliktów; ręczne konflikty nigdy nie są nadpisywane.','backup.confirmRestore':'Wyraźnie potwierdź odzyskiwanie','backup.delete':'Usuń kopię','backup.deleteTitle':'Usunąć kopię?','backup.deleteMessage':'Ta zaszyfrowana kopia zostanie trwale usunięta z Google Drive.','backup.export':'Eksportuj zaszyfrowaną kopię lokalną','backup.import':'Importuj zaszyfrowaną kopię lokalną','backup.latestBackup':'Ostatnia kopia: {time}','backup.latestRestore':'Ostatnie odzyskiwanie: {time}','backup.newPhone':'Nowy telefon?','backup.newPhoneText':'Zainstaluj Documenta, połącz to samo konto Google, znajdź kopię i podaj hasło. Następnie ponownie połącz integracje i powiadomienia.','backup.noSnapshots':'Nie znaleziono jeszcze kopii.'},
  sk: {'security.cloud':'Synchronizácia v cloude','security.gmail':'Prístup k službe Gmail','backup.title':'Záloha a obnova','backup.privacy':'Zašifrované vašou prístupovou frázou; v Drive sa neukladá nezašifrovaný text.','backup.drive':'Údaje aplikácie Google Drive','backup.connected':'Pripojené','backup.disconnected':'Nepripojené','backup.connect':'Pripojiť Google Drive','backup.disconnect':'Odpojiť','backup.configuration':'OAuth a bezpečné šifrovanie vyžadujú nakonfigurované vývojové zostavenie.','backup.prepared':'Pripravuje sa obnova','backup.passphrase':'Prístupová fráza zálohy','backup.passphraseHint':'Nikdy sa neukladá ani nezaznamenáva.','backup.create':'Vytvoriť šifrovanú zálohu','backup.cancel':'Zrušiť zálohu','backup.automatic':'Automatické zálohy po ručnom odomknutí zálohy v tejto relácii','backup.foreground':'Bežia len v popredí a s odkladom po zmenách; prístupová fráza sa neukladá.','backup.discover':'Vyhľadať zálohy','backup.snapshots':'Dostupné zálohy','backup.documentsAssets':'{documents} dokumentov · {assets} súborov · {size}','backup.prepareRestore':'Skontrolovať obnovu','backup.conflicts':'{count} konfliktov; ručné konflikty sa nikdy neprepíšu.','backup.confirmRestore':'Výslovne potvrdiť obnovu','backup.delete':'Odstrániť zálohu','backup.deleteTitle':'Odstrániť zálohu?','backup.deleteMessage':'Táto šifrovaná záloha bude natrvalo odstránená z Google Drive.','backup.export':'Exportovať šifrovanú miestnu zálohu','backup.import':'Importovať šifrovanú miestnu zálohu','backup.latestBackup':'Posledná záloha: {time}','backup.latestRestore':'Posledná obnova: {time}','backup.newPhone':'Nový telefón?','backup.newPhoneText':'Nainštalujte Documenta, pripojte rovnaký účet Google, nájdite zálohu a zadajte prístupovú frázu. Potom znova pripojte integrácie a upozornenia.','backup.noSnapshots':'Zatiaľ sa nenašli žiadne zálohy.'},
  uk: {'security.cloud':'Хмарна синхронізація','security.gmail':'Доступ до Gmail','backup.title':'Резервне копіювання та відновлення','backup.privacy':'Зашифровано вашою пароль-фразою; незашифрований текст у Drive не зберігається.','backup.drive':'Дані застосунку Google Drive','backup.connected':'Підключено','backup.disconnected':'Не підключено','backup.connect':'Підключити Google Drive','backup.disconnect':'Відключити','backup.configuration':'OAuth і безпечне шифрування потребують налаштованої збірки для розробки.','backup.prepared':'Підготовка відновлення','backup.passphrase':'Пароль-фраза резервної копії','backup.passphraseHint':'Вона ніколи не зберігається і не журналюється.','backup.create':'Створити зашифровану копію','backup.cancel':'Скасувати копіювання','backup.automatic':'Автоматичні копії після ручного розблокування копії в цьому сеансі','backup.foreground':'Працюють лише на передньому плані й із затримкою після змін; пароль-фраза не зберігається.','backup.discover':'Знайти резервні копії','backup.snapshots':'Доступні резервні копії','backup.documentsAssets':'{documents} документів · {assets} файлів · {size}','backup.prepareRestore':'Перевірити відновлення','backup.conflicts':'{count} конфліктів; ручні конфлікти не перезаписуються.','backup.confirmRestore':'Явно підтвердити відновлення','backup.delete':'Видалити копію','backup.deleteTitle':'Видалити копію?','backup.deleteMessage':'Цю зашифровану копію буде остаточно видалено з Google Drive.','backup.export':'Експортувати зашифровану локальну копію','backup.import':'Імпортувати зашифровану локальну копію','backup.latestBackup':'Остання копія: {time}','backup.latestRestore':'Останнє відновлення: {time}','backup.newPhone':'Новий телефон?','backup.newPhoneText':'Встановіть Documenta, підключіть той самий обліковий запис Google, знайдіть копію та введіть пароль-фразу. Потім знову підключіть інтеграції й сповіщення.','backup.noSnapshots':'Резервних копій ще не знайдено.'},
  tr: {'security.cloud':'Bulut eşitleme','security.gmail':'Gmail erişimi','backup.title':'Yedekleme ve kurtarma','backup.privacy':'Parolanızla şifrelenir; Drive’da şifrelenmemiş metin saklanmaz.','backup.drive':'Google Drive uygulama verileri','backup.connected':'Bağlı','backup.disconnected':'Bağlı değil','backup.connect':'Google Drive’a bağlan','backup.disconnect':'Bağlantıyı kes','backup.configuration':'OAuth ve güvenli şifreleme, yapılandırılmış bir geliştirme derlemesi gerektirir.','backup.prepared':'Kurtarma hazırlanıyor','backup.passphrase':'Yedekleme parolası','backup.passphraseHint':'Asla saklanmaz veya günlüğe yazılmaz.','backup.create':'Şifreli yedek oluştur','backup.cancel':'Yedeklemeyi iptal et','backup.automatic':'Bu oturumda yedeğin elle kilidi açıldıktan sonraki otomatik yedekler','backup.foreground':'Yalnızca ön planda, değişikliklerden sonra gecikmeli çalışır; parola saklanmaz.','backup.discover':'Yedekleri bul','backup.snapshots':'Kullanılabilir yedekler','backup.documentsAssets':'{documents} belge · {assets} dosya · {size}','backup.prepareRestore':'Kurtarmayı incele','backup.conflicts':'{count} çakışma; elle oluşan çakışmalar asla üzerine yazılmaz.','backup.confirmRestore':'Kurtarmayı açıkça onayla','backup.delete':'Yedeği sil','backup.deleteTitle':'Yedek silinsin mi?','backup.deleteMessage':'Bu şifreli yedek Google Drive’dan kalıcı olarak silinecek.','backup.export':'Şifreli yerel yedeği dışa aktar','backup.import':'Şifreli yerel yedeği içe aktar','backup.latestBackup':'Son yedek: {time}','backup.latestRestore':'Son kurtarma: {time}','backup.newPhone':'Yeni telefon mu?','backup.newPhoneText':'Documenta’yı yükleyin, aynı Google hesabını bağlayın, yedeği bulun ve parolanızı girin. Ardından entegrasyonları ve bildirimleri yeniden bağlayın.','backup.noSnapshots':'Henüz yedek bulunamadı.'},
  ar: {'security.cloud':'المزامنة السحابية','security.gmail':'الوصول إلى Gmail','backup.title':'النسخ الاحتياطي والاستعادة','backup.privacy':'مشفّر بعبارة المرور؛ لا يُخزّن نص غير مشفّر في Drive.','backup.drive':'بيانات تطبيق Google Drive','backup.connected':'متصل','backup.disconnected':'غير متصل','backup.connect':'ربط Google Drive','backup.disconnect':'قطع الاتصال','backup.configuration':'يتطلب OAuth والتشفير الآمن نسخة تطوير مُعدّة.','backup.prepared':'جارٍ تحضير الاستعادة','backup.passphrase':'عبارة مرور النسخة الاحتياطية','backup.passphraseHint':'لا تُحفظ ولا تُسجل مطلقاً.','backup.create':'إنشاء نسخة احتياطية مشفرة','backup.cancel':'إلغاء النسخ الاحتياطي','backup.automatic':'نسخ تلقائية بعد فتح النسخة يدوياً في جلسة التطبيق الحالية','backup.foreground':'تعمل في المقدمة فقط وبمهلة بعد التغييرات؛ لا تُحفظ عبارة المرور.','backup.discover':'البحث عن النسخ الاحتياطية','backup.snapshots':'النسخ المتاحة','backup.documentsAssets':'{documents} مستندات · {assets} ملفات · {size}','backup.prepareRestore':'مراجعة الاستعادة','backup.conflicts':'{count} تعارضات؛ لا تُستبدل التعارضات اليدوية.','backup.confirmRestore':'تأكيد الاستعادة صراحةً','backup.delete':'حذف النسخة','backup.deleteTitle':'حذف النسخة الاحتياطية؟','backup.deleteMessage':'ستُحذف هذه النسخة المشفرة نهائياً من Google Drive.','backup.export':'تصدير نسخة محلية مشفرة','backup.import':'استيراد نسخة محلية مشفرة','backup.latestBackup':'آخر نسخة: {time}','backup.latestRestore':'آخر استعادة: {time}','backup.newPhone':'هاتف جديد؟','backup.newPhoneText':'ثبّت Documenta، واربط حساب Google نفسه، واعثر على النسخة وأدخل عبارة المرور. ثم أعد ربط التكاملات والإشعارات.','backup.noSnapshots':'لم يُعثر على نسخ احتياطية بعد.'},
  cs: {'security.cloud':'Synchronizace do cloudu','security.gmail':'Přístup ke Gmailu','backup.title':'Zálohování a obnova','backup.privacy':'Zašifrováno vaší přístupovou frází; v Drivu se neukládá nešifrovaný text.','backup.drive':'Data aplikace Google Drive','backup.connected':'Připojeno','backup.disconnected':'Nepřipojeno','backup.connect':'Připojit Google Drive','backup.disconnect':'Odpojit','backup.configuration':'OAuth a bezpečné šifrování vyžadují nakonfigurované vývojové sestavení.','backup.prepared':'Příprava obnovy','backup.passphrase':'Přístupová fráze zálohy','backup.passphraseHint':'Nikdy se neukládá ani nezaznamenává.','backup.create':'Vytvořit šifrovanou zálohu','backup.cancel':'Zrušit zálohu','backup.automatic':'Automatické zálohy po ručním odemknutí zálohy v této relaci','backup.foreground':'Běží jen v popředí a s prodlevou po změnách; přístupová fráze se neukládá.','backup.discover':'Najít zálohy','backup.snapshots':'Dostupné zálohy','backup.documentsAssets':'{documents} dokumentů · {assets} souborů · {size}','backup.prepareRestore':'Zkontrolovat obnovu','backup.conflicts':'{count} konfliktů; ruční konflikty se nikdy nepřepisují.','backup.confirmRestore':'Výslovně potvrdit obnovu','backup.delete':'Odstranit zálohu','backup.deleteTitle':'Odstranit zálohu?','backup.deleteMessage':'Tato šifrovaná záloha bude trvale odstraněna z Google Drive.','backup.export':'Exportovat šifrovanou místní zálohu','backup.import':'Importovat šifrovanou místní zálohu','backup.latestBackup':'Poslední záloha: {time}','backup.latestRestore':'Poslední obnova: {time}','backup.newPhone':'Nový telefon?','backup.newPhoneText':'Nainstalujte Documenta, připojte stejný účet Google, najděte zálohu a zadejte přístupovou frázi. Poté znovu připojte integrace a oznámení.','backup.noSnapshots':'Zatím nebyly nalezeny žádné zálohy.'},
  bg: {'security.cloud':'Синхронизиране в облака','security.gmail':'Достъп до Gmail','backup.title':'Архивиране и възстановяване','backup.privacy':'Шифровано с вашата паролна фраза; в Drive не се съхранява нешифрован текст.','backup.drive':'Данни на приложението Google Drive','backup.connected':'Свързано','backup.disconnected':'Не е свързано','backup.connect':'Свържи Google Drive','backup.disconnect':'Прекъсни връзката','backup.configuration':'OAuth и сигурното шифроване изискват конфигурирана версия за разработка.','backup.prepared':'Подготвяне на възстановяване','backup.passphrase':'Паролна фраза за архива','backup.passphraseHint':'Никога не се съхранява и не се записва в журнал.','backup.create':'Създай шифрован архив','backup.cancel':'Отмени архивирането','backup.automatic':'Автоматични архиви след ръчно отключване на архив в тази сесия','backup.foreground':'Работят само на преден план и с отлагане след промени; паролната фраза не се пази.','backup.discover':'Намери архиви','backup.snapshots':'Налични архиви','backup.documentsAssets':'{documents} документа · {assets} файла · {size}','backup.prepareRestore':'Прегледай възстановяването','backup.conflicts':'{count} конфликта; ръчните конфликти не се презаписват.','backup.confirmRestore':'Изрично потвърди възстановяването','backup.delete':'Изтрий архива','backup.deleteTitle':'Да се изтрие ли архивът?','backup.deleteMessage':'Този шифрован архив ще бъде изтрит окончателно от Google Drive.','backup.export':'Експортирай шифрован локален архив','backup.import':'Импортирай шифрован локален архив','backup.latestBackup':'Последен архив: {time}','backup.latestRestore':'Последно възстановяване: {time}','backup.newPhone':'Нов телефон?','backup.newPhoneText':'Инсталирайте Documenta, свържете същия профил в Google, намерете архива и въведете паролната фраза. После свържете отново интеграциите и известията.','backup.noSnapshots':'Все още няма намерени архиви.'},
  hr: {'security.cloud':'Sinkronizacija u oblaku','security.gmail':'Pristup Gmailu','backup.title':'Sigurnosna kopija i oporavak','backup.privacy':'Šifrirano vašom pristupnom frazom; nešifrirani tekst nije pohranjen na Driveu.','backup.drive':'Podaci aplikacije Google Drive','backup.connected':'Povezano','backup.disconnected':'Nije povezano','backup.connect':'Poveži Google Drive','backup.disconnect':'Prekini vezu','backup.configuration':'OAuth i sigurno šifriranje zahtijevaju konfiguriranu razvojnu verziju.','backup.prepared':'Priprema oporavka','backup.passphrase':'Pristupna fraza kopije','backup.passphraseHint':'Nikada se ne sprema niti bilježi.','backup.create':'Izradi šifriranu kopiju','backup.cancel':'Odustani od kopije','backup.automatic':'Automatske kopije nakon ručnog otključavanja kopije u ovoj sesiji','backup.foreground':'Rade samo u prvom planu i s odgodom nakon promjena; pristupna fraza se ne sprema.','backup.discover':'Pronađi kopije','backup.snapshots':'Dostupne kopije','backup.documentsAssets':'{documents} dokumenata · {assets} datoteka · {size}','backup.prepareRestore':'Pregledaj oporavak','backup.conflicts':'{count} sukoba; ručni se sukobi nikada ne prepisuju.','backup.confirmRestore':'Izričito potvrdi oporavak','backup.delete':'Izbriši kopiju','backup.deleteTitle':'Izbrisati kopiju?','backup.deleteMessage':'Ova će šifrirana kopija biti trajno izbrisana s Google Drivea.','backup.export':'Izvezi šifriranu lokalnu kopiju','backup.import':'Uvezi šifriranu lokalnu kopiju','backup.latestBackup':'Zadnja kopija: {time}','backup.latestRestore':'Zadnji oporavak: {time}','backup.newPhone':'Novi telefon?','backup.newPhoneText':'Instalirajte Documentu, povežite isti Google račun, pronađite kopiju i unesite pristupnu frazu. Zatim ponovno povežite integracije i obavijesti.','backup.noSnapshots':'Još nema pronađenih kopija.'},
  sr: {'security.cloud':'Синхронизација у облаку','security.gmail':'Приступ Gmail-у','backup.title':'Резервна копија и опоравак','backup.privacy':'Шифровано вашом лозинком; нешифрован текст се не чува на Drive-у.','backup.drive':'Подаци апликације Google Drive','backup.connected':'Повезано','backup.disconnected':'Није повезано','backup.connect':'Повежи Google Drive','backup.disconnect':'Прекини везу','backup.configuration':'OAuth и безбедно шифровање захтевају подешену развојну верзију.','backup.prepared':'Припрема опоравка','backup.passphrase':'Лозинка резервне копије','backup.passphraseHint':'Никада се не чува нити бележи.','backup.create':'Направи шифровану копију','backup.cancel':'Откажи копирање','backup.automatic':'Аутоматске копије након ручног откључавања копије у овој сесији','backup.foreground':'Раде само у првом плану и с одлагањем после измена; лозинка се не чува.','backup.discover':'Пронађи резервне копије','backup.snapshots':'Доступне резервне копије','backup.documentsAssets':'{documents} докумената · {assets} датотека · {size}','backup.prepareRestore':'Прегледај опоравак','backup.conflicts':'{count} сукоба; ручни сукоби се не преписују.','backup.confirmRestore':'Изричито потврди опоравак','backup.delete':'Обриши копију','backup.deleteTitle':'Обрисати копију?','backup.deleteMessage':'Ова шифрована копија биће трајно обрисана са Google Drive-а.','backup.export':'Извези шифровану локалну копију','backup.import':'Увези шифровану локалну копију','backup.latestBackup':'Последња копија: {time}','backup.latestRestore':'Последњи опоравак: {time}','backup.newPhone':'Нови телефон?','backup.newPhoneText':'Инсталирајте Documenta, повежите исти Google налог, пронађите копију и унесите лозинку. Затим поново повежите интеграције и обавештења.','backup.noSnapshots':'Још нема пронађених резервних копија.'},
  it: {'security.cloud':'Sincronizzazione cloud','security.gmail':'Accesso a Gmail','backup.title':'Backup e ripristino','backup.privacy':'Crittografato con la tua frase segreta; nessun testo in chiaro è archiviato in Drive.','backup.drive':'Dati dell’app Google Drive','backup.connected':'Connesso','backup.disconnected':'Non connesso','backup.connect':'Connetti Google Drive','backup.disconnect':'Disconnetti','backup.configuration':'OAuth e la crittografia sicura richiedono una build di sviluppo configurata.','backup.prepared':'Preparazione del ripristino','backup.passphrase':'Frase segreta del backup','backup.passphraseHint':'Non viene mai salvata né registrata.','backup.create':'Crea backup crittografato','backup.cancel':'Annulla backup','backup.automatic':'Backup automatici dopo lo sblocco manuale di un backup in questa sessione','backup.foreground':'Funzionano solo in primo piano e con ritardo dopo le modifiche; la frase segreta non viene salvata.','backup.discover':'Trova backup','backup.snapshots':'Backup disponibili','backup.documentsAssets':'{documents} documenti · {assets} file · {size}','backup.prepareRestore':'Esamina il ripristino','backup.conflicts':'{count} conflitti; i conflitti manuali non vengono mai sovrascritti.','backup.confirmRestore':'Conferma esplicitamente il ripristino','backup.delete':'Elimina backup','backup.deleteTitle':'Eliminare il backup?','backup.deleteMessage':'Questo backup crittografato verrà eliminato definitivamente da Google Drive.','backup.export':'Esporta backup locale crittografato','backup.import':'Importa backup locale crittografato','backup.latestBackup':'Ultimo backup: {time}','backup.latestRestore':'Ultimo ripristino: {time}','backup.newPhone':'Nuovo telefono?','backup.newPhoneText':'Installa Documenta, connetti lo stesso account Google, trova il backup e inserisci la frase segreta. Poi riconnetti integrazioni e notifiche.','backup.noSnapshots':'Non è stato ancora trovato alcun backup.'},
  fr: {'security.cloud':'Synchronisation cloud','security.gmail':'Accès à Gmail','backup.title':'Sauvegarde et récupération','backup.privacy':'Chiffrée avec votre phrase secrète ; aucun texte en clair n’est stocké dans Drive.','backup.drive':'Données de l’application Google Drive','backup.connected':'Connecté','backup.disconnected':'Non connecté','backup.connect':'Connecter Google Drive','backup.disconnect':'Déconnecter','backup.configuration':'OAuth et le chiffrement sécurisé nécessitent une build de développement configurée.','backup.prepared':'Préparation de la récupération','backup.passphrase':'Phrase secrète de sauvegarde','backup.passphraseHint':'Elle n’est jamais enregistrée ni journalisée.','backup.create':'Créer une sauvegarde chiffrée','backup.cancel':'Annuler la sauvegarde','backup.automatic':'Sauvegardes automatiques après déverrouillage manuel d’une sauvegarde durant cette session','backup.foreground':'Elles fonctionnent seulement au premier plan et avec un délai après les modifications ; la phrase secrète n’est pas conservée.','backup.discover':'Rechercher des sauvegardes','backup.snapshots':'Sauvegardes disponibles','backup.documentsAssets':'{documents} documents · {assets} fichiers · {size}','backup.prepareRestore':'Examiner la récupération','backup.conflicts':'{count} conflits ; les conflits manuels ne sont jamais écrasés.','backup.confirmRestore':'Confirmer explicitement la récupération','backup.delete':'Supprimer la sauvegarde','backup.deleteTitle':'Supprimer la sauvegarde ?','backup.deleteMessage':'Cette sauvegarde chiffrée sera supprimée définitivement de Google Drive.','backup.export':'Exporter une sauvegarde locale chiffrée','backup.import':'Importer une sauvegarde locale chiffrée','backup.latestBackup':'Dernière sauvegarde : {time}','backup.latestRestore':'Dernière récupération : {time}','backup.newPhone':'Nouveau téléphone ?','backup.newPhoneText':'Installez Documenta, connectez le même compte Google, trouvez votre sauvegarde et saisissez votre phrase secrète. Reconnectez ensuite les intégrations et notifications.','backup.noSnapshots':'Aucune sauvegarde trouvée pour le moment.'},
};

const additionalOverrides: Record<Exclude<AppLanguage, 'de' | 'hu' | 'en'>, Partial<Record<TranslationKey, string>>> = {
  ro: {
    ...backupLocaleOverrides.ro,
    ...newLocaleOverrides.ro,
    ...assistantLocaleOverrides.ro,
    'common.back': 'Înapoi', 'common.cancel': 'Anulare', 'common.save': 'Salvare', 'common.close': 'Închidere', 'common.edit': 'Editare',
    'common.review': 'Verificare', 'common.accept': 'Acceptare', 'common.reject': 'Respingere', 'common.complete': 'Finalizat',
    'common.next': 'Următorul', 'common.done': 'Gata', 'common.unknown': 'Necunoscut', 'common.none': 'Niciunul',
    'common.documents': 'Documente', 'common.cases': 'Dosare', 'common.tasks': 'Sarcini', 'common.due': 'Scadent',
    'common.language': 'Limbă', 'common.documentLanguage': 'Limba documentului', 'common.uncertain': 'Nesigur', 'common.status': 'Stare',
    'common.priority': 'Prioritate', 'nav.home': 'Acasă', 'nav.documents': 'Documente', 'nav.add': 'Adăugare', 'nav.search': 'Căutare', 'nav.profile': 'Profil',
    'dashboard.title': 'Prezentare generală', 'dashboard.subtitle': 'Documentele și sarcinile tale locale.', 'dashboard.scan': 'Scanează',
    'dashboard.import': 'Importă', 'dashboard.actions': 'Sarcini', 'dashboard.assistant': 'Asistent', 'documents.title': 'Documente',
    'documents.all': 'Toate', 'documents.emptyTitle': 'Nu există documente aici', 'documents.add': 'Adaugă document',
    'document.type': 'Tip document', 'document.sender': 'Expeditor', 'document.date': 'Dată', 'document.amount': 'Sumă', 'document.deadline': 'Termen',
    'document.language': 'Limba documentului', 'document.archive': 'Arhivă', 'document.trash': 'Coș de gunoi', 'document.restore': 'Restabilește',
    'intelligence.title': 'Inteligență locală pentru documente', 'intelligence.whatIsIt': 'Ce este?', 'intelligence.whatToDo': 'Ce trebuie să fac?',
    'intelligence.byWhen': 'Până când?', 'intelligence.howMuch': 'Cât?', 'intelligence.options': 'Ce opțiuni am?', 'intelligence.evidence': 'Dovezi',
    'action.center': 'CENTRUL SARCINILOR', 'action.title': 'Sarcini și pași următori', 'action.reminders': 'Mementouri', 'action.drafts': 'Ciorne',
    'cases.title': 'Dosare', 'reply.title': 'Ciornă de răspuns', 'reply.language': 'Limba răspunsului',
    'settings.title': 'Setări', 'settings.appLanguage': 'Limba aplicației', 'settings.explanationLanguage': 'Limba explicațiilor', 'settings.replyLanguage': 'Limba răspunsului',
    'settings.languageNames': 'Română', 'search.title': 'Căutare', 'search.placeholder': 'Titlu, expeditor, profil, categorie …',
    'search.profile': 'Profil', 'search.category': 'Categorie', 'search.type': 'Tip document', 'error.title': 'Nu a fost găsit',
  },
  pl: {
    ...backupLocaleOverrides.pl,
    ...newLocaleOverrides.pl,
    ...assistantLocaleOverrides.pl,
    'common.back': 'Wstecz', 'common.cancel': 'Anuluj', 'common.save': 'Zapisz', 'common.close': 'Zamknij', 'common.edit': 'Edytuj',
    'common.review': 'Sprawdź', 'common.accept': 'Akceptuj', 'common.reject': 'Odrzuć', 'common.complete': 'Ukończono', 'common.next': 'Dalej',
    'common.done': 'Gotowe', 'common.unknown': 'Nieznane', 'common.none': 'Brak', 'common.documents': 'Dokumenty', 'common.cases': 'Sprawy',
    'common.tasks': 'Zadania', 'common.due': 'Termin', 'common.language': 'Język', 'common.documentLanguage': 'Język dokumentu', 'common.uncertain': 'Niepewne',
    'common.status': 'Status', 'common.priority': 'Priorytet', 'nav.home': 'Start', 'nav.documents': 'Dokumenty', 'nav.add': 'Dodaj', 'nav.search': 'Szukaj', 'nav.profile': 'Profil',
    'dashboard.title': 'Przegląd', 'dashboard.subtitle': 'Twoje lokalne dokumenty i zadania.', 'dashboard.scan': 'Skanuj', 'dashboard.import': 'Importuj',
    'dashboard.actions': 'Zadania', 'dashboard.assistant': 'Asystent', 'documents.title': 'Dokumenty', 'documents.all': 'Wszystkie', 'documents.emptyTitle': 'Brak dokumentów',
    'documents.add': 'Dodaj dokument', 'document.type': 'Typ dokumentu', 'document.sender': 'Nadawca', 'document.date': 'Data', 'document.amount': 'Kwota', 'document.deadline': 'Termin',
    'document.language': 'Język dokumentu', 'document.archive': 'Archiwum', 'document.trash': 'Kosz', 'document.restore': 'Przywróć',
    'intelligence.title': 'Lokalna inteligencja dokumentów', 'intelligence.whatIsIt': 'Co to jest?', 'intelligence.whatToDo': 'Co mam zrobić?',
    'intelligence.byWhen': 'Do kiedy?', 'intelligence.howMuch': 'Ile?', 'intelligence.options': 'Jakie mam możliwości?', 'intelligence.evidence': 'Dowód',
    'action.center': 'CENTRUM ZADAŃ', 'action.title': 'Zadania i kolejne kroki', 'action.reminders': 'Przypomnienia', 'action.drafts': 'Wersje robocze',
    'cases.title': 'Sprawy', 'reply.title': 'Wersja robocza odpowiedzi', 'reply.language': 'Język odpowiedzi', 'settings.title': 'Ustawienia',
    'settings.appLanguage': 'Język aplikacji', 'settings.explanationLanguage': 'Język wyjaśnień', 'settings.replyLanguage': 'Język odpowiedzi', 'settings.languageNames': 'Polski',
    'search.title': 'Szukaj', 'search.placeholder': 'Tytuł, nadawca, profil, kategoria …', 'search.profile': 'Profile', 'search.category': 'Kategoria', 'search.type': 'Typ dokumentu',
  },
  sk: {
    ...backupLocaleOverrides.sk,
    ...newLocaleOverrides.sk,
    ...assistantLocaleOverrides.sk,
    'common.back': 'Späť', 'common.cancel': 'Zrušiť', 'common.save': 'Uložiť', 'common.close': 'Zavrieť', 'common.edit': 'Upraviť', 'common.review': 'Skontrolovať',
    'common.accept': 'Prijať', 'common.reject': 'Odmietnuť', 'common.complete': 'Dokončené', 'common.next': 'Ďalej', 'common.done': 'Hotovo', 'common.unknown': 'Neznáme',
    'common.none': 'Žiadne', 'common.documents': 'Dokumenty', 'common.cases': 'Prípady', 'common.tasks': 'Úlohy', 'common.due': 'Termín', 'common.language': 'Jazyk',
    'common.documentLanguage': 'Jazyk dokumentu', 'common.uncertain': 'Neisté', 'common.status': 'Stav', 'common.priority': 'Priorita',
    'nav.home': 'Domov', 'nav.documents': 'Dokumenty', 'nav.add': 'Pridať', 'nav.search': 'Hľadať', 'nav.profile': 'Profil',
    'dashboard.title': 'Prehľad', 'dashboard.subtitle': 'Vaše miestne dokumenty a úlohy.', 'dashboard.scan': 'Skenovať', 'dashboard.import': 'Importovať',
    'dashboard.actions': 'Úlohy', 'dashboard.assistant': 'Asistent', 'documents.title': 'Dokumenty', 'documents.all': 'Všetky', 'documents.emptyTitle': 'Žiadne dokumenty',
    'documents.add': 'Pridať dokument', 'document.type': 'Typ dokumentu', 'document.sender': 'Odosielateľ', 'document.date': 'Dátum', 'document.amount': 'Suma', 'document.deadline': 'Lehota',
    'document.language': 'Jazyk dokumentu', 'document.archive': 'Archív', 'document.trash': 'Kôš', 'document.restore': 'Obnoviť',
    'intelligence.title': 'Miestna inteligencia dokumentov', 'intelligence.whatIsIt': 'Čo je to?', 'intelligence.whatToDo': 'Čo mám urobiť?', 'intelligence.byWhen': 'Dokedy?',
    'intelligence.howMuch': 'Koľko?', 'intelligence.options': 'Aké mám možnosti?', 'intelligence.evidence': 'Dôkaz', 'action.center': 'CENTRUM ÚLOH',
    'action.title': 'Úlohy a ďalšie kroky', 'action.reminders': 'Pripomienky', 'action.drafts': 'Koncepty', 'cases.title': 'Prípady',
    'reply.title': 'Koncept odpovede', 'reply.language': 'Jazyk odpovede', 'settings.title': 'Nastavenia', 'settings.appLanguage': 'Jazyk aplikácie',
    'settings.explanationLanguage': 'Jazyk vysvetlení', 'settings.replyLanguage': 'Jazyk odpovede', 'settings.languageNames': 'Slovenčina',
    'search.title': 'Hľadať', 'search.placeholder': 'Názov, odosielateľ, profil, kategória …', 'search.profile': 'Profily', 'search.category': 'Kategória', 'search.type': 'Typ dokumentu',
  },
  uk: {
    ...backupLocaleOverrides.uk,
    ...newLocaleOverrides.uk,
    ...assistantLocaleOverrides.uk,
    'common.back': 'Назад', 'common.cancel': 'Скасувати', 'common.save': 'Зберегти', 'common.close': 'Закрити', 'common.edit': 'Редагувати', 'common.review': 'Перевірити',
    'common.accept': 'Прийняти', 'common.reject': 'Відхилити', 'common.complete': 'Завершено', 'common.next': 'Далі', 'common.done': 'Готово', 'common.unknown': 'Невідомо',
    'common.none': 'Немає', 'common.documents': 'Документи', 'common.cases': 'Справи', 'common.tasks': 'Завдання', 'common.due': 'Термін', 'common.language': 'Мова',
    'common.documentLanguage': 'Мова документа', 'common.uncertain': 'Невизначено', 'common.status': 'Статус', 'common.priority': 'Пріоритет',
    'nav.home': 'Головна', 'nav.documents': 'Документи', 'nav.add': 'Додати', 'nav.search': 'Пошук', 'nav.profile': 'Профіль', 'dashboard.title': 'Огляд',
    'dashboard.subtitle': 'Ваші локальні документи та завдання.', 'dashboard.scan': 'Сканувати', 'dashboard.import': 'Імпортувати', 'dashboard.actions': 'Завдання',
    'dashboard.assistant': 'Помічник', 'documents.title': 'Документи', 'documents.all': 'Усі', 'documents.emptyTitle': 'Документів немає', 'documents.add': 'Додати документ',
    'document.type': 'Тип документа', 'document.sender': 'Відправник', 'document.date': 'Дата', 'document.amount': 'Сума', 'document.deadline': 'Термін',
    'document.language': 'Мова документа', 'document.archive': 'Архів', 'document.trash': 'Кошик', 'document.restore': 'Відновити',
    'intelligence.title': 'Локальний інтелект документів', 'intelligence.whatIsIt': 'Що це?', 'intelligence.whatToDo': 'Що потрібно зробити?', 'intelligence.byWhen': 'До якого терміну?',
    'intelligence.howMuch': 'Скільки?', 'intelligence.options': 'Які є можливості?', 'intelligence.evidence': 'Доказ', 'action.center': 'ЦЕНТР ЗАВДАНЬ',
    'action.title': 'Завдання та наступні кроки', 'action.reminders': 'Нагадування', 'action.drafts': 'Чернетки', 'cases.title': 'Справи',
    'reply.title': 'Чернетка відповіді', 'reply.language': 'Мова відповіді', 'settings.title': 'Налаштування', 'settings.appLanguage': 'Мова застосунку',
    'settings.explanationLanguage': 'Мова пояснень', 'settings.replyLanguage': 'Мова відповіді', 'settings.languageNames': 'Українська',
    'search.title': 'Пошук', 'search.placeholder': 'Назва, відправник, профіль, категорія …', 'search.profile': 'Профілі', 'search.category': 'Категорія', 'search.type': 'Тип документа',
  },
  tr: {
    ...backupLocaleOverrides.tr,
    ...newLocaleOverrides.tr,
    ...assistantLocaleOverrides.tr,
    'common.back': 'Geri', 'common.cancel': 'İptal', 'common.save': 'Kaydet', 'common.close': 'Kapat', 'common.edit': 'Düzenle', 'common.review': 'İncele',
    'common.accept': 'Kabul et', 'common.reject': 'Reddet', 'common.complete': 'Tamamlandı', 'common.next': 'İleri', 'common.done': 'Tamam', 'common.unknown': 'Bilinmiyor',
    'common.none': 'Yok', 'common.documents': 'Belgeler', 'common.cases': 'Dosyalar', 'common.tasks': 'Görevler', 'common.due': 'Son tarih', 'common.language': 'Dil',
    'common.documentLanguage': 'Belge dili', 'common.uncertain': 'Belirsiz', 'common.status': 'Durum', 'common.priority': 'Öncelik',
    'nav.home': 'Ana sayfa', 'nav.documents': 'Belgeler', 'nav.add': 'Ekle', 'nav.search': 'Ara', 'nav.profile': 'Profil', 'dashboard.title': 'Genel bakış',
    'dashboard.subtitle': 'Yerel belgeleriniz ve görevleriniz.', 'dashboard.scan': 'Tara', 'dashboard.import': 'İçe aktar', 'dashboard.actions': 'Görevler', 'dashboard.assistant': 'Asistan',
    'documents.title': 'Belgeler', 'documents.all': 'Tümü', 'documents.emptyTitle': 'Burada belge yok', 'documents.add': 'Belge ekle', 'document.type': 'Belge türü',
    'document.sender': 'Gönderen', 'document.date': 'Tarih', 'document.amount': 'Tutar', 'document.deadline': 'Son tarih', 'document.language': 'Belge dili',
    'document.archive': 'Arşiv', 'document.trash': 'Çöp kutusu', 'document.restore': 'Geri yükle', 'intelligence.title': 'Yerel belge zekâsı',
    'intelligence.whatIsIt': 'Bu nedir?', 'intelligence.whatToDo': 'Ne yapmalıyım?', 'intelligence.byWhen': 'Ne zamana kadar?', 'intelligence.howMuch': 'Ne kadar?',
    'intelligence.options': 'Hangi seçeneklerim var?', 'intelligence.evidence': 'Kanıt', 'action.center': 'GÖREV MERKEZİ', 'action.title': 'Görevler ve sonraki adımlar',
    'action.reminders': 'Hatırlatıcılar', 'action.drafts': 'Taslaklar', 'cases.title': 'Dosyalar', 'reply.title': 'Yanıt taslağı', 'reply.language': 'Yanıt dili',
    'settings.title': 'Ayarlar', 'settings.appLanguage': 'Uygulama dili', 'settings.explanationLanguage': 'Açıklama dili', 'settings.replyLanguage': 'Yanıt dili', 'settings.languageNames': 'Türkçe',
    'search.title': 'Ara', 'search.placeholder': 'Başlık, gönderen, profil, kategori …', 'search.profile': 'Profiller', 'search.category': 'Kategori', 'search.type': 'Belge türü',
  },
  ar: {
    ...backupLocaleOverrides.ar,
    ...newLocaleOverrides.ar,
    ...assistantLocaleOverrides.ar,
    'common.back': 'رجوع', 'common.cancel': 'إلغاء', 'common.save': 'حفظ', 'common.close': 'إغلاق', 'common.edit': 'تعديل', 'common.review': 'مراجعة',
    'common.accept': 'قبول', 'common.reject': 'رفض', 'common.complete': 'مكتمل', 'common.next': 'التالي', 'common.done': 'تم', 'common.unknown': 'غير معروف',
    'common.none': 'لا شيء', 'common.documents': 'المستندات', 'common.cases': 'الملفات', 'common.tasks': 'المهام', 'common.due': 'مستحق', 'common.language': 'اللغة',
    'common.documentLanguage': 'لغة المستند', 'common.uncertain': 'غير مؤكد', 'common.status': 'الحالة', 'common.priority': 'الأولوية',
    'nav.home': 'الرئيسية', 'nav.documents': 'المستندات', 'nav.add': 'إضافة', 'nav.search': 'بحث', 'nav.profile': 'الملف الشخصي', 'dashboard.title': 'نظرة عامة',
    'dashboard.subtitle': 'مستنداتك ومهامك المحلية.', 'dashboard.scan': 'مسح', 'dashboard.import': 'استيراد', 'dashboard.actions': 'المهام', 'dashboard.assistant': 'المساعد',
    'documents.title': 'المستندات', 'documents.all': 'الكل', 'documents.emptyTitle': 'لا توجد مستندات هنا', 'documents.add': 'إضافة مستند', 'document.type': 'نوع المستند',
    'document.sender': 'المرسل', 'document.date': 'التاريخ', 'document.amount': 'المبلغ', 'document.deadline': 'الموعد النهائي', 'document.language': 'لغة المستند',
    'document.archive': 'الأرشيف', 'document.trash': 'المهملات', 'document.restore': 'استعادة', 'intelligence.title': 'ذكاء المستندات المحلي',
    'intelligence.whatIsIt': 'ما هذا؟', 'intelligence.whatToDo': 'ماذا يجب أن أفعل؟', 'intelligence.byWhen': 'متى؟', 'intelligence.howMuch': 'كم؟',
    'intelligence.options': 'ما الخيارات المتاحة؟', 'intelligence.evidence': 'الدليل', 'action.center': 'مركز المهام', 'action.title': 'المهام والخطوات التالية',
    'action.reminders': 'التذكيرات', 'action.drafts': 'المسودات', 'cases.title': 'الملفات', 'reply.title': 'مسودة الرد', 'reply.language': 'لغة الرد',
    'settings.title': 'الإعدادات', 'settings.appLanguage': 'لغة التطبيق', 'settings.explanationLanguage': 'لغة الشرح', 'settings.replyLanguage': 'لغة الرد', 'settings.languageNames': 'العربية',
    'search.title': 'بحث', 'search.placeholder': 'العنوان أو المرسل أو الملف أو الفئة …', 'search.profile': 'الملفات الشخصية', 'search.category': 'الفئة', 'search.type': 'نوع المستند',
  },
  cs: {
    ...backupLocaleOverrides.cs,
    ...newLocaleOverrides.cs,
    ...assistantLocaleOverrides.cs,
    'common.back': 'Zpět', 'common.cancel': 'Zrušit', 'common.save': 'Uložit', 'common.close': 'Zavřít', 'common.edit': 'Upravit', 'common.review': 'Zkontrolovat',
    'common.accept': 'Přijmout', 'common.reject': 'Odmítnout', 'common.complete': 'Dokončeno', 'common.next': 'Další', 'common.done': 'Hotovo', 'common.unknown': 'Neznámé',
    'common.none': 'Žádné', 'common.documents': 'Dokumenty', 'common.cases': 'Případy', 'common.tasks': 'Úkoly', 'common.due': 'Termín', 'common.language': 'Jazyk',
    'common.documentLanguage': 'Jazyk dokumentu', 'common.uncertain': 'Nejisté', 'common.status': 'Stav', 'common.priority': 'Priorita',
    'nav.home': 'Domů', 'nav.documents': 'Dokumenty', 'nav.add': 'Přidat', 'nav.search': 'Hledat', 'nav.profile': 'Profil', 'dashboard.title': 'Přehled',
    'dashboard.subtitle': 'Vaše místní dokumenty a úkoly.', 'dashboard.scan': 'Skenovat', 'dashboard.import': 'Importovat', 'dashboard.actions': 'Úkoly', 'dashboard.assistant': 'Asistent',
    'documents.title': 'Dokumenty', 'documents.all': 'Vše', 'documents.emptyTitle': 'Žádné dokumenty', 'documents.add': 'Přidat dokument', 'document.type': 'Typ dokumentu',
    'document.sender': 'Odesílatel', 'document.date': 'Datum', 'document.amount': 'Částka', 'document.deadline': 'Termín', 'document.language': 'Jazyk dokumentu',
    'document.archive': 'Archiv', 'document.trash': 'Koš', 'document.restore': 'Obnovit', 'intelligence.title': 'Místní inteligence dokumentů',
    'intelligence.whatIsIt': 'Co to je?', 'intelligence.whatToDo': 'Co mám udělat?', 'intelligence.byWhen': 'Do kdy?', 'intelligence.howMuch': 'Kolik?',
    'intelligence.options': 'Jaké mám možnosti?', 'intelligence.evidence': 'Důkaz', 'action.center': 'CENTRUM ÚKOLŮ', 'action.title': 'Úkoly a další kroky',
    'action.reminders': 'Připomenutí', 'action.drafts': 'Koncepty', 'cases.title': 'Případy', 'reply.title': 'Koncept odpovědi', 'reply.language': 'Jazyk odpovědi',
    'settings.title': 'Nastavení', 'settings.appLanguage': 'Jazyk aplikace', 'settings.explanationLanguage': 'Jazyk vysvětlení', 'settings.replyLanguage': 'Jazyk odpovědi', 'settings.languageNames': 'Čeština',
    'search.title': 'Hledat', 'search.placeholder': 'Název, odesílatel, profil, kategorie …', 'search.profile': 'Profily', 'search.category': 'Kategorie', 'search.type': 'Typ dokumentu',
  },
  bg: {
    ...backupLocaleOverrides.bg,
    ...newLocaleOverrides.bg,
    ...assistantLocaleOverrides.bg,
    'common.back': 'Назад', 'common.cancel': 'Отказ', 'common.save': 'Запази', 'common.close': 'Затвори', 'common.edit': 'Редактиране', 'common.review': 'Преглед',
    'common.accept': 'Приеми', 'common.reject': 'Отхвърли', 'common.complete': 'Завършено', 'common.next': 'Напред', 'common.done': 'Готово', 'common.unknown': 'Неизвестно',
    'common.none': 'Няма', 'common.documents': 'Документи', 'common.cases': 'Случаи', 'common.tasks': 'Задачи', 'common.due': 'Срок', 'common.language': 'Език',
    'common.documentLanguage': 'Език на документа', 'common.uncertain': 'Несигурно', 'common.status': 'Статус', 'common.priority': 'Приоритет',
    'nav.home': 'Начало', 'nav.documents': 'Документи', 'nav.add': 'Добави', 'nav.search': 'Търсене', 'nav.profile': 'Профил', 'dashboard.title': 'Преглед',
    'dashboard.subtitle': 'Вашите локални документи и задачи.', 'dashboard.scan': 'Сканиране', 'dashboard.import': 'Импортиране', 'dashboard.actions': 'Задачи', 'dashboard.assistant': 'Асистент',
    'documents.title': 'Документи', 'documents.all': 'Всички', 'documents.emptyTitle': 'Няма документи', 'documents.add': 'Добави документ', 'document.type': 'Тип документ',
    'document.sender': 'Подател', 'document.date': 'Дата', 'document.amount': 'Сума', 'document.deadline': 'Краен срок', 'document.language': 'Език на документа',
    'document.archive': 'Архив', 'document.trash': 'Кошче', 'document.restore': 'Възстанови', 'intelligence.title': 'Локален интелект за документи',
    'intelligence.whatIsIt': 'Какво е това?', 'intelligence.whatToDo': 'Какво трябва да направя?', 'intelligence.byWhen': 'До кога?', 'intelligence.howMuch': 'Колко?',
    'intelligence.options': 'Какви са възможностите ми?', 'intelligence.evidence': 'Доказателство', 'action.center': 'ЦЕНТЪР ЗА ЗАДАЧИ', 'action.title': 'Задачи и следващи стъпки',
    'action.reminders': 'Напомняния', 'action.drafts': 'Чернови', 'cases.title': 'Случаи', 'reply.title': 'Чернова на отговор', 'reply.language': 'Език на отговора',
    'settings.title': 'Настройки', 'settings.appLanguage': 'Език на приложението', 'settings.explanationLanguage': 'Език на обясненията', 'settings.replyLanguage': 'Език на отговора', 'settings.languageNames': 'Български',
    'search.title': 'Търсене', 'search.placeholder': 'Заглавие, подател, профил, категория …', 'search.profile': 'Профили', 'search.category': 'Категория', 'search.type': 'Тип документ',
  },
  hr: {
    ...backupLocaleOverrides.hr,
    ...newLocaleOverrides.hr,
    ...assistantLocaleOverrides.hr,
    'common.back': 'Natrag', 'common.cancel': 'Odustani', 'common.save': 'Spremi', 'common.close': 'Zatvori', 'common.edit': 'Uredi', 'common.review': 'Provjeri',
    'common.accept': 'Prihvati', 'common.reject': 'Odbij', 'common.complete': 'Dovršeno', 'common.next': 'Dalje', 'common.done': 'Gotovo', 'common.unknown': 'Nepoznato',
    'common.none': 'Nema', 'common.documents': 'Dokumenti', 'common.cases': 'Slučajevi', 'common.tasks': 'Zadaci', 'common.due': 'Rok', 'common.language': 'Jezik',
    'common.documentLanguage': 'Jezik dokumenta', 'common.uncertain': 'Nesigurno', 'common.status': 'Status', 'common.priority': 'Prioritet',
    'nav.home': 'Početna', 'nav.documents': 'Dokumenti', 'nav.add': 'Dodaj', 'nav.search': 'Pretraži', 'nav.profile': 'Profil', 'dashboard.title': 'Pregled',
    'dashboard.subtitle': 'Vaši lokalni dokumenti i zadaci.', 'dashboard.scan': 'Skeniraj', 'dashboard.import': 'Uvezi', 'dashboard.actions': 'Zadaci', 'dashboard.assistant': 'Asistent',
    'documents.title': 'Dokumenti', 'documents.all': 'Svi', 'documents.emptyTitle': 'Nema dokumenata', 'documents.add': 'Dodaj dokument', 'document.type': 'Vrsta dokumenta',
    'document.sender': 'Pošiljatelj', 'document.date': 'Datum', 'document.amount': 'Iznos', 'document.deadline': 'Rok', 'document.language': 'Jezik dokumenta',
    'document.archive': 'Arhiva', 'document.trash': 'Smeće', 'document.restore': 'Vrati', 'intelligence.title': 'Lokalna inteligencija dokumenata',
    'intelligence.whatIsIt': 'Što je ovo?', 'intelligence.whatToDo': 'Što trebam učiniti?', 'intelligence.byWhen': 'Do kada?', 'intelligence.howMuch': 'Koliko?',
    'intelligence.options': 'Koje su moje mogućnosti?', 'intelligence.evidence': 'Dokaz', 'action.center': 'CENTAR ZADATAKA', 'action.title': 'Zadaci i sljedeći koraci',
    'action.reminders': 'Podsjetnici', 'action.drafts': 'Nacrti', 'cases.title': 'Slučajevi', 'reply.title': 'Nacrt odgovora', 'reply.language': 'Jezik odgovora',
    'settings.title': 'Postavke', 'settings.appLanguage': 'Jezik aplikacije', 'settings.explanationLanguage': 'Jezik objašnjenja', 'settings.replyLanguage': 'Jezik odgovora', 'settings.languageNames': 'Hrvatski',
    'search.title': 'Pretraži', 'search.placeholder': 'Naslov, pošiljatelj, profil, kategorija …', 'search.profile': 'Profili', 'search.category': 'Kategorija', 'search.type': 'Vrsta dokumenta',
  },
  sr: {
    ...backupLocaleOverrides.sr,
    ...newLocaleOverrides.sr,
    ...assistantLocaleOverrides.sr,
    'common.back': 'Назад', 'common.cancel': 'Откажи', 'common.save': 'Сачувај', 'common.close': 'Затвори', 'common.edit': 'Измени', 'common.review': 'Провери',
    'common.accept': 'Прихвати', 'common.reject': 'Одбиј', 'common.complete': 'Завршено', 'common.next': 'Даље', 'common.done': 'Готово', 'common.unknown': 'Непознато',
    'common.none': 'Нема', 'common.documents': 'Документи', 'common.cases': 'Предмети', 'common.tasks': 'Задаци', 'common.due': 'Рок', 'common.language': 'Језик',
    'common.documentLanguage': 'Језик документа', 'common.uncertain': 'Неизвесно', 'common.status': 'Статус', 'common.priority': 'Приоритет',
    'nav.home': 'Почетна', 'nav.documents': 'Документи', 'nav.add': 'Додај', 'nav.search': 'Претрага', 'nav.profile': 'Профил', 'dashboard.title': 'Преглед',
    'dashboard.subtitle': 'Ваши локални документи и задаци.', 'dashboard.scan': 'Скенирај', 'dashboard.import': 'Увези', 'dashboard.actions': 'Задаци', 'dashboard.assistant': 'Помоћник',
    'documents.title': 'Документи', 'documents.all': 'Сви', 'documents.emptyTitle': 'Нема докумената', 'documents.add': 'Додај документ', 'document.type': 'Врста документа',
    'document.sender': 'Пошиљалац', 'document.date': 'Датум', 'document.amount': 'Износ', 'document.deadline': 'Рок', 'document.language': 'Језик документа',
    'document.archive': 'Архива', 'document.trash': 'Канта', 'document.restore': 'Врати', 'intelligence.title': 'Локална интелигенција докумената',
    'intelligence.whatIsIt': 'Шта је ово?', 'intelligence.whatToDo': 'Шта треба да урадим?', 'intelligence.byWhen': 'До када?', 'intelligence.howMuch': 'Колико?',
    'intelligence.options': 'Које су могућности?', 'intelligence.evidence': 'Доказ', 'action.center': 'ЦЕНТАР ЗАДАТАКА', 'action.title': 'Задаци и следећи кораци',
    'action.reminders': 'Подсетници', 'action.drafts': 'Нацрти', 'cases.title': 'Предмети', 'reply.title': 'Нацрт одговора', 'reply.language': 'Језик одговора',
    'settings.title': 'Подешавања', 'settings.appLanguage': 'Језик апликације', 'settings.explanationLanguage': 'Језик објашњења', 'settings.replyLanguage': 'Језик одговора', 'settings.languageNames': 'Srpski',
    'search.title': 'Претрага', 'search.placeholder': 'Наслов, пошиљалац, профил, категорија …', 'search.profile': 'Профили', 'search.category': 'Категорија', 'search.type': 'Врста документа',
  },
  it: {
    ...backupLocaleOverrides.it,
    ...newLocaleOverrides.it,
    ...assistantLocaleOverrides.it,
    'common.back': 'Indietro', 'common.cancel': 'Annulla', 'common.save': 'Salva', 'common.close': 'Chiudi', 'common.edit': 'Modifica', 'common.review': 'Verifica',
    'common.accept': 'Accetta', 'common.reject': 'Rifiuta', 'common.complete': 'Completato', 'common.next': 'Avanti', 'common.done': 'Fatto', 'common.unknown': 'Sconosciuto',
    'common.none': 'Nessuno', 'common.documents': 'Documenti', 'common.cases': 'Pratiche', 'common.tasks': 'Attività', 'common.due': 'Scadenza', 'common.language': 'Lingua',
    'common.documentLanguage': 'Lingua del documento', 'common.uncertain': 'Incerto', 'common.status': 'Stato', 'common.priority': 'Priorità',
    'nav.home': 'Home', 'nav.documents': 'Documenti', 'nav.add': 'Aggiungi', 'nav.search': 'Cerca', 'nav.profile': 'Profilo', 'dashboard.title': 'Panoramica',
    'dashboard.subtitle': 'I tuoi documenti e le tue attività locali.', 'dashboard.scan': 'Scansiona', 'dashboard.import': 'Importa', 'dashboard.actions': 'Attività', 'dashboard.assistant': 'Assistente',
    'documents.title': 'Documenti', 'documents.all': 'Tutti', 'documents.emptyTitle': 'Nessun documento', 'documents.add': 'Aggiungi documento', 'document.type': 'Tipo di documento',
    'document.sender': 'Mittente', 'document.date': 'Data', 'document.amount': 'Importo', 'document.deadline': 'Scadenza', 'document.language': 'Lingua del documento',
    'document.archive': 'Archivio', 'document.trash': 'Cestino', 'document.restore': 'Ripristina', 'intelligence.title': 'Intelligenza locale dei documenti',
    'intelligence.whatIsIt': 'Che cos’è?', 'intelligence.whatToDo': 'Cosa devo fare?', 'intelligence.byWhen': 'Entro quando?', 'intelligence.howMuch': 'Quanto?',
    'intelligence.options': 'Quali sono le mie possibilità?', 'intelligence.evidence': 'Prova', 'action.center': 'CENTRO ATTIVITÀ', 'action.title': 'Attività e prossimi passi',
    'action.reminders': 'Promemoria', 'action.drafts': 'Bozze', 'cases.title': 'Pratiche', 'reply.title': 'Bozza di risposta', 'reply.language': 'Lingua della risposta',
    'settings.title': 'Impostazioni', 'settings.appLanguage': 'Lingua dell’app', 'settings.explanationLanguage': 'Lingua delle spiegazioni', 'settings.replyLanguage': 'Lingua della risposta', 'settings.languageNames': 'Italiano',
    'search.title': 'Cerca', 'search.placeholder': 'Titolo, mittente, profilo, categoria …', 'search.profile': 'Profili', 'search.category': 'Categoria', 'search.type': 'Tipo di documento',
  },
  fr: {
    ...backupLocaleOverrides.fr,
    ...newLocaleOverrides.fr,
    ...assistantLocaleOverrides.fr,
    'common.back': 'Retour', 'common.cancel': 'Annuler', 'common.save': 'Enregistrer', 'common.close': 'Fermer', 'common.edit': 'Modifier', 'common.review': 'Vérifier',
    'common.accept': 'Accepter', 'common.reject': 'Refuser', 'common.complete': 'Terminé', 'common.next': 'Suivant', 'common.done': 'Terminé', 'common.unknown': 'Inconnu',
    'common.none': 'Aucun', 'common.documents': 'Documents', 'common.cases': 'Dossiers', 'common.tasks': 'Tâches', 'common.due': 'Échéance', 'common.language': 'Langue',
    'common.documentLanguage': 'Langue du document', 'common.uncertain': 'Incertain', 'common.status': 'Statut', 'common.priority': 'Priorité',
    'nav.home': 'Accueil', 'nav.documents': 'Documents', 'nav.add': 'Ajouter', 'nav.search': 'Rechercher', 'nav.profile': 'Profil', 'dashboard.title': 'Vue d’ensemble',
    'dashboard.subtitle': 'Vos documents et tâches locaux.', 'dashboard.scan': 'Scanner', 'dashboard.import': 'Importer', 'dashboard.actions': 'Tâches', 'dashboard.assistant': 'Assistant',
    'documents.title': 'Documents', 'documents.all': 'Tous', 'documents.emptyTitle': 'Aucun document', 'documents.add': 'Ajouter un document', 'document.type': 'Type de document',
    'document.sender': 'Expéditeur', 'document.date': 'Date', 'document.amount': 'Montant', 'document.deadline': 'Échéance', 'document.language': 'Langue du document',
    'document.archive': 'Archives', 'document.trash': 'Corbeille', 'document.restore': 'Restaurer', 'intelligence.title': 'Intelligence locale des documents',
    'intelligence.whatIsIt': 'Qu’est-ce que c’est ?', 'intelligence.whatToDo': 'Que dois-je faire ?', 'intelligence.byWhen': 'Pour quand ?', 'intelligence.howMuch': 'Combien ?',
    'intelligence.options': 'Quelles sont mes possibilités ?', 'intelligence.evidence': 'Preuve', 'action.center': 'CENTRE DES TÂCHES', 'action.title': 'Tâches et prochaines étapes',
    'action.reminders': 'Rappels', 'action.drafts': 'Brouillons', 'cases.title': 'Dossiers', 'reply.title': 'Brouillon de réponse', 'reply.language': 'Langue de la réponse',
    'settings.title': 'Paramètres', 'settings.appLanguage': 'Langue de l’application', 'settings.explanationLanguage': 'Langue des explications', 'settings.replyLanguage': 'Langue de la réponse', 'settings.languageNames': 'Français',
    'search.title': 'Rechercher', 'search.placeholder': 'Titre, expéditeur, profil, catégorie …', 'search.profile': 'Profils', 'search.category': 'Catégorie', 'search.type': 'Type de document',
  },
};

function completeCatalog(language: Exclude<AppLanguage, 'de' | 'hu' | 'en'>): TranslationDictionary {
  const overrides = additionalOverrides[language];
  return Object.fromEntries(
    Object.keys(en).map((key) => [key, overrides[key as TranslationKey] ?? localizeEnglishText(en[key as TranslationKey], language)]),
  ) as TranslationDictionary;
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function languageFromLegacy(value: unknown, fallback: AppLanguage = FALLBACK_LANGUAGE): AppLanguage {
  if (isAppLanguage(value)) return value;
  if (value === 'Deutsch') return 'de';
  if (value === 'Magyar') return 'hu';
  if (value === 'English') return 'en';
  return fallback;
}

export function languageName(language: AppLanguage, displayLanguage: AppLanguage = language): string {
  const legacyLocalizedNames: Partial<Record<AppLanguage, Partial<Record<AppLanguage, string>>>> = {
    de: { de: 'Deutsch', hu: 'Ungarisch', en: 'Englisch' },
    hu: { de: 'Német', hu: 'Magyar', en: 'Angol' },
    en: { de: 'German', hu: 'Hungarian', en: 'English' },
  };
  const localized = legacyLocalizedNames[displayLanguage]?.[language];
  if (localized) return localized;
  return languageDefinition(language).nativeName;
}

export function detectDeviceLanguage(locale?: string): AppLanguage {
  const normalized = (locale ?? (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : '')).toLowerCase();
  const code = normalized.split(/[-_]/)[0];
  return isAppLanguage(code) ? code : FALLBACK_LANGUAGE;
}

export function migrateLanguagePreferences(
  raw: { appLanguage?: unknown; explanationLanguage?: unknown; replyLanguage?: unknown; defaultResponseLanguage?: unknown } | undefined,
  deviceLanguage = detectDeviceLanguage(),
): { appLanguage: AppLanguage; explanationLanguage: AppLanguage; replyLanguage: AppLanguage } {
  const legacyReply = languageFromLegacy(raw?.defaultResponseLanguage, deviceLanguage);
  return {
    appLanguage: languageFromLegacy(raw?.appLanguage, deviceLanguage),
    explanationLanguage: languageFromLegacy(raw?.explanationLanguage, legacyReply),
    replyLanguage: languageFromLegacy(raw?.replyLanguage, legacyReply),
  };
}

function interpolate(template: string, variables?: Record<string, string | number>): string {
  if (!variables) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(variables[key] ?? ''));
}

export function t(language: AppLanguage, key: TranslationKey, variables?: Record<string, string | number>): string {
  const selected = translations[language]?.[key];
  const fallback = translations[FALLBACK_LANGUAGE][key];
  if (!selected && (globalThis as { __DEV__?: boolean }).__DEV__) {
    console.warn(`[localization] Missing translation: ${language}.${key}`);
  }
  return interpolate(selected ?? fallback ?? '—', variables);
}

export function plural(language: AppLanguage, count: number, singular: TranslationKey, pluralKey: TranslationKey, variables?: Record<string, string | number>): string {
  return t(language, count === 1 ? singular : pluralKey, { count, ...variables });
}

export function formatDate(value: string | Date | undefined, language: AppLanguage): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`);
  if (Number.isNaN(date.getTime())) return value instanceof Date ? '—' : value;
  return new Intl.DateTimeFormat(languageLocale(language)).format(date);
}

export function formatLongDate(value: string | Date | undefined, language: AppLanguage): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`);
  if (Number.isNaN(date.getTime())) return value instanceof Date ? '—' : value;
  return new Intl.DateTimeFormat(languageLocale(language), { dateStyle: 'long' }).format(date);
}

export function parseDisplayNumber(value: string | number): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const cleaned = value.trim().replace(/[^\d,.-]/g, '');
  if (!cleaned) return undefined;
  const comma = cleaned.lastIndexOf(',');
  const dot = cleaned.lastIndexOf('.');
  const hasBoth = comma >= 0 && dot >= 0;
  const soleSeparator = comma >= 0 ? ',' : dot >= 0 ? '.' : undefined;
  const trailingDigits = soleSeparator ? cleaned.length - cleaned.lastIndexOf(soleSeparator) - 1 : 0;
  // A sole separator followed by exactly three digits is treated as grouping.
  // This keeps valid DE/HU "1.234" and EN "1,234" integers financially safe.
  const decimalSeparator = hasBoth
    ? comma > dot ? ',' : '.'
    : soleSeparator && trailingDigits !== 3 ? soleSeparator : undefined;
  const normalized = decimalSeparator
    ? cleaned.replace(new RegExp(`\\${decimalSeparator === ',' ? '.' : ','}`, 'g'), '').replace(decimalSeparator, '.')
    : cleaned.replace(/[.,]/g, '');
  const result = Number(normalized);
  return Number.isFinite(result) ? result : undefined;
}

export function formatNumber(value: string | number | undefined, language: AppLanguage): string {
  if (value === undefined) return '—';
  const parsed = parseDisplayNumber(value);
  if (parsed === undefined) return String(value);
  return new Intl.NumberFormat(languageLocale(language), { maximumFractionDigits: 20 }).format(parsed);
}

export function formatCurrency(value: string | number | undefined, language: AppLanguage, currency = 'EUR'): string {
  if (value === undefined) return '—';
  const parsed = parseDisplayNumber(value);
  if (parsed === undefined) return String(value);
  const source = String(value).replace(/\s/g, '');
  const separators = source.match(/[.,]/g)?.length ?? 0;
  const decimalPart = source.match(/[.,](\d+)(?:\D*)$/)?.[1];
  const isGroupedInteger = separators === 1 && decimalPart?.length === 3;
  const fractionDigits = Math.min(isGroupedInteger ? 2 : decimalPart?.length ?? 2, 20);
  return new Intl.NumberFormat(languageLocale(language), {
    style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
  }).format(parsed);
}

const documentStatusKeys: Record<string, Partial<Record<AppLanguage, string>>> = {
  Neu: { de: 'Neu', hu: 'Új', en: 'New' },
  Gelesen: { de: 'Gelesen', hu: 'Olvasott', en: 'Read' },
  'Zu erledigen': { de: 'Zu erledigen', hu: 'Teendő', en: 'To do' },
  'Antwort gesendet': { de: 'Antwort gesendet', hu: 'Válasz elküldve', en: 'Reply sent' },
  'Zu bezahlen': { de: 'Zu bezahlen', hu: 'Fizetendő', en: 'To pay' },
  Später: { de: 'Später', hu: 'Később', en: 'Later' },
  Bezahlt: { de: 'Bezahlt', hu: 'Kifizetve', en: 'Paid' },
  Wartet: { de: 'Wartet', hu: 'Várakozik', en: 'Waiting' },
  Abgeschlossen: { de: 'Abgeschlossen', hu: 'Lezárva', en: 'Completed' },
};

const actionStatusKeys: Record<string, TranslationKey> = {
  suggested: 'action.statusSuggested', needs_review: 'action.statusNeedsReview', confirmed: 'action.statusConfirmed',
  in_progress: 'action.statusInProgress', waiting: 'action.statusWaiting', completed: 'action.statusCompleted',
  cancelled: 'action.statusCancelled', rejected: 'action.statusRejected', archived: 'action.statusArchived',
};

export function documentStatusLabel(value: string, language: AppLanguage): string {
  return documentStatusKeys[value]?.[language] ?? localizeEnglishText(documentStatusKeys[value]?.en ?? value, language);
}

export function actionStatusLabel(value: string, language: AppLanguage): string {
  const key = actionStatusKeys[value];
  return key ? t(language, key) : value;
}

export function confidenceLabel(value: string, language: AppLanguage): string {
  const key = value === 'high' ? 'common.high' : value === 'medium' ? 'common.medium' : value === 'low' ? 'common.low' : 'common.unknown';
  return t(language, key);
}

type LocalizedLabels = Record<string, Partial<Record<AppLanguage, string>>>;

const englishTermTranslations: Record<Exclude<AppLanguage, 'de' | 'hu' | 'en'>, Record<string, string>> = {
  ro: {
    Back: 'Înapoi', Cancel: 'Anulare', Save: 'Salvare', Close: 'Închidere', Edit: 'Editare', Review: 'Verificare',
    Accept: 'Acceptare', Reject: 'Respingere', Complete: 'Finalizat', Next: 'Următorul', Done: 'Gata', Unknown: 'Necunoscut',
    None: 'Niciunul', Documents: 'Documente', Cases: 'Dosare', Tasks: 'Sarcini', Due: 'Scadent', Language: 'Limbă',
    'Document language': 'Limba documentului', Uncertain: 'Nesigur', page: 'pagină', pages: 'pagini', Status: 'Stare',
    Priority: 'Prioritate', high: 'ridicată', medium: 'medie', low: 'scăzută', open: 'deschis', Loading: 'Se încarcă',
    Error: 'Eroare', Home: 'Acasă', Add: 'Adăugare', Search: 'Căutare', Profile: 'Profil', Overview: 'Prezentare',
    'New documents': 'Documente noi', 'Upcoming deadlines': 'Termene apropiate', Amount: 'Sumă', Deadline: 'Termen',
    Category: 'Categorie', 'Document type': 'Tip document', Sender: 'Expeditor', 'No documents here': 'Nu există documente aici',
    'No notifications.': 'Nu există notificări.', 'Privacy and security': 'Confidențialitate și securitate',
  },
  pl: {
    Back: 'Wstecz', Cancel: 'Anuluj', Save: 'Zapisz', Close: 'Zamknij', Edit: 'Edytuj', Review: 'Sprawdź',
    Accept: 'Akceptuj', Reject: 'Odrzuć', Complete: 'Ukończono', Next: 'Dalej', Done: 'Gotowe', Unknown: 'Nieznane',
    None: 'Brak', Documents: 'Dokumenty', Cases: 'Sprawy', Tasks: 'Zadania', Due: 'Termin', Language: 'Język',
    'Document language': 'Język dokumentu', Uncertain: 'Niepewne', page: 'strona', pages: 'strony', Status: 'Status',
    Priority: 'Priorytet', high: 'wysoki', medium: 'średni', low: 'niski', open: 'otwarte', Loading: 'Ładowanie',
    Error: 'Błąd', Home: 'Start', Add: 'Dodaj', Search: 'Szukaj', Profile: 'Profil', Overview: 'Przegląd',
    'New documents': 'Nowe dokumenty', 'Upcoming deadlines': 'Nadchodzące terminy', Amount: 'Kwota', Deadline: 'Termin',
    Category: 'Kategoria', 'Document type': 'Typ dokumentu', Sender: 'Nadawca', 'No documents here': 'Brak dokumentów',
    'No notifications.': 'Brak powiadomień.', 'Privacy and security': 'Prywatność i bezpieczeństwo',
  },
  sk: {
    Back: 'Späť', Cancel: 'Zrušiť', Save: 'Uložiť', Close: 'Zavrieť', Edit: 'Upraviť', Review: 'Skontrolovať',
    Accept: 'Prijať', Reject: 'Odmietnuť', Complete: 'Dokončené', Next: 'Ďalej', Done: 'Hotovo', Unknown: 'Neznáme',
    None: 'Žiadne', Documents: 'Dokumenty', Cases: 'Prípady', Tasks: 'Úlohy', Due: 'Termín', Language: 'Jazyk',
    'Document language': 'Jazyk dokumentu', Uncertain: 'Neisté', page: 'strana', pages: 'strany', Status: 'Stav',
    Priority: 'Priorita', high: 'vysoká', medium: 'stredná', low: 'nízka', open: 'otvorené', Loading: 'Načítava sa',
    Error: 'Chyba', Home: 'Domov', Add: 'Pridať', Search: 'Hľadať', Profile: 'Profil', Overview: 'Prehľad',
    'New documents': 'Nové dokumenty', 'Upcoming deadlines': 'Nadchádzajúce termíny', Amount: 'Suma', Deadline: 'Lehota',
    Category: 'Kategória', 'Document type': 'Typ dokumentu', Sender: 'Odosielateľ', 'No documents here': 'Žiadne dokumenty',
    'No notifications.': 'Žiadne upozornenia.', 'Privacy and security': 'Súkromie a bezpečnosť',
  },
  uk: {
    Back: 'Назад', Cancel: 'Скасувати', Save: 'Зберегти', Close: 'Закрити', Edit: 'Редагувати', Review: 'Перевірити',
    Accept: 'Прийняти', Reject: 'Відхилити', Complete: 'Завершено', Next: 'Далі', Done: 'Готово', Unknown: 'Невідомо',
    None: 'Немає', Documents: 'Документи', Cases: 'Справи', Tasks: 'Завдання', Due: 'Термін', Language: 'Мова',
    'Document language': 'Мова документа', Uncertain: 'Невизначено', page: 'сторінка', pages: 'сторінки', Status: 'Статус',
    Priority: 'Пріоритет', high: 'високий', medium: 'середній', low: 'низький', open: 'відкрито', Loading: 'Завантаження',
    Error: 'Помилка', Home: 'Головна', Add: 'Додати', Search: 'Пошук', Profile: 'Профіль', Overview: 'Огляд',
    'New documents': 'Нові документи', 'Upcoming deadlines': 'Найближчі терміни', Amount: 'Сума', Deadline: 'Термін',
    Category: 'Категорія', 'Document type': 'Тип документа', Sender: 'Відправник', 'No documents here': 'Документів немає',
    'No notifications.': 'Немає сповіщень.', 'Privacy and security': 'Приватність і безпека',
  },
  tr: {
    Back: 'Geri', Cancel: 'İptal', Save: 'Kaydet', Close: 'Kapat', Edit: 'Düzenle', Review: 'İncele',
    Accept: 'Kabul et', Reject: 'Reddet', Complete: 'Tamamlandı', Next: 'İleri', Done: 'Tamam', Unknown: 'Bilinmiyor',
    None: 'Yok', Documents: 'Belgeler', Cases: 'Dosyalar', Tasks: 'Görevler', Due: 'Son tarih', Language: 'Dil',
    'Document language': 'Belge dili', Uncertain: 'Belirsiz', page: 'sayfa', pages: 'sayfa', Status: 'Durum',
    Priority: 'Öncelik', high: 'yüksek', medium: 'orta', low: 'düşük', open: 'açık', Loading: 'Yükleniyor',
    Error: 'Hata', Home: 'Ana sayfa', Add: 'Ekle', Search: 'Ara', Profile: 'Profil', Overview: 'Genel bakış',
    'New documents': 'Yeni belgeler', 'Upcoming deadlines': 'Yaklaşan son tarihler', Amount: 'Tutar', Deadline: 'Son tarih',
    Category: 'Kategori', 'Document type': 'Belge türü', Sender: 'Gönderen', 'No documents here': 'Burada belge yok',
    'No notifications.': 'Bildirim yok.', 'Privacy and security': 'Gizlilik ve güvenlik',
  },
  ar: {
    Back: 'رجوع', Cancel: 'إلغاء', Save: 'حفظ', Close: 'إغلاق', Edit: 'تعديل', Review: 'مراجعة',
    Accept: 'قبول', Reject: 'رفض', Complete: 'مكتمل', Next: 'التالي', Done: 'تم', Unknown: 'غير معروف',
    None: 'لا شيء', Documents: 'المستندات', Cases: 'الملفات', Tasks: 'المهام', Due: 'مستحق', Language: 'اللغة',
    'Document language': 'لغة المستند', Uncertain: 'غير مؤكد', page: 'صفحة', pages: 'صفحات', Status: 'الحالة',
    Priority: 'الأولوية', high: 'مرتفع', medium: 'متوسط', low: 'منخفض', open: 'مفتوح', Loading: 'جارٍ التحميل',
    Error: 'خطأ', Home: 'الرئيسية', Add: 'إضافة', Search: 'بحث', Profile: 'الملف الشخصي', Overview: 'نظرة عامة',
    'New documents': 'مستندات جديدة', 'Upcoming deadlines': 'المواعيد النهائية القادمة', Amount: 'المبلغ', Deadline: 'الموعد النهائي',
    Category: 'الفئة', 'Document type': 'نوع المستند', Sender: 'المرسل', 'No documents here': 'لا توجد مستندات هنا',
    'No notifications.': 'لا توجد إشعارات.', 'Privacy and security': 'الخصوصية والأمان',
  },
  cs: {
    Back: 'Zpět', Cancel: 'Zrušit', Save: 'Uložit', Close: 'Zavřít', Edit: 'Upravit', Review: 'Zkontrolovat',
    Accept: 'Přijmout', Reject: 'Odmítnout', Complete: 'Dokončeno', Next: 'Další', Done: 'Hotovo', Unknown: 'Neznámé',
    None: 'Žádné', Documents: 'Dokumenty', Cases: 'Případy', Tasks: 'Úkoly', Due: 'Termín', Language: 'Jazyk',
    'Document language': 'Jazyk dokumentu', Uncertain: 'Nejisté', page: 'stránka', pages: 'stránky', Status: 'Stav',
    Priority: 'Priorita', high: 'vysoká', medium: 'střední', low: 'nízká', open: 'otevřené', Loading: 'Načítání',
    Error: 'Chyba', Home: 'Domů', Add: 'Přidat', Search: 'Hledat', Profile: 'Profil', Overview: 'Přehled',
    'New documents': 'Nové dokumenty', 'Upcoming deadlines': 'Nadcházející termíny', Amount: 'Částka', Deadline: 'Termín',
    Category: 'Kategorie', 'Document type': 'Typ dokumentu', Sender: 'Odesílatel', 'No documents here': 'Žádné dokumenty',
    'No notifications.': 'Žádná oznámení.', 'Privacy and security': 'Soukromí a zabezpečení',
  },
  bg: {
    Back: 'Назад', Cancel: 'Отказ', Save: 'Запази', Close: 'Затвори', Edit: 'Редактиране', Review: 'Преглед',
    Accept: 'Приеми', Reject: 'Отхвърли', Complete: 'Завършено', Next: 'Напред', Done: 'Готово', Unknown: 'Неизвестно',
    None: 'Няма', Documents: 'Документи', Cases: 'Случаи', Tasks: 'Задачи', Due: 'Срок', Language: 'Език',
    'Document language': 'Език на документа', Uncertain: 'Несигурно', page: 'страница', pages: 'страници', Status: 'Статус',
    Priority: 'Приоритет', high: 'висок', medium: 'среден', low: 'нисък', open: 'отворен', Loading: 'Зареждане',
    Error: 'Грешка', Home: 'Начало', Add: 'Добави', Search: 'Търсене', Profile: 'Профил', Overview: 'Преглед',
    'New documents': 'Нови документи', 'Upcoming deadlines': 'Предстоящи срокове', Amount: 'Сума', Deadline: 'Краен срок',
    Category: 'Категория', 'Document type': 'Тип документ', Sender: 'Подател', 'No documents here': 'Няма документи',
    'No notifications.': 'Няма известия.', 'Privacy and security': 'Поверителност и сигурност',
  },
  hr: {
    Back: 'Natrag', Cancel: 'Odustani', Save: 'Spremi', Close: 'Zatvori', Edit: 'Uredi', Review: 'Provjeri',
    Accept: 'Prihvati', Reject: 'Odbij', Complete: 'Dovršeno', Next: 'Dalje', Done: 'Gotovo', Unknown: 'Nepoznato',
    None: 'Nema', Documents: 'Dokumenti', Cases: 'Slučajevi', Tasks: 'Zadaci', Due: 'Rok', Language: 'Jezik',
    'Document language': 'Jezik dokumenta', Uncertain: 'Nesigurno', page: 'stranica', pages: 'stranice', Status: 'Status',
    Priority: 'Prioritet', high: 'visok', medium: 'srednji', low: 'nizak', open: 'otvoreno', Loading: 'Učitavanje',
    Error: 'Pogreška', Home: 'Početna', Add: 'Dodaj', Search: 'Pretraži', Profile: 'Profil', Overview: 'Pregled',
    'New documents': 'Novi dokumenti', 'Upcoming deadlines': 'Nadolazeći rokovi', Amount: 'Iznos', Deadline: 'Rok',
    Category: 'Kategorija', 'Document type': 'Vrsta dokumenta', Sender: 'Pošiljatelj', 'No documents here': 'Nema dokumenata',
    'No notifications.': 'Nema obavijesti.', 'Privacy and security': 'Privatnost i sigurnost',
  },
  sr: {
    Back: 'Назад', Cancel: 'Откажи', Save: 'Сачувај', Close: 'Затвори', Edit: 'Измени', Review: 'Провери',
    Accept: 'Прихвати', Reject: 'Одбиј', Complete: 'Завршено', Next: 'Даље', Done: 'Готово', Unknown: 'Непознато',
    None: 'Нема', Documents: 'Документи', Cases: 'Предмети', Tasks: 'Задаци', Due: 'Рок', Language: 'Језик',
    'Document language': 'Језик документа', Uncertain: 'Неизвесно', page: 'страница', pages: 'странице', Status: 'Статус',
    Priority: 'Приоритет', high: 'висок', medium: 'средњи', low: 'низак', open: 'отворено', Loading: 'Учитавање',
    Error: 'Грешка', Home: 'Почетна', Add: 'Додај', Search: 'Претрага', Profile: 'Профил', Overview: 'Преглед',
    'New documents': 'Нови документи', 'Upcoming deadlines': 'Предстојећи рокови', Amount: 'Износ', Deadline: 'Рок',
    Category: 'Категорија', 'Document type': 'Врста документа', Sender: 'Пошиљалац', 'No documents here': 'Нема докумената',
    'No notifications.': 'Нема обавештења.', 'Privacy and security': 'Приватност и безбедност',
  },
  it: {
    Back: 'Indietro', Cancel: 'Annulla', Save: 'Salva', Close: 'Chiudi', Edit: 'Modifica', Review: 'Verifica',
    Accept: 'Accetta', Reject: 'Rifiuta', Complete: 'Completato', Next: 'Avanti', Done: 'Fatto', Unknown: 'Sconosciuto',
    None: 'Nessuno', Documents: 'Documenti', Cases: 'Pratiche', Tasks: 'Attività', Due: 'Scadenza', Language: 'Lingua',
    'Document language': 'Lingua del documento', Uncertain: 'Incerto', page: 'pagina', pages: 'pagine', Status: 'Stato',
    Priority: 'Priorità', high: 'alta', medium: 'media', low: 'bassa', open: 'aperto', Loading: 'Caricamento',
    Error: 'Errore', Home: 'Home', Add: 'Aggiungi', Search: 'Cerca', Profile: 'Profilo', Overview: 'Panoramica',
    'New documents': 'Nuovi documenti', 'Upcoming deadlines': 'Scadenze imminenti', Amount: 'Importo', Deadline: 'Scadenza',
    Category: 'Categoria', 'Document type': 'Tipo di documento', Sender: 'Mittente', 'No documents here': 'Nessun documento',
    'No notifications.': 'Nessuna notifica.', 'Privacy and security': 'Privacy e sicurezza',
  },
  fr: {
    Back: 'Retour', Cancel: 'Annuler', Save: 'Enregistrer', Close: 'Fermer', Edit: 'Modifier', Review: 'Vérifier',
    Accept: 'Accepter', Reject: 'Refuser', Complete: 'Terminé', Next: 'Suivant', Done: 'Terminé', Unknown: 'Inconnu',
    None: 'Aucun', Documents: 'Documents', Cases: 'Dossiers', Tasks: 'Tâches', Due: 'Échéance', Language: 'Langue',
    'Document language': 'Langue du document', Uncertain: 'Incertain', page: 'page', pages: 'pages', Status: 'Statut',
    Priority: 'Priorité', high: 'élevée', medium: 'moyenne', low: 'faible', open: 'ouvert', Loading: 'Chargement',
    Error: 'Erreur', Home: 'Accueil', Add: 'Ajouter', Search: 'Rechercher', Profile: 'Profil', Overview: 'Vue d’ensemble',
    'New documents': 'Nouveaux documents', 'Upcoming deadlines': 'Échéances à venir', Amount: 'Montant', Deadline: 'Échéance',
    Category: 'Catégorie', 'Document type': 'Type de document', Sender: 'Expéditeur', 'No documents here': 'Aucun document',
    'No notifications.': 'Aucune notification.', 'Privacy and security': 'Confidentialité et sécurité',
  },
};

function localizeEnglishText(value: string, language: AppLanguage): string {
  if (language === 'de' || language === 'hu' || language === 'en') return value;
  let result = value;
  const terms = englishTermTranslations[language];
  Object.entries(terms).sort(([a], [b]) => b.length - a.length).forEach(([source, target]) => {
    result = result.replace(new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), target);
  });
  return result;
}

export const translations: Record<AppLanguage, TranslationDictionary> = {
  de,
  hu,
  en,
  ro: completeCatalog('ro'),
  pl: completeCatalog('pl'),
  sk: completeCatalog('sk'),
  uk: completeCatalog('uk'),
  tr: completeCatalog('tr'),
  ar: completeCatalog('ar'),
  cs: completeCatalog('cs'),
  bg: completeCatalog('bg'),
  hr: completeCatalog('hr'),
  sr: completeCatalog('sr'),
  it: completeCatalog('it'),
  fr: completeCatalog('fr'),
};

const localizedValue = (labels: LocalizedLabels, value: string, language: AppLanguage) =>
  labels[value]?.[language] ?? localizeEnglishText(labels[value]?.en ?? value, language);

const documentCategoryLabels: LocalizedLabels = {
  Versicherung: { de: 'Versicherung', hu: 'Biztosítás', en: 'Insurance' },
  Familie: { de: 'Familie', hu: 'Család', en: 'Family' },
  'Arbeit & Bildung': { de: 'Arbeit & Bildung', hu: 'Munka és oktatás', en: 'Work & education' },
  Finanzen: { de: 'Finanzen', hu: 'Pénzügyek', en: 'Finance' },
  Gesundheit: { de: 'Gesundheit', hu: 'Egészség', en: 'Health' },
  Steuern: { de: 'Steuern', hu: 'Adók', en: 'Taxes' },
  Bank: { de: 'Bank', hu: 'Bank', en: 'Bank' },
  Auto: { de: 'Auto', hu: 'Autó', en: 'Car' },
  Wohnen: { de: 'Wohnen', hu: 'Lakhatás', en: 'Housing' },
  'Schule/Kindergarten': { de: 'Schule/Kindergarten', hu: 'Iskola/óvoda', en: 'School/kindergarten' },
  Behörden: { de: 'Behörden', hu: 'Hatóságok', en: 'Authorities' },
  Verträge: { de: 'Verträge', hu: 'Szerződések', en: 'Contracts' },
  Rechnungen: { de: 'Rechnungen', hu: 'Számlák', en: 'Invoices' },
  Sonstiges: { de: 'Sonstiges', hu: 'Egyéb', en: 'Other' },
};

const documentTypeLabels: LocalizedLabels = {
  Rechnung: { de: 'Rechnung', hu: 'Számla', en: 'Invoice' },
  Mahnung: { de: 'Mahnung', hu: 'Fizetési felszólítás', en: 'Payment reminder' },
  'Lohnabrechnung / Gehaltsabrechnung': { de: 'Lohnabrechnung / Gehaltsabrechnung', hu: 'Bérjegyzék / fizetési kimutatás', en: 'Payslip / payroll statement' },
  Versicherungsbrief: { de: 'Versicherungsbrief', hu: 'Biztosítói levél', en: 'Insurance letter' },
  Krankenkasse: { de: 'Krankenkasse', hu: 'Egészségbiztosító', en: 'Health insurance' },
  Vertrag: { de: 'Vertrag', hu: 'Szerződés', en: 'Contract' },
  Kontoauszug: { de: 'Kontoauszug', hu: 'Bankszámlakivonat', en: 'Bank statement' },
  Steuerdokument: { de: 'Steuerdokument', hu: 'Adódokumentum', en: 'Tax document' },
  Behördenschreiben: { de: 'Behördenschreiben', hu: 'Hatósági levél', en: 'Official letter' },
  'Rechnung Strom/Gas/Internet': { de: 'Rechnung Strom/Gas/Internet', hu: 'Áram-/gáz-/internetszámla', en: 'Electricity/gas/internet bill' },
  Zahlungsaufforderung: { de: 'Zahlungsaufforderung', hu: 'Fizetési kérelem', en: 'Payment request' },
  Bescheid: { de: 'Bescheid', hu: 'Határozat', en: 'Decision notice' },
  Brief: { de: 'Brief', hu: 'Levél', en: 'Letter' },
  Nachweis: { de: 'Nachweis', hu: 'Igazolás', en: 'Proof' },
};

const documentFieldLabels: LocalizedLabels = {
  title: { de: 'Titel', hu: 'Cím', en: 'Title' },
  sender: { de: 'Absender / Institution', hu: 'Feladó / intézmény', en: 'Sender / institution' },
  category: { de: 'Kategorie', hu: 'Kategória', en: 'Category' },
  subcategory: { de: 'Unterkategorie', hu: 'Alkategória', en: 'Subcategory' },
  documentType: { de: 'Dokumenttyp', hu: 'Dokumentumtípus', en: 'Document type' },
  documentDate: { de: 'Dokumentdatum', hu: 'Dokumentum dátuma', en: 'Document date' },
  dueDate: { de: 'Fälligkeitsdatum', hu: 'Határidő', en: 'Due date' },
  payrollPeriod: { de: 'Abrechnungszeitraum', hu: 'Elszámolási időszak', en: 'Payroll period' },
  amount: { de: 'Betrag', hu: 'Összeg', en: 'Amount' },
  person: { de: 'Zugehörige Person', hu: 'Kapcsolódó személy', en: 'Related person' },
  status: { de: 'Status', hu: 'Állapot', en: 'Status' },
  tags: { de: 'Tags', hu: 'Címkék', en: 'Tags' },
  note: { de: 'Notiz', hu: 'Jegyzet', en: 'Note' },
  referenceNumber: { de: 'Aktenzeichen / Referenz', hu: 'Ügyszám / hivatkozás', en: 'File number / reference' },
  customerNumber: { de: 'Kundennummer', hu: 'Ügyfélszám', en: 'Customer number' },
  invoiceNumber: { de: 'Rechnungsnummer', hu: 'Számlaszám', en: 'Invoice number' },
  contractNumber: { de: 'Vertragsnummer', hu: 'Szerződésszám', en: 'Contract number' },
  insuranceNumber: { de: 'Versicherungsnummer', hu: 'Biztosítási szám', en: 'Insurance number' },
  iban: { de: 'IBAN', hu: 'IBAN', en: 'IBAN' },
  taxNumber: { de: 'Steuernummer / Steuer-ID', hu: 'Adószám / adóazonosító', en: 'Tax number / tax ID' },
  patientNumber: { de: 'Patienten- / Fallnummer', hu: 'Beteg- / ügyszám', en: 'Patient / case number' },
  schoolReference: { de: 'Schul- / Betreuungsreferenz', hu: 'Iskolai / gondozási hivatkozás', en: 'School / childcare reference' },
};

const documentPlaceholderLabels: LocalizedLabels = {
  title: { de: 'z. B. AOK PLUS – Versicherungsstatus Hochschule', hu: 'pl. AOK PLUS – egyetemi biztosítási jogviszony', en: 'e.g. AOK PLUS – university insurance status' },
  sender: { de: 'z. B. Allianz Versicherung', hu: 'pl. Allianz Biztosító', en: 'e.g. Allianz Insurance' },
  subcategory: { de: 'z. B. Haftpflicht', hu: 'pl. felelősségbiztosítás', en: 'e.g. liability insurance' },
  date: { de: 'TT.MM.JJJJ', hu: 'ÉÉÉÉ.HH.NN', en: 'MM/DD/YYYY' },
  payrollPeriod: { de: 'z. B. Juli 2026 oder 07/2026', hu: 'pl. 2026. július vagy 2026/07', en: 'e.g. July 2026 or 07/2026' },
  amount: { de: 'z. B. 128,40 €', hu: 'pl. 128,40 €', en: 'e.g. €128.40' },
  tags: { de: 'z. B. wichtig, 2025, versicherung', hu: 'pl. fontos, 2025, biztosítás', en: 'e.g. important, 2025, insurance' },
  note: { de: 'Eigene Notiz hinzufügen', hu: 'Saját jegyzet hozzáadása', en: 'Add your own note' },
};

export const documentCategoryLabel = (value: string, language: AppLanguage) => localizedValue(documentCategoryLabels, value, language);
export const documentTypeLabel = (value: string, language: AppLanguage) => localizedValue(documentTypeLabels, value, language);
export const documentFieldLabel = (value: string, language: AppLanguage) => localizedValue(documentFieldLabels, value, language);
export const documentPlaceholder = (value: string, language: AppLanguage) => localizedValue(documentPlaceholderLabels, value, language);

const actionTypeLabels: LocalizedLabels = {
  pay: { de: 'Bezahlen', hu: 'Fizetés', en: 'Pay' }, reply: { de: 'Antworten', hu: 'Válasz', en: 'Reply' },
  submit_document: { de: 'Dokument einreichen', hu: 'Dokumentum benyújtása', en: 'Submit document' },
  upload_document: { de: 'Dokument hochladen', hu: 'Dokumentum feltöltése', en: 'Upload document' },
  call: { de: 'Anrufen', hu: 'Telefonhívás', en: 'Call' }, attend_appointment: { de: 'Termin wahrnehmen', hu: 'Megjelenés időponton', en: 'Attend appointment' },
  cancel: { de: 'Kündigen', hu: 'Lemondás', en: 'Cancel' }, renew: { de: 'Verlängern', hu: 'Megújítás', en: 'Renew' },
  object_or_appeal: { de: 'Widerspruch / Einspruch', hu: 'Kifogás / fellebbezés', en: 'Object / appeal' },
  review: { de: 'Prüfen', hu: 'Ellenőrzés', en: 'Review' }, sign: { de: 'Unterschreiben', hu: 'Aláírás', en: 'Sign' },
  provide_information: { de: 'Angaben bereitstellen', hu: 'Adatok megadása', en: 'Provide information' },
  wait_for_response: { de: 'Auf Antwort warten', hu: 'Várakozás válaszra', en: 'Wait for response' },
  follow_up: { de: 'Nachfassen', hu: 'Utánkövetés', en: 'Follow up' }, archive: { de: 'Archivieren', hu: 'Archiválás', en: 'Archive' },
  mark_done: { de: 'Als erledigt markieren', hu: 'Megjelölés elvégzettként', en: 'Mark done' }, custom: { de: 'Eigene Aufgabe', hu: 'Saját feladat', en: 'Custom task' },
};
const priorityLabels: LocalizedLabels = {
  niedrig: { de: 'niedrig', hu: 'alacsony', en: 'low' }, mittel: { de: 'mittel', hu: 'közepes', en: 'medium' }, hoch: { de: 'hoch', hu: 'magas', en: 'high' },
  low: { de: 'niedrig', hu: 'alacsony', en: 'low' }, normal: { de: 'normal', hu: 'normál', en: 'normal' }, high: { de: 'hoch', hu: 'magas', en: 'high' }, urgent: { de: 'dringend', hu: 'sürgős', en: 'urgent' },
};
export const actionTypeLabel = (value: string, language: AppLanguage) => localizedValue(actionTypeLabels, value, language);
export const priorityLabel = (value: string, language: AppLanguage) => localizedValue(priorityLabels, value, language);

const caseStateLabels: LocalizedLabels = {
  ready: { de: 'bereit', hu: 'kész', en: 'ready' }, in_progress: { de: 'in Bearbeitung', hu: 'folyamatban', en: 'in progress' },
  waiting: { de: 'wartet', hu: 'várakozik', en: 'waiting' }, review: { de: 'zu prüfen', hu: 'ellenőrzendő', en: 'needs review' },
  overdue: { de: 'überfällig', hu: 'lejárt', en: 'overdue' }, blocked: { de: 'blockiert', hu: 'blokkolt', en: 'blocked' },
  complete: { de: 'abgeschlossen', hu: 'befejezett', en: 'complete' },
};
const missingDataLabels: LocalizedLabels = {
  document: { de: 'Dokument', hu: 'Dokumentum', en: 'Document' }, data: { de: 'Angabe', hu: 'Adat', en: 'Data' },
  signature: { de: 'Unterschrift', hu: 'Aláírás', en: 'Signature' }, proof: { de: 'Nachweis', hu: 'Igazolás', en: 'Proof' },
};
export const caseProgressStateLabel = (value: string, language: AppLanguage) => localizedValue(caseStateLabels, value, language);
export const missingDataTypeLabel = (value: string, language: AppLanguage) => localizedValue(missingDataLabels, value, language);
export function caseProgressExplanationLabel(progress: { state: string; activeActionCount: number; reviewActionCount: number; overdueActionCount: number; waitingActionCount: number; unresolvedConflictCount: number }, language: AppLanguage): string {
  const count = progress.state === 'blocked' ? progress.unresolvedConflictCount : progress.state === 'review' ? progress.reviewActionCount : progress.state === 'overdue' ? progress.overdueActionCount : progress.state === 'waiting' ? progress.waitingActionCount : progress.activeActionCount;
  const labels: Record<string, Partial<Record<AppLanguage, string>>> = {
    complete: { de: 'Alle Aufgaben sind erledigt.', hu: 'Minden teendő el van intézve.', en: 'All tasks are complete.' },
    blocked: { de: `${count} ungelöste Konflikte verhindern den Abschluss.`, hu: `${count} feloldatlan ellentmondás akadályozza a lezárást.`, en: `${count} unresolved conflicts prevent completion.` },
    review: { de: `${count} Aufgaben warten auf deine Prüfung.`, hu: `${count} teendő felhasználói ellenőrzésre vár.`, en: `${count} tasks await your review.` },
    overdue: { de: `${count} Aufgaben sind überfällig.`, hu: `${count} teendő lejárt.`, en: `${count} tasks are overdue.` },
    waiting: { de: `${count} Aufgaben warten auf Antwort.`, hu: `${count} teendő válaszra vár.`, en: `${count} tasks are waiting for a response.` },
    in_progress: { de: `${count} aktive Aufgaben verbleiben.`, hu: `${count} aktív teendő maradt.`, en: `${count} active tasks remain.` },
  };
  return labels[progress.state]?.[language] ?? progress.state;
}

const automationLabels: LocalizedLabels = {
  followUps: { de: 'Nachfassaktionen', hu: 'Utánkövetések', en: 'Follow-ups' },
  calendar: { de: 'Kalender', hu: 'Naptár', en: 'Calendar' },
  defaultRuleName: { de: 'Bestätigte Fristen erinnern', hu: 'Emlékeztető a megerősített határidőkre', en: 'Remind me of confirmed deadlines' },
};
const triggerTypeLabels: LocalizedLabels = {
  action_due_soon: { de: 'Aktion bald fällig', hu: 'Hamarosan esedékes művelet', en: 'Action due soon' },
};
export const automationLabel = (value: string, language: AppLanguage) => localizedValue(automationLabels, value, language);
export const triggerTypeLabel = (value: string, language: AppLanguage) => localizedValue(triggerTypeLabels, value, language);

export function riskLabel(value: string | undefined, language: AppLanguage): string {
  const labels: Record<string, Partial<Record<AppLanguage, string>>> = {
    none: { de: 'kein', hu: 'nincs', en: 'none' },
    low: { de: 'niedrig', hu: 'alacsony', en: 'low' },
    medium: { de: 'mittel', hu: 'közepes', en: 'medium' },
    high: { de: 'hoch', hu: 'magas', en: 'high' },
    critical: { de: 'kritisch', hu: 'kritikus', en: 'critical' },
  };
  return value ? labels[value]?.[language] ?? value : t(language, 'common.unknown');
}

export function deadlineKindLabel(value: string, language: AppLanguage): string {
  const labels: Record<string, Partial<Record<AppLanguage, string>>> = {
    payment: { de: 'Zahlung', hu: 'fizetés', en: 'payment' },
    response: { de: 'Antwort', hu: 'válasz', en: 'response' },
    appeal: { de: 'Widerspruch', hu: 'fellebbezés', en: 'appeal' },
    cancellation: { de: 'Kündigung', hu: 'felmondás', en: 'cancellation' },
    appointment: { de: 'Termin', hu: 'időpont', en: 'appointment' },
    other: { de: 'Sonstige Frist', hu: 'egyéb határidő', en: 'other deadline' },
  };
  return labels[value]?.[language] ?? value;
}

export function documentLanguageLabel(value: string | undefined, confidence: string | undefined, language: AppLanguage): string {
  if (!value || value === 'unknown' || confidence === 'low' || confidence === 'unknown') return t(language, 'document.languageUnknown');
  return languageName(value as AppLanguage, language);
}

export function flattenTranslationKeys(dictionary: TranslationDictionary = de): string[] {
  return Object.keys(dictionary).sort();
}

export function auditTranslations(usedKeys: readonly string[] = []): {
  missingByLanguage: Record<AppLanguage, string[]>;
  unusedKeys: string[];
  duplicateKeys: string[];
} {
  const baseKeys = flattenTranslationKeys();
  const missingByLanguage = Object.fromEntries(SUPPORTED_LANGUAGES.map((language) => [
    language, baseKeys.filter((key) => !translations[language][key as TranslationKey]),
  ])) as Record<AppLanguage, string[]>;
  const unusedKeys = baseKeys.filter((key) => usedKeys.length > 0 && !usedKeys.includes(key));
  const duplicateKeys: string[] = [];
  return { missingByLanguage, unusedKeys, duplicateKeys };
}
