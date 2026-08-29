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
    const addDocument = useCallback((document: DocumentRecord) => {
      const stored = migrateArchiveDocument({ ...document, lifecycle: 'aktiv' as const, fingerprint: document.fingerprint ?? documentFingerprint(document), profileIds: migrateProfileIds(document.profileIds, document.person, profiles) });
     setDocuments((current) => [stored, ...current]);
      setActions((current) => dedupeActions([...deriveActionsFromDocument(stored as ActionEngineDocument), ...current]));
     setDomain((current) => ({ ...current, activities: [{ id: `activity-${Date.now()}`, type: 'dokument', message: `Dokument hinzugefügt: ${document.title}`, createdAt: new Date().toISOString() }, ...current.activities] }));
  }, [profiles]);
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
   const updateSecurity = useCallback((item: Partial<SecuritySettings>) => setDomain((current) => ({ ...current, security: { ...current.security, ...item } })), []);
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
    setDomain({ ...blankCaseState, cases: raw.cases ?? [], relationships: raw.relationships ?? [], notifications: raw.notifications ?? [], activities: raw.activities ?? [], exportPackages: raw.exportPackages ?? [], security: { ...defaultSecurity, ...raw.security }, onboarding: raw.onboarding ?? blankCaseState.onboarding, family: raw.family ?? blankCaseState.family, business: raw.business ?? blankCaseState.business, contracts: raw.contracts ?? [], recurringCosts: raw.recurringCosts ?? [], compareRecords: raw.compareRecords ?? [], demoEnabled: raw.demoEnabled ?? false });
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
    await backupAdapter().disconnect(account.id); setBackup(current => ({ ...current, accounts: current.accounts.filter(item => item.id !== account.id), snapshots: [], error: undefined }));
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