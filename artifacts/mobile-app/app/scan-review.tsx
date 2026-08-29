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
import { useTranslation } from '@/hooks/useTranslation';
import { scanDocumentPages } from '@/utils/documentScanner';
import { createPersistentScannedDocument, deleteTemporaryScanPages } from '@/utils/scanPdf';
import { recognizeAndAnalyzeDocument } from '@/utils/documentOcr';
import { MAX_SCAN_PAGES } from '@/utils/scanLimits';
import type { DocumentVariant } from '@/utils/documentReconstruction';

export default function ScanReviewScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { pendingAsset, setPendingAsset, clearPendingAsset } = useApp();
  const [pages, setPages] = useState<string[]>(pendingAsset?.pageUris ?? []);
  const [selectedPage, setSelectedPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [error, setError] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<DocumentVariant>('clean');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const scanMore = async (replaceIndex?: number) => {
    setBusy(true);
    setBusyLabel(t('scan.opening'));
    setError('');
    try {
      const result = await scanDocumentPages();
      if (result.status !== 'success' || result.scannedImages.length === 0) return;
      const nextPageCount =
        replaceIndex === undefined
          ? pages.length + result.scannedImages.length
          : pages.length - 1 + result.scannedImages.length;
      if (nextPageCount > MAX_SCAN_PAGES) {
        deleteTemporaryScanPages(result.scannedImages);
        setError(
          t('scan.limit', { count: MAX_SCAN_PAGES }),
        );
        return;
      }
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
      setError(t('scan.openError'));
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const removePage = (index: number) => {
    if (pages.length === 1) {
      Alert.alert(t('scan.lastPageTitle'), t('scan.lastPageText'));
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
    setBusyLabel(t('scan.enhancing'));
    setError('');
    const documentId = `document-${Date.now()}`;
    try {
      const result = await createPersistentScannedDocument(pages, documentId, selectedVariant);
      setBusyLabel(t('scan.recognizing'));
      let analysis;
      let ocrStatus: 'complete' | 'empty' | 'failed' = 'failed';
      try {
        analysis = await recognizeAndAnalyzeDocument(
          result.pageUris,
          result.originalPageUris,
        );
        ocrStatus = analysis.text ? 'complete' : 'empty';
      } catch {
        ocrStatus = 'failed';
      }
      setPendingAsset({
        uri: result.pdfUri,
        pdfUri: result.pdfUri,
        pageUris: result.pageUris,
        originalPageUris: result.originalPageUris,
        cleanPageUris: result.cleanPageUris,
        blackWhitePageUris: result.blackWhitePageUris,
        selectedVariant: result.selectedVariant,
        reconstructionDiagnostics: result.diagnostics,
        name: `Documenta Scan · ${pages.length} ${pages.length === 1 ? t('common.page') : t('common.pages')}`,
        mimeType: 'application/pdf',
        source: 'scanner',
        documentId,
        analysis,
        ocrStatus,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/document-details');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('common.error'));
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
        <Text style={[styles.emptyTitle, { color: colors.navy }]}>{t('scan.empty')}</Text>
        <Pressable onPress={cancel} style={[styles.smallPrimary, { backgroundColor: colors.coral }]}>
          <Text style={styles.primaryText}>{t('common.back')}</Text>
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
          <Pressable onPress={cancel} style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel={t('scan.cancel')}>
            <Feather name="x" size={19} color={colors.navy} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.coral }]}>{t('scan.kicker')}</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>{t('scan.preview')}</Text>
          </View>
          <View style={[styles.pageBadge, { backgroundColor: colors.sage }]}>
            <Text style={[styles.pageBadgeText, { color: colors.sageDeep }]}>{selectedPage + 1}/{pages.length}</Text>
          </View>
        </View>

        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image source={{ uri: pages[selectedPage] }} style={styles.previewImage} resizeMode="contain" testID="scan-page-preview" />
          <View style={[styles.enhancedBadge, { backgroundColor: colors.navy }]}>
            <Feather name="check-circle" size={13} color={colors.white} />
            <Text style={[styles.enhancedText, { color: colors.white }]}>{t('scan.processed')}</Text>
          </View>
        </View>

        <View style={[styles.variantCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.variantTitle, { color: colors.navy }]}>{t('scan.variantTitle')}</Text>
          <Text style={[styles.variantHint, { color: colors.muted }]}>{t('scan.variantHint')}</Text>
          <View style={styles.variantRow}>
            {([
              ['original', t('scan.original')],
              ['clean', t('scan.clean')],
              ['blackWhite', t('scan.blackWhite')],
            ] as const).map(([variant, label]) => (
              <Pressable
                key={variant}
                onPress={() => setSelectedVariant(variant)}
                disabled={busy}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedVariant === variant }}
                style={[
                  styles.variantButton,
                  { borderColor: selectedVariant === variant ? colors.coral : colors.border, backgroundColor: selectedVariant === variant ? colors.sage : colors.background },
                ]}
              >
                <Text style={[styles.variantText, { color: colors.navy }]}>{label}</Text>
              </Pressable>
            ))}
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
            <Text style={[styles.secondaryText, { color: colors.navy }]}>{t('scan.rescan')}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => removePage(selectedPage)} style={[styles.secondaryAction, { backgroundColor: colors.card, borderColor: colors.border }, busy && styles.disabled]} testID="remove-page-button">
            <Feather name="trash-2" size={17} color={colors.coral} />
            <Text style={[styles.secondaryText, { color: colors.coral }]}>{t('scan.remove')}</Text>
          </Pressable>
        </View>

        <View style={[styles.qualityCard, { backgroundColor: colors.sage }]}>
          <Feather name="maximize" size={17} color={colors.sageDeep} />
          <View style={styles.qualityCopy}>
            <Text style={[styles.qualityTitle, { color: colors.sageDeep }]}>{t('scan.nativeTitle')}</Text>
            <Text style={[styles.qualityText, { color: colors.sageDeep }]}>{t('scan.nativeText', { count: MAX_SCAN_PAGES })}</Text>
          </View>
        </View>

        {error ? <Text style={[styles.error, { color: colors.coral }]}>{error}</Text> : null}

        <Pressable disabled={busy} onPress={() => void scanMore()} style={[styles.addPageButton, { borderColor: colors.coral }, busy && styles.disabled]} testID="add-scan-page-button">
          <Feather name="plus" size={19} color={colors.coral} />
          <Text style={[styles.addPageText, { color: colors.coral }]}>{t('scan.addPage')}</Text>
        </Pressable>

        <Pressable disabled={busy} onPress={() => void createPdf()} style={[styles.createButton, { backgroundColor: busy ? colors.muted : colors.coral }]} testID="create-scan-pdf-button">
          <View>
            <Text style={[styles.createTitle, { color: colors.white }]}>{busy ? busyLabel || t('scan.creating') : t('scan.create')}</Text>
            <Text style={[styles.createSubtitle, { color: colors.white }]}>{t('scan.createSubtitle', { count: pages.length, pages: pages.length === 1 ? t('common.page') : t('common.pages'), variant: selectedVariant === 'clean' ? t('scan.clean') : selectedVariant === 'blackWhite' ? t('scan.blackWhite') : t('scan.original') })}</Text>
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
  variantCard: { borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 14 },
  variantTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 3 },
  variantHint: { fontSize: 10, lineHeight: 14, fontFamily: 'Inter_400Regular', marginBottom: 10 },
  variantRow: { gap: 7 },
  variantButton: { minHeight: 36, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center' },
  variantText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
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