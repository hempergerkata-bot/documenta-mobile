import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useApp, type DocumentRecord } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { compareDocumentIntelligence, eligibleDeadlines, explanationFor, isMainAmountEligible } from '@/utils/documentIntelligence';
import { confidenceLabel, isExplanationLanguage, type TranslationKey } from '@/utils/localization';
import {
  classifySearchIntent,
  deterministicSearchAdapter,
  emptySearchContext,
  isConfirmedAssistantAction,
  nextConversationContext,
  type SearchConversationContext,
  type SearchResponse,
  type SearchResult,
  type SuggestedQuestion,
} from '@/utils/semanticSearch';
import { answerDocumentQuestion, classifyQuestionIntent, isExplanationAdapterLanguage } from '@/utils/explanationExperience';

const suggestedKeys: Record<SuggestedQuestion, TranslationKey> = {
  summary: 'assistant.questionSummary', deadline: 'assistant.questionDeadline', action: 'assistant.questionAction',
  related: 'assistant.questionRelated', change: 'assistant.questionChange', uncertainty: 'assistant.questionUncertainty',
};

export default function AssistantScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const params = useLocalSearchParams<{ documentId?: string; caseId?: string }>();
  const { t, date, currency, language, backSymbol, direction } = useTranslation();
  const {
    documents, profiles, cases, activeCases, relationships, actions, activeActions, settings, searchIndex, searchIndexVersion, searchIndexRebuiltAt,
    assistantContext, assistantMessages, searchHistory, setAssistantContext, resetAssistantContext, addAssistantExchange,
    clearAssistantConversation, clearSearchHistory, rebuildSearchIndex, caseTimeline,
  } = useApp();
  const [query, setQuery] = useState(''); const [response, setResponse] = useState<SearchResponse | undefined>();
  const [answer, setAnswer] = useState(''); const [showMore, setShowMore] = useState(false); const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    if (params.documentId && documents.some(item => item.id === params.documentId)) setAssistantContext({ mode: 'document', documentId: params.documentId, lastResultDocumentIds: [params.documentId] });
    else if (params.caseId && activeCases.some(item => item.id === params.caseId)) setAssistantContext({ mode: 'case', caseId: params.caseId, lastResultDocumentIds: [] });
  }, [params.documentId, params.caseId, documents, activeCases, setAssistantContext]);
  const library = useMemo(() => ({ documents: searchIndex.map(item => item.document), profiles, cases: activeCases, relationships, actions }), [searchIndex, profiles, activeCases, relationships, actions]);
  const contextLabel = assistantContext.mode === 'document'
    ? t('assistant.scopeDocument', { name: documents.find(item => item.id === assistantContext.documentId)?.title ?? t('common.unknown') })
    : assistantContext.mode === 'case'
      ? t('assistant.scopeCase', { name: activeCases.find(item => item.id === assistantContext.caseId)?.title ?? t('common.unknown') })
      : t('assistant.scopeAll');

  const answerFor = (result: SearchResponse): string => {
    if (result.zeroResult) return t('assistant.zeroResult');
    if (result.ambiguous) return `${t('assistant.ambiguousTitle')}. ${t('assistant.ambiguousText')}`;
    if (result.intent === 'compare_documents') {
      const [beforeId, afterId] = result.comparisonDocumentIds ?? []; const before = documents.find(item => item.id === beforeId); const after = documents.find(item => item.id === afterId);
      if (!before?.intelligence || !after?.intelligence) return t('assistant.missingInformation');
      const comparison = compareDocumentIntelligence(before.intelligence, after.intelligence);
      if (!comparison.typedChanges.length) return t('assistant.missingInformation');
      const label = (kind: string) => kind === 'amount' ? t('compare.amount') : kind === 'deadline' ? t('compare.deadline') : kind === 'status' ? t('common.status') : kind === 'reference' ? t('document.referenceNumber') : t('compare.type');
      return `${t('compare.comparison')}: ${before.title} ↔ ${after.title}\n${comparison.typedChanges.map(item => `${label(item.kind)}: ${item.before || t('common.unknown')} → ${item.after || t('common.unknown')}`).join('\n')}`;
    }
    const top = result.topResults[0]; if (!top) return t('assistant.zeroResult');
    if (top.kind === 'case') {
      const timelineQuestion = /(mi történt|első levél|utolsó változás|timeline|what happened|was geschah)/i.test(result.query);
      if (timelineQuestion && top.case) {
        const events = caseTimeline(top.case.id); return events.length ? events.slice(-3).map(item => {
          const params = Object.fromEntries(Object.entries(item.metadata).filter((entry): entry is [string, string | number] => typeof entry[1] === 'string' || typeof entry[1] === 'number'));
          return `${date(item.timestamp)} · ${t(item.titleKey as TranslationKey, params)}`;
        }).join('\n') : t('assistant.missingInformation');
      }
      return t('assistant.foundCase', { name: top.title });
    }
    const document = top.document as DocumentRecord | undefined; if (!document) return t('assistant.missingInformation');
    const questionIntent = classifyQuestionIntent(result.query);
    // Search index entries are canonical persisted documents. Do not recreate
    // intelligence here: a missing persisted result must remain unknown rather
    // than producing an assistant-only synthetic interpretation.
    const groundedIntelligence = document.intelligence;
    if (groundedIntelligence && questionIntent !== 'general' && isExplanationAdapterLanguage(settings.explanationLanguage)) {
      const corrected = {
        sender: document.sender,
        recipient: document.structuredFields?.recipient,
        documentDate: document.documentDate,
        amount: document.amount,
        deadline: document.dueDate,
        paymentTerms: document.structuredFields?.paymentTerms,
        referenceNumber: document.structuredFields?.referenceNumber
          ?? document.structuredFields?.invoiceNumber
          ?? document.structuredFields?.customerNumber,
      };
      const grounded = answerDocumentQuestion(groundedIntelligence, result.query, settings.explanationLanguage, corrected);
      if (grounded.supported) return [t('assistant.foundDocument', { name: document.title }), grounded.text, grounded.safetyNotice].filter(Boolean).join('\n');
    }
    const asksDeadline = result.intent === 'find_document_by_deadline' || /(meddig|határidő|deadline|frist)/i.test(result.query);
    const asksAmount = result.intent === 'find_document_by_amount' || /(mennyi|összeg|eur|euro|betrag|amount)/i.test(result.query);
    const asksAction = result.intent === 'next_action' || result.intent === 'find_document_by_action' || /(mit kell|válaszol|teendő|next step|action)/i.test(result.query);
    const lines = [t('assistant.foundDocument', { name: document.title })];
    if (result.intent === 'summarize_document' || result.intent === 'explain_document') {
      if (document.intelligence && isExplanationLanguage(settings.explanationLanguage)) lines.push(explanationFor(document.intelligence, settings.explanationLanguage, settings.explanationMode === 'kurz' ? 'short' : settings.explanationMode === 'detailliert' ? 'detailed' : 'normal'));
      else lines.push(t('assistant.missingInformation'));
    }
    if (asksAmount) {
      const amount = document.intelligence && isMainAmountEligible(document.intelligence) ? document.intelligence.amounts.main.value : undefined;
      lines.push(amount ? `${t('document.amount')}: ${currency(amount)}` : t('assistant.missingInformation'));
    }
    if (asksDeadline) {
      const deadline = document.intelligence ? eligibleDeadlines(document.intelligence)[0]?.value : undefined;
      lines.push(deadline ? t('assistant.confirmedDeadline', { value: date(deadline) }) : t('assistant.noConfirmedDeadline'));
    }
    if (asksAction) {
      const action = activeActions.find(item => item.documentId === document.id && isConfirmedAssistantAction(item));
      lines.push(action ? t('assistant.confirmedAction', { value: action.title }) : t('assistant.noConfirmedAction'));
    }
    return lines.join('\n');
  };
  const runQuery = (value: string) => {
    const trimmed = value.trim(); if (!trimmed) return;
    const intent = classifySearchIntent(trimmed);
    const followUpIntent = ['summarize_document', 'explain_document', 'next_action', 'find_document_by_deadline', 'find_document_by_action'].includes(intent);
    const options = {
      referenceDate: new Date().toISOString().slice(0, 10), includeArchived: true, topK: 5, context: assistantContext, index: searchIndex,
      documentId: assistantContext.mode === 'document' && followUpIntent ? assistantContext.documentId : undefined,
      caseId: assistantContext.mode === 'case' ? assistantContext.caseId : undefined,
    } as const;
    const next = deterministicSearchAdapter.search(library, trimmed, options); const nextContext = nextConversationContext(assistantContext, next);
    const text = answerFor(next); setResponse(next); setAnswer(text); setShowMore(false); setQuery('');
    addAssistantExchange(trimmed, text, next.intent, next.topResults.map(item => item.id), nextContext);
  };
  const chooseResult = (result: SearchResult) => {
    const context: SearchConversationContext = result.kind === 'case'
      ? { mode: 'case', caseId: result.id, lastResultDocumentIds: [] }
      : { mode: 'document', documentId: result.kind === 'document' ? result.id : result.action?.documentId, lastResultDocumentIds: result.action?.documentId ? [result.action.documentId] : [result.id] };
    setAssistantContext(context); setResponse(undefined); setAnswer(result.kind === 'case' ? t('assistant.foundCase', { name: result.title }) : t('assistant.foundDocument', { name: result.title }));
  };
  const reset = () => { resetAssistantContext(); setResponse(undefined); setAnswer(''); setQuery(''); };
  const visibleResults = response ? (showMore ? response.results : response.topResults) : [];
  const groups = [
    ['document', 'assistant.resultDocuments'], ['case', 'assistant.resultCases'], ['action', 'assistant.resultActions'],
  ] as const;
  const suggested: SuggestedQuestion[] = assistantContext.mode === 'global' ? ['deadline', 'action'] : ['summary', 'deadline', 'action', 'related', 'change', 'uncertainty'];
  return <KeyboardAwareScrollViewCompat
    style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={[styles.page, { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 16, paddingBottom: insets.bottom + 36, direction }]}
    bottomOffset={20} keyboardShouldPersistTaps="handled"
  >
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}><Text style={{ color: colors.coral, fontFamily: 'Inter_700Bold' }}>{backSymbol} {t('common.back')}</Text></Pressable>
    <Text style={[styles.kicker, { color: colors.coral }]}>{t('assistant.kicker')}</Text>
    <Text style={[styles.title, { color: colors.navy }]}>{t('assistant.title')}</Text>
    <Text style={[styles.copy, { color: colors.mutedForeground }]}>{t('assistant.semanticLocal')}</Text>
    <View accessibilityRole="summary" style={[styles.context, { backgroundColor: colors.sage, borderColor: colors.border, flexDirection: direction === 'rtl' ? 'row-reverse' : 'row' }]}>
      <Feather name={assistantContext.mode === 'global' ? 'globe' : assistantContext.mode === 'case' ? 'folder' : 'file-text'} size={16} color={colors.sageDeep} />
      <Text style={[styles.contextText, { color: colors.sageDeep }]}>{contextLabel}</Text>
      {assistantContext.mode !== 'global' ? <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.resetContext')} onPress={reset}><Text style={[styles.smallButton, { color: colors.coral }]}>{t('assistant.resetContext')}</Text></Pressable> : null}
    </View>
    <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: direction === 'rtl' ? 'row-reverse' : 'row' }]}>
      <Feather name="search" size={18} color={colors.mutedForeground} />
      <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => runQuery(query)} returnKeyType="search" accessibilityLabel={t('assistant.placeholder')} placeholder={t('assistant.placeholder')} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, writingDirection: direction === 'rtl' ? 'rtl' : 'ltr' }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.ask')} accessibilityState={{ disabled: !query.trim() }} disabled={!query.trim()} onPress={() => runQuery(query)} style={[styles.ask, { backgroundColor: colors.coral, opacity: query.trim() ? 1 : .45 }]}><Feather name="arrow-up" size={17} color={colors.white} /></Pressable>
    </View>
    <View style={[styles.chips, { flexDirection: direction === 'rtl' ? 'row-reverse' : 'row' }]}>{suggested.map(item => <Pressable accessibilityRole="button" accessibilityLabel={t(suggestedKeys[item])} key={item} onPress={() => runQuery(t(suggestedKeys[item]))} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.chipText, { color: colors.navy }]}>{t(suggestedKeys[item])}</Text></Pressable>)}</View>
    {assistantMessages.slice(-6).map(message => <View key={message.id} style={[styles.message, { alignSelf: message.role === 'user' ? (direction === 'rtl' ? 'flex-start' : 'flex-end') : (direction === 'rtl' ? 'flex-end' : 'flex-start'), backgroundColor: message.role === 'user' ? colors.coralSoft : colors.sage }]}><Text style={[styles.copy, { color: colors.navy, textAlign: direction === 'rtl' ? 'right' : 'left' }]}>{message.text}</Text></View>)}
    {answer ? <View style={[styles.answer, { backgroundColor: colors.card, borderColor: colors.border }]}><Text selectable style={[styles.copy, { color: colors.navy }]}>{answer}</Text><Text style={[styles.privacy, { color: colors.mutedForeground }]}>{t('assistant.localOnly')}</Text></View> : null}
    {response?.ambiguous ? <View style={[styles.notice, { backgroundColor: colors.coralSoft }]}><Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('assistant.ambiguousTitle')}</Text><Text style={[styles.copy, { color: colors.navy }]}>{t('assistant.ambiguousText')}</Text></View> : null}
    {groups.map(([kind, label]) => {
      const items = visibleResults.filter(item => item.kind === kind); if (!items.length) return null;
      return <View key={kind} style={styles.group}><Text style={[styles.sectionTitle, { color: colors.navy }]}>{t(label)}</Text>{items.map(item => <ResultCard key={`${item.kind}-${item.id}`} result={item} onChoose={() => chooseResult(item)} />)}</View>;
    })}
    {response?.moreAvailable && !showMore ? <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.moreResults')} onPress={() => setShowMore(true)} style={[styles.secondary, { borderColor: colors.border }]}><Text style={{ color: colors.navy, fontFamily: 'Inter_700Bold' }}>{t('assistant.moreResults')}</Text></Pressable> : null}
    <View style={[styles.tools, { flexDirection: direction === 'rtl' ? 'row-reverse' : 'row' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.history')} onPress={() => setShowHistory(current => !current)}><Text style={[styles.smallButton, { color: colors.navy }]}>{t('assistant.history')}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.clearConversation')} onPress={() => { clearAssistantConversation(); setResponse(undefined); setAnswer(''); }}><Text style={[styles.smallButton, { color: colors.navy }]}>{t('assistant.clearConversation')}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.rebuildIndex')} onPress={rebuildSearchIndex}><Text style={[styles.smallButton, { color: colors.navy }]}>{t('assistant.rebuildIndex')}</Text></Pressable>
    </View>
    {showHistory ? <View style={[styles.answer, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('assistant.history')}</Text>{searchHistory.slice(0, 10).map(item => <Pressable accessibilityRole="button" accessibilityLabel={item.query} key={item.id} onPress={() => runQuery(item.query)}><Text style={[styles.copy, { color: colors.navy }]}>{item.query}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel={t('assistant.clearHistory')} onPress={clearSearchHistory}><Text style={[styles.smallButton, { color: colors.coral }]}>{t('assistant.clearHistory')}</Text></Pressable></View> : null}
    <Text style={[styles.privacy, { color: colors.mutedForeground }]}>{t('assistant.indexReady', { version: searchIndexVersion })}{searchIndexRebuiltAt ? ` · ${date(searchIndexRebuiltAt)}` : ''}</Text>
    <Text style={[styles.privacy, { color: colors.mutedForeground }]}>{t('assistant.localIndex')}</Text>
  </KeyboardAwareScrollViewCompat>;
}

function ResultCard({ result, onChoose }: { result: SearchResult; onChoose: () => void }) {
  const colors = useColors(); const { t, language, date, currency, direction } = useTranslation();
  const open = () => result.kind === 'case' ? router.push({ pathname: '/cases/[id]', params: { id: result.id } }) : result.kind === 'action' ? router.push({ pathname: '/action/[id]', params: { id: result.id } }) : router.push({ pathname: '/document/[id]', params: { id: result.id } });
  return <View style={[styles.result, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={result.title} onPress={onChoose} style={[styles.resultMain, { flexDirection: direction === 'rtl' ? 'row-reverse' : 'row' }]}>
      <View style={{ flex: 1 }}><Text style={[styles.resultTitle, { color: colors.navy }]}>{result.title}</Text>
        {result.document ? <Text style={[styles.privacy, { color: colors.mutedForeground }]}>{result.document.sender || '–'} · {date(result.document.documentDate)}{result.document.amount ? ` · ${currency(result.document.amount)}` : ''}</Text> : null}
      </View>
      {result.archived ? <Text style={[styles.badge, { color: colors.coral, backgroundColor: colors.coralSoft }]}>{t('assistant.archived')}</Text> : null}
      <Text style={[styles.badge, { color: colors.sageDeep, backgroundColor: colors.sage }]}>{t('assistant.confidence')}: {confidenceLabel(result.confidence, language)}</Text>
    </Pressable>
    <Text style={[styles.privacy, { color: colors.mutedForeground }]}>{t('assistant.resultReason', { fields: result.matchedFields.slice(0, 4).join(', ') })}</Text>
    <View style={[styles.tools, { flexDirection: direction === 'rtl' ? 'row-reverse' : 'row' }]}><Pressable accessibilityRole="button" accessibilityLabel={result.kind === 'case' ? t('assistant.openCase') : t('assistant.openDocument')} onPress={open}><Text style={[styles.smallButton, { color: colors.coral }]}>{result.kind === 'case' ? t('assistant.openCase') : t('assistant.openDocument')}</Text></Pressable>
      {result.kind === 'document' ? <><Pressable accessibilityRole="button" accessibilityLabel={t('assistant.openExplanation')} onPress={() => router.push({ pathname: '/ai-explanation', params: { id: result.id } })}><Text style={[styles.smallButton, { color: colors.navy }]}>{t('assistant.openExplanation')}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('assistant.openTasks')} onPress={() => router.push('/tasks')}><Text style={[styles.smallButton, { color: colors.navy }]}>{t('assistant.openTasks')}</Text></Pressable></> : null}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 12 }, kicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginTop: 6 }, title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  copy: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 }, privacy: { fontSize: 10, lineHeight: 15 }, context: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  contextText: { flex: 1, fontSize: 12, fontFamily: 'Inter_700Bold' }, smallButton: { fontSize: 11, fontFamily: 'Inter_700Bold' }, searchRow: { minHeight: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 48, fontFamily: 'Inter_400Regular' }, ask: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }, chipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  message: { maxWidth: '88%', padding: 11, borderRadius: 14 }, answer: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }, notice: { borderRadius: 14, padding: 13, gap: 5 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' }, group: { gap: 8 }, result: { borderWidth: 1, borderRadius: 16, padding: 13, gap: 9 }, resultMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' }, badge: { fontSize: 9, fontFamily: 'Inter_700Bold', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, maxWidth: 105 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, secondary: { minHeight: 44, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});