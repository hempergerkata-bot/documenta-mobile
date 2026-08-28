import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentRecord, DocumentStatus, useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { persistDocumentAsset } from '@/utils/documentFiles';
import { deletePersistentScannedDocument } from '@/utils/scanPdf';
import type { DocumentAnalysisField } from '@/utils/documentAnalysis';

const categories = ['Versicherungen', 'Familie', 'Finanzen', 'Arbeit & Bildung', 'Wohnen', 'Auto', 'Gesundheit', 'Behörden', 'Verträge'];
const people = ['Ich', 'Partner', 'Kind', 'Haushalt', 'Auto'];
const documentTypes = [
  'Rechnung',
  'Mahnung',
  'Lohnabrechnung / Gehaltsabrechnung',
  'Versicherungsbrief',
  'Krankenkasse',
  'Vertrag',
  'Kontoauszug',
  'Steuerdokument',
  'Behördenschreiben',
  'Rechnung Strom/Gas/Internet',
  'Zahlungsaufforderung',
  'Bescheid',
  'Brief',
  'Nachweis',
];
const statusOptions: DocumentStatus[] = ['Offen', 'Bezahlt', 'Erledigt', 'Später'];

export default function DocumentDetailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingAsset, addDocument, clearPendingAsset } = useApp();
  const [title, setTitle] = useState('');
  const [sender, setSender] = useState('');
  const [category, setCategory] = useState(
    pendingAsset?.source === 'scanner' ? '' : 'Versicherungen',
  );
  const [subcategory, setSubcategory] = useState('');
  const [documentType, setDocumentType] = useState(
    pendingAsset?.source === 'scanner' ? '' : 'Rechnung',
  );
  const [documentDate, setDocumentDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState(
    pendingAsset?.source === 'scanner' ? '' : 'Ich',
  );
  const [status, setStatus] = useState<DocumentStatus | ''>(
    pendingAsset?.source === 'scanner' ? '' : 'Offen',
  );
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savedRef = useRef(false);
  const analysisAppliedRef = useRef(false);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const uncertainFields = new Set(pendingAsset?.analysis?.uncertainFields ?? []);
  const canSave =
    !!title.trim() &&
    !!category &&
    !!documentType &&
    !!person.trim() &&
    !!status &&
    !!pendingAsset &&
    !saving;

  useEffect(() => {
    return () => {
      if (!savedRef.current && pendingAsset?.source === 'scanner') {
        deletePersistentScannedDocument(
          pendingAsset.pdfUri,
          pendingAsset.pageUris,
          pendingAsset.originalPageUris,
        );
      }
    };
  }, [pendingAsset]);

  useEffect(() => {
    if (analysisAppliedRef.current || !pendingAsset?.analysis) return;
    analysisAppliedRef.current = true;
    const fields = pendingAsset.analysis.fields;
    const stringValue = (field: DocumentAnalysisField) => {
      const value = fields[field]?.value;
      return typeof value === 'string' ? value : '';
    };
    setTitle(stringValue('title'));
    setSender(stringValue('sender'));
    setCategory(stringValue('category'));
    setSubcategory(stringValue('subcategory'));
    setDocumentType(stringValue('documentType'));
    setDocumentDate(stringValue('documentDate'));
    setDueDate(stringValue('dueDate'));
    setAmount(stringValue('amount'));
    setPerson(stringValue('person'));
    const suggestedStatus = stringValue('status');
    if (statusOptions.includes(suggestedStatus as DocumentStatus)) {
      setStatus(suggestedStatus as DocumentStatus);
    }
    const suggestedTags = fields.tags?.value;
    if (Array.isArray(suggestedTags)) setTags(suggestedTags.join(', '));
  }, [pendingAsset]);

  const uncertaintyHint = (field: DocumentAnalysisField) =>
    uncertainFields.has(field) ? (
      <Text style={[styles.uncertainHint, { color: colors.coral }]}>
        Automatisch erkannt · unsicher – bitte prüfen
      </Text>
    ) : null;

  const saveDocument = async () => {
    const trimmedTitle = title.trim();
    if (!canSave || !pendingAsset || !status) return;
    setSaving(true);
    setSaveError('');
    const id = pendingAsset.documentId ?? `document-${Date.now()}`;
    let persistentUri: string;
    try {
      persistentUri =
        pendingAsset.source === 'scanner' && pendingAsset.pdfUri
          ? pendingAsset.pdfUri
          : persistDocumentAsset(pendingAsset, id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Die Datei konnte nicht gespeichert werden.');
      setSaving(false);
      return;
    }
    const document: DocumentRecord = {
      id,
      title: trimmedTitle,
      sender: sender.trim(),
      category,
      subcategory: subcategory.trim(),
      documentType,
      documentDate: documentDate.trim(),
      dueDate: dueDate.trim() || undefined,
      amount: amount.trim() || undefined,
      person,
      status,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      note: note.trim() || undefined,
      uri: persistentUri,
      mimeType: pendingAsset.mimeType,
      pdfUri: pendingAsset.pdfUri,
      pageUris: pendingAsset.pageUris,
      originalPageUris: pendingAsset.originalPageUris,
      ocrText: pendingAsset.analysis?.text || undefined,
      analysisUncertainFields: pendingAsset.analysis?.uncertainFields,
      createdAt: new Date().toISOString(),
    };
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    savedRef.current = true;
    addDocument(document);
    clearPendingAsset();
    router.replace('/documents');
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: Platform.OS === 'web' ? 34 : 112 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]} accessibilityLabel="Zurück">
            <Feather name="arrow-left" size={19} color={colors.navy} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.coral }]}>DOKUMENT ABLEGEN</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>Dokumentdetails</Text>
          </View>
          <View style={[styles.step, { backgroundColor: colors.coralSoft }]}><Text style={[styles.stepText, { color: colors.coral }]}>2/2</Text></View>
        </View>

        <View style={[styles.assetBar, { backgroundColor: colors.sage }]}>
          <View style={[styles.assetIcon, { backgroundColor: colors.card }]}><Feather name={pendingAsset?.mimeType?.includes('pdf') ? 'file' : 'image'} size={18} color={colors.sageDeep} /></View>
          <View style={styles.assetCopy}>
            <Text style={[styles.assetName, { color: colors.sageDeep }]} numberOfLines={1}>{pendingAsset?.name ?? 'Dokument ausgewählt'}</Text>
            <Text style={[styles.assetMeta, { color: colors.sageDeep }]}>{pendingAsset?.source === 'scanner' ? `${pendingAsset.pageUris?.length ?? 0} Seiten · Original + optimierte PDF gespeichert` : pendingAsset ? 'Bereit zur Ablage' : 'Keine Datei ausgewählt'}</Text>
          </View>
          <Feather name="check-circle" size={20} color={colors.sageDeep} />
        </View>

        {pendingAsset?.source === 'scanner' ? (
          <View
            style={[
              styles.analysisCard,
              {
                backgroundColor:
                  pendingAsset.ocrStatus === 'complete'
                    ? colors.sage
                    : colors.coralSoft,
              },
            ]}
            testID="ocr-analysis-status"
          >
            <Feather
              name={pendingAsset.ocrStatus === 'complete' ? 'cpu' : 'alert-circle'}
              size={18}
              color={
                pendingAsset.ocrStatus === 'complete'
                  ? colors.sageDeep
                  : colors.coral
              }
            />
            <View style={styles.analysisCopy}>
              <Text
                style={[
                  styles.analysisTitle,
                  {
                    color:
                      pendingAsset.ocrStatus === 'complete'
                        ? colors.sageDeep
                        : colors.navy,
                  },
                ]}
              >
                {pendingAsset.ocrStatus === 'complete'
                  ? 'Lokale Dokumentanalyse abgeschlossen'
                  : pendingAsset.ocrStatus === 'empty'
                    ? 'Kein lesbarer Text erkannt'
                    : 'Dokumentanalyse nicht verfügbar'}
              </Text>
              <Text
                style={[
                  styles.analysisText,
                  {
                    color:
                      pendingAsset.ocrStatus === 'complete'
                        ? colors.sageDeep
                        : colors.mutedForeground,
                  },
                ]}
              >
                {pendingAsset.ocrStatus === 'complete'
                  ? 'Vorschläge wurden nur aus lesbarem Dokumenttext übernommen. Unsichere Felder sind markiert und alles bleibt bearbeitbar.'
                  : 'Bitte fülle die Angaben manuell aus. Es wurden keine Daten erfunden.'}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.navy }]}>Dokumentdetails</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Pflichtfelder sind mit einem klaren Titel markiert.</Text>

        <Text style={[styles.label, { color: colors.navy }]}>Titel</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="z. B. AOK PLUS – Versicherungsstatus Hochschule" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} testID="details-title-input" />
        {uncertaintyHint('title')}
        <Text style={[styles.titleHint, { color: colors.mutedForeground }]}>
          Trage nur einen Titel ein, der eindeutig aus dem Dokument hervorgeht. Du kannst ihn vor dem Speichern jederzeit bearbeiten.
        </Text>

        <Text style={[styles.label, { color: colors.navy }]}>Absender / Institution</Text>
        <TextInput value={sender} onChangeText={setSender} placeholder="z. B. Allianz Versicherung" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} testID="details-sender-input" />
        {uncertaintyHint('sender')}

        <Text style={[styles.label, { color: colors.navy }]}>Kategorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
          {categories.map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, { backgroundColor: category === item ? colors.coral : colors.card, borderColor: category === item ? colors.coral : colors.border }]}>
              <Text style={[styles.chipText, { color: category === item ? colors.white : colors.navy }]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {uncertaintyHint('category')}

        <Text style={[styles.label, { color: colors.navy }]}>Unterkategorie</Text>
        <TextInput value={subcategory} onChangeText={setSubcategory} placeholder="z. B. Haftpflicht" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} />
        {uncertaintyHint('subcategory')}

        <Text style={[styles.label, { color: colors.navy }]}>Dokumenttyp</Text>
        <View style={styles.wrap}>
          {documentTypes.map((item) => (
            <Pressable key={item} onPress={() => setDocumentType(item)} style={[styles.chip, { backgroundColor: documentType === item ? colors.navy : colors.card, borderColor: documentType === item ? colors.navy : colors.border }]}>
              <Text style={[styles.chipText, { color: documentType === item ? colors.white : colors.navy }]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {uncertaintyHint('documentType')}

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={[styles.label, { color: colors.navy }]}>Dokumentdatum</Text>
            <TextInput value={documentDate} onChangeText={setDocumentDate} placeholder="TT.MM.JJJJ" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} keyboardType="numbers-and-punctuation" />
            {uncertaintyHint('documentDate')}
          </View>
          <View style={styles.column}>
            <Text style={[styles.label, { color: colors.navy }]}>Frist / Fälligkeitsdatum</Text>
            <TextInput value={dueDate} onChangeText={setDueDate} placeholder="TT.MM.JJJJ" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} keyboardType="numbers-and-punctuation" />
            {uncertaintyHint('dueDate')}
          </View>
        </View>

        <Text style={[styles.label, { color: colors.navy }]}>Betrag <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>(optional)</Text></Text>
        <TextInput value={amount} onChangeText={setAmount} placeholder="z. B. 128,40 €" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} keyboardType="decimal-pad" />
        {uncertaintyHint('amount')}

        <Text style={[styles.label, { color: colors.navy }]}>Zugehörige Person</Text>
        <TextInput
          value={person}
          onChangeText={setPerson}
          placeholder="Name aus dem Dokument oder eigene Zuordnung"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              color: colors.navy,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          testID="details-person-input"
        />
        {uncertaintyHint('person')}
        <View style={styles.wrap}>
          {people.map((item) => (
            <Pressable key={item} onPress={() => setPerson(item)} style={[styles.chip, { backgroundColor: person === item ? colors.sageDeep : colors.card, borderColor: person === item ? colors.sageDeep : colors.border }]}>
              <Text style={[styles.chipText, { color: person === item ? colors.white : colors.navy }]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.navy }]}>Status</Text>
        <View style={styles.wrap}>
          {statusOptions.map((item) => (
            <Pressable key={item} onPress={() => setStatus(item)} style={[styles.chip, { backgroundColor: status === item ? colors.accent : colors.card, borderColor: status === item ? colors.accent : colors.border }]}>
              <Text style={[styles.chipText, { color: status === item ? colors.accentForeground : colors.navy }]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {uncertaintyHint('status')}

        <Text style={[styles.label, { color: colors.navy }]}>Tags</Text>
        <TextInput value={tags} onChangeText={setTags} placeholder="z. B. wichtig, 2025, versicherung" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} />
        {uncertaintyHint('tags')}

        <Text style={[styles.label, { color: colors.navy }]}>Notiz</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Eigene Notiz hinzufügen" placeholderTextColor={colors.mutedForeground} multiline textAlignVertical="top" style={[styles.noteInput, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} />

        {saveError ? <Text style={[styles.saveError, { color: colors.coral }]}>{saveError}</Text> : null}
        <Pressable onPress={saveDocument} disabled={!canSave} style={({ pressed }) => [styles.saveButton, { backgroundColor: canSave ? colors.coral : colors.muted }, pressed && styles.pressed]} testID="save-details-button">
          <Text style={[styles.saveText, { color: canSave ? colors.white : colors.mutedForeground }]}>{saving ? 'Datei wird gespeichert…' : 'Dokument speichern'}</Text>
          <Feather name={saving ? 'loader' : 'check'} size={19} color={canSave ? colors.white : colors.mutedForeground} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 21 },
  backButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginHorizontal: 12 },
  kicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.8, marginBottom: 5 },
  heading: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  step: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  stepText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  assetBar: { minHeight: 65, borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 27 },
  assetIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  assetCopy: { flex: 1, marginLeft: 11 },
  assetName: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  assetMeta: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  analysisCard: { borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  analysisCopy: { flex: 1, marginLeft: 10 },
  analysisTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  analysisText: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  sectionTitle: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  sectionSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 17 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 11, marginBottom: 8 },
  input: { minHeight: 51, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, fontSize: 13, fontFamily: 'Inter_400Regular' },
  titleHint: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular', marginTop: 7 },
  uncertainHint: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_600SemiBold', marginTop: 6 },
  noteInput: { minHeight: 94, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, paddingTop: 13, fontSize: 13, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  chipList: { gap: 8, paddingRight: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 },
  chipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  twoColumn: { flexDirection: 'row', gap: 9 },
  column: { flex: 1 },
  saveButton: { minHeight: 57, borderRadius: 18, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27 },
  saveText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  saveError: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_600SemiBold', marginTop: 16 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});