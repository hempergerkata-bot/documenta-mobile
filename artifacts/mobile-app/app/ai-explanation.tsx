import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  answerDocumentQuestion,
  deriveExplanationRequestState,
  deriveTranslationState,
  isExplanationAdapterLanguage,
} from '@/utils/explanationExperience';
import { analyzeDocumentIntelligence, explanationFor, localizedExplanationSections, type ExplanationLanguage } from '@/utils/documentIntelligence';
import { confidenceLabel, languageDefinition, languageName } from '@/utils/localization';
import { type LocalVoice } from '@/utils/ttsCapability';
import { discoverLocalVoices, pauseLocalExplanation, resumeLocalExplanation, speakLocalExplanation, stopLocalExplanation } from '@/utils/nativeIntegrations';
import { selectedLocalVoice } from '@/utils/ttsCapability';

type VoiceState = 'idle' | 'playing' | 'paused';
export default function ExplanationScreen() {
  const colors = useColors(); const { id } = useLocalSearchParams<{ id?: string }>(); const { language, t, backSymbol } = useTranslation();
  const { activeDocuments: documents, settings, activeCases: cases, conversationForDocument, addConversationExchange, resetDocumentConversation, startNewDocumentConversation, updateExplanationState } = useApp();
  const [question, setQuestion] = useState(''); const [lastTrace, setLastTrace] = useState<ReturnType<typeof answerDocumentQuestion>['sourceTrace']>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle'); const [voiceError, setVoiceError] = useState(false);
  const [voices, setVoices] = useState<LocalVoice[]>([]);
  const document = documents.find((item) => item.id === id);
  const intelligence = document?.intelligence ?? (document?.ocrText ? analyzeDocumentIntelligence({ text: document.ocrText, structuredFields: { ...document.structuredFields, sender: document.sender, documentDate: document.documentDate, dueDate: document.dueDate, amount: document.amount, status: document.status } }) : undefined);
  const explanationLanguage = isExplanationAdapterLanguage(settings.explanationLanguage) ? settings.explanationLanguage as ExplanationLanguage : undefined;
  const sourceLanguage = intelligence?.documentLanguage.value === 'unknown' ? undefined : intelligence?.documentLanguage.value;
  const translation = deriveTranslationState(sourceLanguage, settings.explanationLanguage, settings.translationMode);
  const requestState = deriveExplanationRequestState(settings.explanationLanguage, translation, !!intelligence, intelligence?.reviewRequired ?? false, !!intelligence && !!explanationLanguage);
  const mode = settings.explanationMode === 'kurz' ? 'short' : settings.explanationMode === 'detailliert' ? 'detailed' : 'normal';
  const sections = intelligence && explanationLanguage ? localizedExplanationSections(intelligence, explanationLanguage) : undefined;
  const cards = sections && intelligence && explanationLanguage ? [
    [t('intelligence.whatIsIt'), explanationFor(intelligence, explanationLanguage, mode)],
    [t('intelligence.whatToDo'), sections.action], [t('intelligence.byWhen'), sections.deadline],
    [t('intelligence.howMuch'), sections.amount], [t('intelligence.whatItMeans'), sections.personalImpact],
  ] : [];
  const explanationText = cards.map(([heading, body]) => `${heading}. ${body}`).join('\n\n');
  const conversation = document ? conversationForDocument(document.id) : [];
  const selectedLocale = languageDefinition(settings.explanationLanguage).locale;
  const selectedVoice = selectedLocalVoice(voices, selectedLocale, settings.explanationVoiceIdentifiers?.[settings.explanationLanguage]);
  const voiceAvailable = Boolean(selectedVoice) && (Platform.OS === 'web' ? typeof (globalThis as any).SpeechSynthesisUtterance !== 'undefined' : true);
  useEffect(() => { if (document) updateExplanationState(document.id, requestState, translation.state); }, [document?.id, requestState, translation.state, updateExplanationState]);
  useEffect(() => () => { if (Platform.OS === 'web' && voiceAvailable) (globalThis as any).speechSynthesis.cancel(); else stopLocalExplanation(); }, [voiceAvailable]);
  useEffect(() => {
    if (Platform.OS !== 'web') {
      discoverLocalVoices().then((available) => setVoices(available.map(({ identifier, name, language: lang, quality, localService }) => ({ identifier, name, lang, quality, localService }))));
      return;
    }
    if (typeof (globalThis as any).speechSynthesis === 'undefined') return;
    const speech = (globalThis as any).speechSynthesis;
    const load = () => setVoices(speech.getVoices().map((voice: any) => ({ identifier: voice.voiceURI ?? voice.name, lang: voice.lang, name: voice.name, localService: voice.localService })));
    load(); speech.addEventListener?.('voiceschanged', load);
    return () => speech.removeEventListener?.('voiceschanged', load);
  }, []);
  const ask = () => {
    if (!document || !question.trim()) return;
    if (!intelligence || !explanationLanguage) {
      addConversationExchange(document.id, question.trim(), t('explanation.unsupportedQuestion')); setLastTrace([]); setQuestion(''); return;
    }
    const confirmed = (field: string) => ['accept', 'edit'].includes(document.intelligenceReviewDecisions?.[field] ?? '');
    const corrected = {
      sender: confirmed('sender') ? document.sender : undefined,
      documentDate: confirmed('documentDate') ? document.documentDate : undefined,
      amount: confirmed('mainAmount') ? document.amount : undefined,
      deadline: confirmed('deadlines') ? document.dueDate : undefined,
    };
    const response = answerDocumentQuestion(intelligence, question.trim(), explanationLanguage, corrected);
    const safeText = response.supported ? `${response.text}${response.safetyNotice ? `\n${response.safetyNotice}` : ''}` : t('explanation.unsupportedQuestion');
    addConversationExchange(document.id, question.trim(), safeText); setLastTrace(response.sourceTrace); setQuestion('');
  };
  const startVoice = async () => {
    if (!voiceAvailable || !explanationText) { setVoiceError(true); return; }
    if (Platform.OS !== 'web') {
      const started = await speakLocalExplanation(explanationText, { language: selectedLocale, voice: selectedVoice?.identifier, rate: settings.speechRate === 'langsam' ? 0.8 : settings.speechRate === 'schnell' ? 1.2 : 1 });
      setVoiceState(started ? 'playing' : 'idle'); setVoiceError(!started); return;
    }
    const speech = (globalThis as any).speechSynthesis; speech.cancel();
    const utterance = new (globalThis as any).SpeechSynthesisUtterance(explanationText);
    utterance.lang = selectedLocale; utterance.voice = (globalThis as any).speechSynthesis.getVoices().find((voice: any) => voice.name === selectedVoice?.name) ?? null;
    utterance.rate = settings.speechRate === 'langsam' ? 0.8 : settings.speechRate === 'schnell' ? 1.2 : 1;
    utterance.onstart = () => setVoiceState('playing'); utterance.onend = () => setVoiceState('idle'); utterance.onerror = () => { setVoiceState('idle'); setVoiceError(true); };
    speech.speak(utterance); setVoiceError(false);
  };
  const pause = () => { if (voiceAvailable) { if (Platform.OS === 'web') (globalThis as any).speechSynthesis.pause(); else pauseLocalExplanation(); setVoiceState('paused'); } };
  const resume = () => { if (voiceAvailable) { if (Platform.OS === 'web') (globalThis as any).speechSynthesis.resume(); else resumeLocalExplanation(); setVoiceState('playing'); } };
  const stop = () => { if (voiceAvailable) { if (Platform.OS === 'web') (globalThis as any).speechSynthesis.cancel(); else stopLocalExplanation(); } setVoiceState('idle'); };
  const translationLabel = translation.state === 'not_needed' ? t('explanation.noTranslation') : translation.state === 'disabled' ? t('explanation.translationDisabled') : translation.state === 'unavailable' ? t('explanation.translationUnavailable') : translation.confirmationRequired ? t('explanation.translationAsk') : t('explanation.translationReady');
  if (!document) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.navy }}>{t('document.noDocument')}</Text></View>;
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.page}>
    <Pressable onPress={() => router.back()} accessibilityLabel={t('common.back')}><Text style={{ color: colors.coral, fontFamily: 'Inter_700Bold' }}>{backSymbol} {t('common.back')}</Text></Pressable>
    <Text style={[styles.kicker, { color: colors.coral }]}>{t('explanation.localKicker')}</Text><Text style={[styles.title, { color: colors.navy }]}>{document.title}</Text>
    <Text style={{ color: colors.mutedForeground }}>{languageName(settings.explanationLanguage, language)} · {t('explanation.translationState')}: {translationLabel}</Text>
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={{ color: requestState === 'generated' ? colors.sageDeep : colors.coral, fontFamily: 'Inter_700Bold' }}>{t(requestState === 'generated' ? 'explanation.generated' : requestState === 'needs_review' ? 'explanation.needsReview' : requestState === 'unavailable' ? 'explanation.unavailable' : 'explanation.available')}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{t('explanation.localOnly')}</Text></View>
    {cards.map(([heading, body]) => <View key={heading} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.heading, { color: colors.navy }]}>{heading}</Text><Text selectable style={[styles.body, { color: colors.mutedForeground }]}>{body}</Text></View>)}
    {(settings.explanationDisplayMode === 'voice' || settings.explanationDisplayMode === 'text_and_voice') ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.heading, { color: colors.navy }]}>{t('explanation.voiceTitle')}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{t('explanation.voiceReadsText')}</Text><View style={styles.controls}><Control label={t('explanation.play')} onPress={startVoice} disabled={!voiceAvailable || voiceState === 'playing'} /><Control label={t('explanation.pause')} onPress={pause} disabled={voiceState !== 'playing'} /><Control label={t('explanation.resume')} onPress={resume} disabled={voiceState !== 'paused'} /><Control label={t('explanation.stop')} onPress={stop} disabled={voiceState === 'idle'} /><Control label={t('explanation.restart')} onPress={startVoice} disabled={!voiceAvailable} /></View>{(!voiceAvailable || voiceError) ? <Text style={[styles.body, { color: colors.coral }]}>{t('explanation.voiceUnavailable')}</Text> : null}</View> : null}
    <Text style={[styles.heading, { color: colors.navy }]}>{t('explanation.history')}</Text>
    {conversation.map((message) => <View key={message.id} style={[styles.message, { alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: message.role === 'user' ? colors.coralSoft : colors.sage }]}><Text style={[styles.body, { color: colors.navy }]}>{message.text}</Text></View>)}
    <TextInput multiline value={question} onChangeText={setQuestion} accessibilityLabel={t('explanation.placeholder')} placeholder={t('explanation.placeholder')} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} />
    <Pressable onPress={ask} disabled={!question.trim()} style={[styles.primary, { backgroundColor: colors.coral, opacity: question.trim() ? 1 : .45 }]} accessibilityLabel={t('explanation.ask')}><Text style={{ color: colors.white, fontFamily: 'Inter_700Bold' }}>{t('explanation.ask')}</Text></Pressable>
    {lastTrace.length ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.heading, { color: colors.navy }]}>{t('explanation.sources')}</Text>{lastTrace.map((trace) => <View key={trace.field}><Text style={[styles.body, { color: colors.navy }]}>{t('explanation.sourceField')}</Text>{trace.evidence.map((item, index) => <Text key={`${trace.field}-${index}`} style={[styles.body, { color: colors.mutedForeground }]}>{item.text} · {t('explanation.confidence')}: {confidenceLabel(item.confidence, language)}</Text>)}</View>)}</View> : null}
    <View style={styles.controls}><Control label={t('explanation.newConversation')} onPress={() => startNewDocumentConversation(document.id)} /><Control label={t('explanation.clearHistory')} onPress={() => resetDocumentConversation(document.id)} /></View>
    <Text style={[styles.body, { color: colors.mutedForeground }]}>{t('common.cases')}: {cases.filter((item) => item.documentIds.includes(document.id)).map((item) => item.title).join(', ') || '–'}</Text>
  </ScrollView>;
}
function Control({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { const colors = useColors(); return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.control, { backgroundColor: colors.card, borderColor: colors.border, opacity: disabled ? .45 : 1 }]}><Text style={{ color: colors.navy, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ page: { padding: 24, paddingTop: 64, paddingBottom: 48, gap: 12 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, kicker: { fontSize: 10, letterSpacing: 1.8, fontFamily: 'Inter_700Bold' }, title: { fontSize: 27, fontFamily: 'Inter_700Bold' }, card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 }, heading: { fontSize: 14, fontFamily: 'Inter_700Bold' }, body: { fontSize: 12, lineHeight: 18 }, input: { minHeight: 72, borderWidth: 1, borderRadius: 14, padding: 13, textAlignVertical: 'top' }, primary: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, control: { minHeight: 42, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, message: { maxWidth: '88%', borderRadius: 14, padding: 12 } });