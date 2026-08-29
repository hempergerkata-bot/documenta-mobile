import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { isReplyLanguage, languageName, type ReplySupportedLanguage } from '@/utils/localization';
import type { ReplyDraftCandidate } from '@/utils/actionEngine';

function localizedDraft(candidate: ReplyDraftCandidate, language: ReplySupportedLanguage): Pick<ReplyDraftCandidate, 'subject' | 'body' | 'language' | 'userEdited' | 'updatedAt'> {
  const evidence = candidate.evidence[0]?.text;
  const copy = {
    de: {
      subject: `Antwort prüfen: ${candidate.subject.replace(/^Antwort prüfen:\s*/, '')}`,
      intro: 'Entwurf zur Prüfung.',
      evidence: 'Beleg aus dem Dokument',
      closing: 'Bitte Inhalt, Empfänger und Anlagen vor dem Versand selbst prüfen.',
    },
    hu: {
      subject: `Válasz ellenőrzése: ${candidate.subject.replace(/^Antwort prüfen:\s*/, '')}`,
      intro: 'Ellenőrzésre váró tervezet.',
      evidence: 'Bizonyíték a dokumentumból',
      closing: 'Küldés előtt ellenőrizd a tartalmat, a címzettet és a mellékleteket.',
    },
    en: {
      subject: `Review reply: ${candidate.subject.replace(/^Antwort prüfen:\s*/, '')}`,
      intro: 'Draft for review.',
      evidence: 'Evidence from the document',
      closing: 'Review the content, recipient, and attachments yourself before sending.',
    },
  }[language];
  return {
    subject: copy.subject,
    body: evidence ? `${copy.intro}\n\n${copy.evidence}: “${evidence}”\n\n${copy.closing}` : `${copy.intro}\n\n${copy.closing}`,
    language,
    userEdited: false,
    updatedAt: new Date().toISOString(),
  };
}

export default function ReplyDraftScreen() {
  const colors = useColors();
  const inset = useSafeAreaInsets();
  const { t, language } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { replyDrafts, settings, addReplyDraft } = useApp();
  const candidate = replyDrafts.find((item) => item.id === id);
  const [recipient, setRecipient] = useState(candidate?.recipient ?? '');
  const [subject, setSubject] = useState(candidate?.subject ?? '');
  const [body, setBody] = useState(candidate?.body ?? '');
  const [edited, setEdited] = useState(candidate?.userEdited ?? false);
  const sourceFacts = useMemo(() => candidate?.evidence.map((item) => item.text) ?? [], [candidate]);
  const requestedReplyLanguage = settings.replyLanguage;
  const replySupported = isReplyLanguage(requestedReplyLanguage);

  if (!candidate) return <View style={[styles.missing, { backgroundColor: colors.background }]}><Text style={{ color: colors.navy }}>{t('error.notFound')}</Text></View>;

  const persist = (patch: Partial<ReplyDraftCandidate>) => addReplyDraft({ ...candidate, recipient, subject, body, userEdited: edited, updatedAt: new Date().toISOString(), ...patch });
  const onEdit = (setter: (value: string) => void) => (value: string) => { setter(value); setEdited(true); };
  const regenerate = () => {
    if (!replySupported) return;
    const apply = () => {
      const generated = localizedDraft(candidate, requestedReplyLanguage);
      setSubject(generated.subject);
      setBody(generated.body);
      setEdited(false);
      addReplyDraft({ ...candidate, recipient, ...generated });
    };
    if (edited || candidate.userEdited) Alert.alert(t('reply.regenerateTitle'), t('reply.regenerateMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.accept'), onPress: apply },
    ]);
    else apply();
  };

  return <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={[styles.page, { paddingTop: (Platform.OS === 'web' ? 67 : inset.top) + 16 }]}>
    <Pressable onPress={() => router.back()} accessibilityLabel={t('common.back')}><Text style={[styles.back, { color: colors.coral }]}>← {t('common.back')}</Text></Pressable>
    <Text style={[styles.title, { color: colors.navy }]}>{t('reply.title')}</Text>
    <Text style={[styles.meta, { color: colors.mutedForeground }]}>{t('reply.language')}: {languageName(settings.replyLanguage, language)}</Text>
    {!replySupported && <Text style={[styles.warning, { color: colors.coral }]}>{t('reply.unsupportedLanguage')}</Text>}
    {(edited || candidate.userEdited) && <Text style={[styles.warning, { color: colors.coral }]}>{t('reply.editedWarning')}</Text>}
    <Text style={[styles.label, { color: colors.navy }]}>{t('reply.recipient')}</Text>
    <TextInput value={recipient} onChangeText={onEdit(setRecipient)} accessibilityLabel={t('reply.recipient')} style={[styles.input, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]} />
    <Text style={[styles.label, { color: colors.navy }]}>{t('reply.subject')}</Text>
    <TextInput value={subject} onChangeText={onEdit(setSubject)} accessibilityLabel={t('reply.subject')} style={[styles.input, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]} />
    <Text style={[styles.label, { color: colors.navy }]}>{t('reply.body')}</Text>
    <TextInput value={body} onChangeText={onEdit(setBody)} accessibilityLabel={t('reply.body')} multiline style={[styles.body, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]} />
    <View style={[styles.facts, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.navy }]}>{t('reply.sourceFacts')}</Text>
      {sourceFacts.map((fact, index) => <Text key={`${index}-${fact}`} style={[styles.fact, { color: colors.mutedForeground }]}>“{fact}”</Text>)}
    </View>
    <Pressable disabled={!replySupported} onPress={regenerate} accessibilityLabel={t('reply.generate')} style={[styles.secondary, { borderColor: colors.coral, opacity: replySupported ? 1 : .45 }]}><Text style={{ color: colors.coral, fontFamily: 'Inter_700Bold' }}>{t('reply.generate')}</Text></Pressable>
    <Pressable onPress={() => persist({ userEdited: edited })} accessibilityLabel={t('common.save')} style={[styles.primary, { backgroundColor: colors.coral }]}><Text style={{ color: colors.white, fontFamily: 'Inter_700Bold' }}>{t('common.save')}</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, page: { padding: 20, paddingBottom: 44, gap: 10 }, missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { fontFamily: 'Inter_700Bold' }, title: { fontSize: 27, fontFamily: 'Inter_700Bold' }, meta: { fontSize: 12 }, warning: { fontSize: 12, lineHeight: 18 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold' }, input: { borderWidth: 1, borderRadius: 12, padding: 12 }, body: { minHeight: 190, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: 'top' },
  facts: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 7 }, fact: { fontSize: 11, lineHeight: 16 }, secondary: { borderWidth: 1, borderRadius: 12, padding: 13, alignItems: 'center' },
  primary: { borderRadius: 12, padding: 13, alignItems: 'center' },
});