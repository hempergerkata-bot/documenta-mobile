import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { scanDocumentPages } from '@/utils/documentScanner';
import { createPersistentScannedDocument, deleteTemporaryScanPages } from '@/utils/scanPdf';
import { recognizeAndAnalyzeDocument } from '@/utils/documentOcr';

export default function ScanReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingAsset, setPendingAsset, clearPendingAsset } = useApp();
  const [pages, setPages] = useState<string[]>(pendingAsset?.pageUris ?? []);
  const [selectedPage, setSelectedPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [error, setError] = useState('');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const scanMore = async (replaceIndex?: number) => {
    setBusy(true);
    setBusyLabel('Scanner wird geöffnet…');
    setError('');
    try {
      const result = await scanDocumentPages();
      if (result.status !== 'success' || result.scannedImages.length === 0) return;
      if (replaceIndex === undefined) {
        setPages((current) => [...current, ...result.scannedImages]);
        setSelectedPage(pages.length);
      } else {
        deleteTemporaryScanPages([pages[replaceIndex]]);
        setPages((current) => [
          ...current.slice(0, replaceIndex),
          ...result.scannedImages,
          ...current.slice(replaceIndex + 1),
        ]);
        setSelectedPage(replaceIndex);
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setError('Der Scanner konnte nicht erneut geöffnet werden. Prüfe den Kamerazugriff.');
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const removePage = (index: number) => {
    if (pages.length === 1) {
      Alert.alert('Letzte Seite', 'Ein Dokument muss mindestens eine Seite enthalten.');
      return;
    }
    deleteTemporaryScanPages([pages[index]]);
    const next = pages.filter((_, pageIndex) => pageIndex !== index);
    setPages(next);
    setSelectedPage(Math.min(selectedPage, next.length - 1));
  };

  const createPdf = async () => {
    if (pages.length === 0 || busy) return;
    setBusy(true);
    setBusyLabel('Seiten werden verbessert…');
    setError('');
    const documentId = `document-${Date.now()}`;
    try {
      const result = await createPersistentScannedDocument(pages, documentId);
      setBusyLabel('Text und Dokumenttyp werden erkannt…');
      let analysis;
      let ocrStatus: 'complete' | 'empty' | 'failed' = 'failed';
      try {
        analysis = await recognizeAndAnalyzeDocument(result.pageUris);
        ocrStatus = analysis.text ? 'complete' : 'empty';
      } catch {
        ocrStatus = 'failed';
      }
      setPendingAsset({
        uri: result.pdfUri,
        pdfUri: result.pdfUri,
        pageUris: result.pageUris,
        originalPageUris: result.originalPageUris,
        name: `Documenta Scan · ${pages.length} ${pages.length === 1 ? 'Seite' : 'Seiten'}`,
        mimeType: 'application/pdf',
        source: 'scanner',
        documentId,
        analysis,
        ocrStatus,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/document-details');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Die PDF-Datei konnte nicht erstellt werden.');
      setBusy(false);
      setBusyLabel('');
    }
  };

  const cancel = () => {
    deleteTemporaryScanPages(pages);
    clearPendingAsset();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/add');
    }
  };

  if (pages.length === 0) {
    return (
      <View style={[styles.emptyScreen, { backgroundColor: colors.background }]}>
        <Feather name="file-minus" size={30} color={colors.coral} />
        <Text style={[styles.emptyTitle, { color: colors.navy }]}>Keine Scan-Seite vorhanden</Text>
        <Pressable onPress={cancel} style={[styles.smallPrimary, { backgroundColor: colors.coral }]}>
          <Text style={styles.primaryText}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 28 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={cancel} style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel="Scan abbrechen">
            <Feather name="x" size={19} color={colors.navy} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.coral }]}>SCAN PRÜFEN</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>Seitenvorschau</Text>
          </View>
          <View style={[styles.pageBadge, { backgroundColor: colors.sage }]}>
            <Text style={[styles.pageBadgeText, { color: colors.sageDeep }]}>{selectedPage + 1}/{pages.length}</Text>
          </View>
        </View>

        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image source={{ uri: pages[selectedPage] }} style={styles.previewImage} resizeMode="contain" testID="scan-page-preview" />
          <View style={[styles.enhancedBadge, { backgroundColor: colors.navy }]}>
            <Feather name="check-circle" size={13} color={colors.white} />
            <Text style={[styles.enhancedText, { color: colors.white }]}>Kanten · Zuschnitt · Perspektive bestätigt</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailList}>
          {pages.map((page, index) => (
            <Pressable
              key={`${page}-${index}`}
              onPress={() => setSelectedPage(index)}
              style={[styles.thumbnail, { borderColor: selectedPage === index ? colors.coral : colors.border, backgroundColor: colors.card }]}
              testID={`scan-thumbnail-${index}`}
            >
              <Image source={{ uri: page }} style={styles.thumbnailImage} />
              <View style={[styles.thumbnailNumber, { backgroundColor: selectedPage === index ? colors.coral : colors.navy }]}>
                <Text style={styles.thumbnailNumberText}>{index + 1}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.actionRow}>
          <Pressable disabled={busy} onPress={() => void scanMore(selectedPage)} style={[styles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }, busy && styles.disabled]} testID="rescan-page-button">
            <Feather name="crop" size={17} color={colors.navy} />
            <Text style={[styles.secondaryText, { color: colors.navy }]}>Ecken neu korrigieren</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => removePage(selectedPage)} style={[styles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }, busy && styles.disabled]} testID="remove-page-button">
            <Feather name="trash-2" size={17} color={colors.coral} />
            <Text style={[styles.secondaryText, { color: colors.coral }]}>Entfernen</Text>
          </Pressable>
        </View>

        <View style={[styles.qualityCard, { backgroundColor: colors.sage }]}>
          <Feather name="maximize" size={17} color={colors.sageDeep} />
          <View style={styles.qualityCopy}>
            <Text style={[styles.qualityTitle, { color: colors.sageDeep }]}>Echter nativer Dokumentenscan</Text>
            <Text style={[styles.qualityText, { color: colors.sageDeep }]}>Der native Scanner erkennt alle vier Papierkanten, schneidet den Hintergrund weg und entzerrt die Perspektive. Die vier Ecken werden bereits in der nativen Scan-Vorschau vor der Übernahme manuell korrigiert.</Text>
          </View>
        </View>

        {error ? <Text style={[styles.error, { color: colors.coral }]}>{error}</Text> : null}

        <Pressable disabled={busy} onPress={() => void scanMore()} style={[styles.addPageButton, { borderColor: colors.coral }, busy && styles.disabled]} testID="add-scan-page-button">
          <Feather name="plus" size={19} color={colors.coral} />
          <Text style={[styles.addPageText, { color: colors.coral }]}>Weitere Seite mit Kantenerkennung scannen</Text>
        </Pressable>

        <Pressable disabled={busy} onPress={() => void createPdf()} style={[styles.createButton, { backgroundColor: busy ? colors.muted : colors.coral }]} testID="create-scan-pdf-button">
          <View>
            <Text style={[styles.createTitle, { color: colors.white }]}>{busy ? busyLabel || 'PDF wird erstellt…' : 'PDF erstellen & analysieren'}</Text>
            <Text style={[styles.createSubtitle, { color: colors.white }]}>{pages.length} {pages.length === 1 ? 'Seite' : 'Seiten'} · Original + optimierte PDF · OCR lokal</Text>
          </View>
          <Feather name="arrow-right" size={20} color={colors.white} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginHorizontal: 12 },
  kicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.8, marginBottom: 4 },
  heading: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  pageBadge: { borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  pageBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  previewCard: { height: 430, borderWidth: 1, borderRadius: 22, padding: 10, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%', borderRadius: 14 },
  enhancedBadge: { position: 'absolute', left: 19, bottom: 19, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  enhancedText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  thumbnailList: { gap: 9, paddingVertical: 14, paddingRight: 20 },
  thumbnail: { width: 67, height: 84, borderRadius: 13, borderWidth: 2, padding: 3, overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: '100%', borderRadius: 8 },
  thumbnailNumber: { position: 'absolute', right: 5, bottom: 5, width: 19, height: 19, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  thumbnailNumberText: { color: '#ffffff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  actionRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  secondaryAction: { flex: 1, minHeight: 47, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  qualityCard: { borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  qualityCopy: { flex: 1, marginLeft: 10 },
  qualityTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  qualityText: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 12 },
  addPageButton: { minHeight: 52, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  addPageText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  createButton: { minHeight: 66, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  createSubtitle: { fontSize: 10, fontFamily: 'Inter_400Regular', opacity: 0.76 },
  emptyScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginVertical: 15 },
  smallPrimary: { borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13 },
  primaryText: { color: '#ffffff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  disabled: { opacity: 0.55 },
});