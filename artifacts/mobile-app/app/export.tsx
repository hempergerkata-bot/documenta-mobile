import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { exportPdfPackage, type ExportPdfPackageErrorCode } from '@/utils/exportPdfPackage';
import type { TranslationKey } from '@/utils/localization';
import { canonicalPdfUri } from '@/utils/documentFiles';

const targets = ['accountant', 'lawyer', 'authority', 'doctor'] as const;
const errorKeys: Record<ExportPdfPackageErrorCode, TranslationKey> = {
  NO_DOCUMENTS: 'export.errorNoDocuments',
  SHARING_UNAVAILABLE: 'export.errorSharingUnavailable',
  SOURCE_UNAVAILABLE: 'export.errorSourceUnavailable',
  SOURCE_INVALID: 'export.errorSourceInvalid',
  SOURCE_FETCH_FAILED: 'export.errorSourceFetch',
  FILE_WRITE_FAILED: 'export.errorFileWrite',
  EXPORT_FAILED: 'export.errorFailed',
};

export default function ExportPackageScreen() {
  const c = useColors();
  const inset = useSafeAreaInsets();
  const { t, date, number } = useTranslation();
  const { activeDocuments: docs, activeCases: cases, addExportPackage } = useApp();
  const [ids, setIds] = useState<string[]>([]);
  const [type, setType] = useState<typeof targets[number]>('authority');
  const [caseId, setCaseId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [includeToc, setIncludeToc] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const exportable = docs.filter((document) => !!canonicalPdfUri(document));
  const move = (index: number, by: number) => setIds((current) => {
    const next = [...current];
    const target = index + by;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const save = async () => {
    if (!ids.length || busy) return;
    setBusy(true);
    setError('');
    try {
      const selected = ids
        .map((id) => docs.find((document) => document.id === id))
        .filter((document): document is typeof docs[number] => !!document)
        .map((document) => ({ title: document.title, uri: canonicalPdfUri(document) }))
        .filter((document): document is { title: string; uri: string } => !!document.uri);
      if (selected.length !== ids.length) {
        setError(t('export.errorSourceUnavailable'));
        return;
      }
      await exportPdfPackage({
        documents: selected,
        includeToc,
        labels: {
          tocTitle: t('export.tocTitle'),
          tocContinuationTitle: t('export.tocContinuationTitle'),
          documentLabel: t('export.documentLabel'),
          shareDialogTitle: t('export.shareTitle'),
        },
      });
      addExportPackage({
        id: `export-${Date.now()}`,
        documentIds: ids,
        orderedIds: ids,
        recipient,
        type,
        format: 'PDF-package',
        includeToc,
        caseName: cases.find((item) => item.id === caseId)?.title,
        createdAt: new Date().toISOString(),
      });
    } catch (caught) {
      const code = caught && typeof caught === 'object' && 'code' in caught
        ? (caught as { code: ExportPdfPackageErrorCode }).code
        : undefined;
      setError(code && errorKeys[code] ? t(errorKeys[code]) : t('export.errorFailed'));
    } finally {
      setBusy(false);
    }
  };

  return <ScrollView style={[s.screen, { backgroundColor: c.background }]} contentContainerStyle={[s.page, { paddingTop: (Platform.OS === 'web' ? 67 : inset.top) + 16 }]}>
    <Pressable onPress={() => router.back()}><Text style={[s.back, { color: c.coral }]}>← {t('common.back')}</Text></Pressable>
    <Text style={[s.title, { color: c.navy }]}>{t('export.title')}</Text>
    <Text style={[s.hint, { color: c.mutedForeground }]}>{t('export.hint')}</Text>
    <Text style={[s.heading, { color: c.navy }]}>{t('export.activeDocuments')}</Text>
    {exportable.length ? exportable.map((document) => <Pressable key={document.id} disabled={busy} onPress={() => setIds((current) => current.includes(document.id) ? current.filter((id) => id !== document.id) : [...current, document.id])} style={[s.line, { backgroundColor: ids.includes(document.id) ? c.sage : c.card, borderColor: c.border }]}>
      <Text style={{ color: c.navy }}>{ids.includes(document.id) ? '✓ ' : ''}{document.title}</Text>
    </Pressable>) : <Text style={[s.hint, { color: c.mutedForeground }]}>{t('export.noDocuments')}</Text>}
    <TextInput editable={!busy} value={recipient} onChangeText={setRecipient} placeholder={t('export.recipient')} placeholderTextColor={c.mutedForeground} style={[s.input, { color: c.navy, borderColor: c.border }]} />
    <View style={s.wrap}>{targets.map((target) => <Pressable disabled={busy} key={target} onPress={() => setType(target)} style={[s.chip, { backgroundColor: type === target ? c.coral : c.card, borderColor: c.border }]}><Text style={{ color: type === target ? c.white : c.navy }}>{target}</Text></Pressable>)}</View>
    <Text style={[s.heading, { color: c.navy }]}>{t('export.case')}</Text>
    <View style={s.wrap}>{cases.map((item) => <Pressable disabled={busy} key={item.id} onPress={() => setCaseId(caseId === item.id ? '' : item.id)} style={[s.chip, { backgroundColor: caseId === item.id ? c.sageDeep : c.card, borderColor: c.border }]}><Text style={{ color: caseId === item.id ? c.white : c.navy }}>{item.title}</Text></Pressable>)}</View>
    <Pressable disabled={busy} onPress={() => setIncludeToc((value) => !value)} style={[s.line, { backgroundColor: includeToc ? c.sage : c.card, borderColor: c.border }]}><Text style={{ color: c.navy }}>{includeToc ? '✓' : '○'} {t('export.toc')}</Text></Pressable>
    <Text style={[s.heading, { color: c.navy }]}>{t('export.order')}</Text>
    {ids.map((id, index) => {
      const document = docs.find((item) => item.id === id);
      return <View key={id} style={[s.line, { backgroundColor: c.card, borderColor: c.border }]}><View style={{ flex: 1 }}><Text style={{ color: c.navy }}>{document?.title}</Text><Text style={[s.hint, { color: c.mutedForeground }]}>{date(document?.documentDate)} · {document?.category} · {cases.find((item) => item.documentIds.includes(id))?.title ?? t('export.noCase')}</Text></View><Pressable disabled={busy} onPress={() => move(index, -1)}><Text style={{ color: c.coral }}>↑</Text></Pressable><Pressable disabled={busy} onPress={() => move(index, 1)}><Text style={{ color: c.coral }}>↓</Text></Pressable></View>;
    })}
    {error ? <Text style={[s.hint, { color: c.coral }]}>{error}</Text> : null}
    <Pressable disabled={!ids.length || busy} onPress={() => void save()} style={[s.save, { backgroundColor: c.coral, opacity: ids.length && !busy ? 1 : .45 }]}><Text style={s.white}>{t('export.save', { count: number(ids.length) })}</Text></Pressable>
  </ScrollView>;
}

const s = StyleSheet.create({ screen: { flex: 1 }, page: { padding: 20, paddingBottom: 40, gap: 10 }, back: { fontFamily: 'Inter_700Bold' }, title: { fontFamily: 'Inter_700Bold', fontSize: 28 }, heading: { fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 8 }, hint: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 }, line: { borderWidth: 1, borderRadius: 12, padding: 11, flexDirection: 'row', gap: 12, alignItems: 'center' }, input: { borderWidth: 1, borderRadius: 10, padding: 11 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderWidth: 1, borderRadius: 9, padding: 8 }, save: { padding: 14, borderRadius: 12, alignItems: 'center' }, white: { color: '#fff', fontFamily: 'Inter_700Bold' } });