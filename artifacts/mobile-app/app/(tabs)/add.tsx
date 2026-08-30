import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { scanDocumentPages } from '@/utils/documentScanner';
import { cloudIntelligenceFromCanonical, loadCloudConsent, processMultimodalDocument } from '@/utils/documentaCloud';

function pickWebPdf(): Promise<{ uri: string; name: string; mimeType: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = () =>
        resolve({
          uri: String(reader.result),
          name: file.name,
          mimeType: file.type || 'application/pdf',
        });
      reader.readAsDataURL(file);
    };
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

export default function AddDocumentScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setPendingAsset } = useApp();
  const [scanning, setScanning] = useState(false);
  const [scannerNotice, setScannerNotice] = useState('');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const openDetails = (asset: { uri: string; name: string; mimeType?: string }, source: 'camera' | 'gallery' | 'file') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingAsset({ ...asset, source });
    router.push('/document-details');
  };

  /** PDFs use the identical current-bytes Flash route before review. */
  const openPdfDetails = async (asset: { uri: string; name: string; mimeType?: string }) => {
    setScanning(true);
    try {
      const optedIn = await loadCloudConsent();
      if (!optedIn) {
        openDetails({ ...asset, mimeType: 'application/pdf' }, 'file');
        return;
      }
      const canonical = await processMultimodalDocument([asset.uri], asset.name);
      setPendingAsset({
        ...asset, mimeType: 'application/pdf', source: 'file', pageUris: [asset.uri], documentId: canonical.documentId,
        ocrStatus: 'complete',
        cloudIntelligence: cloudIntelligenceFromCanonical(canonical),
        cloudState: 'cloud',
        cloudPipeline: {
          optedIn: true, localOcr: { state: 'empty', textAvailable: false },
          documentAiOcr: { state: 'skipped' }, gemini: { state: 'succeeded' },
          fallbackUsed: false, failures: [], finalProvider: 'cloud_processing', cloudState: 'cloud',
        },
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/document-details');
    } catch {
      // The selected asset remains reviewable; no partial/local result replaces
      // a successful canonical result because none was received.
      openDetails({ ...asset, mimeType: 'application/pdf' }, 'file');
    } finally {
      setScanning(false);
    }
  };

  const handleCamera = async () => {
    if (Platform.OS === 'web') {
      setScannerNotice(
        t('add.browserScanner'),
      );
      return;
    }
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      setScannerNotice(
        t('add.expoScanner'),
      );
      return;
    }

    setScanning(true);
    try {
      const result = await scanDocumentPages();
      if (result.status !== 'success' || result.scannedImages.length === 0) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPendingAsset({
        uri: result.scannedImages[0],
        name: `${result.scannedImages.length} ${result.scannedImages.length === 1 ? t('common.page') : t('common.pages')}`,
        mimeType: 'application/x-document-scan',
        source: 'scanner',
        pageUris: result.scannedImages,
      });
      router.push('/scan-review' as never);
    } catch {
      setScannerNotice(
        t('add.scannerError'),
      );
    } finally {
      setScanning(false);
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled) {
      const selected = result.assets[0];
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Gallery images use the same review and local OCR pipeline as scans.
      // Keep their source as gallery; do not relabel an import as a camera scan.
      setPendingAsset({
        uri: selected.uri,
        name: selected.fileName ?? `${t('add.image')}.jpg`,
        mimeType: selected.mimeType,
        source: 'gallery',
        pageUris: [selected.uri],
      });
      router.push('/scan-review' as never);
    }
  };

  const handleFile = async () => {
    if (Platform.OS === 'web') {
      const selected = await pickWebPdf();
      if (selected) await openPdfDetails(selected);
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled) {
      const selected = result.assets[0];
      await openPdfDetails({ uri: selected.uri, name: selected.name, mimeType: selected.mimeType });
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 18, paddingBottom: Platform.OS === 'web' ? 34 : 112 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.coral }]}>{t('add.kicker')}</Text>
            <Text style={[styles.title, { color: colors.navy }]}>{t('add.title')}</Text>
            <Text style={[styles.intro, { color: colors.mutedForeground }]}>{t('add.intro')}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]} accessibilityLabel={t('common.close')}>
            <Feather name="x" size={20} color={colors.navy} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('add.source')}</Text>
        <View style={styles.sourceGrid}>
          <Pressable disabled={scanning} onPress={() => void handleCamera()} style={({ pressed }) => [styles.sourceCard, { backgroundColor: colors.navy }, pressed && styles.pressed, scanning && styles.disabled]} testID="camera-source">
            <View style={[styles.sourceIcon, { backgroundColor: colors.coral }]}><Feather name={scanning ? 'loader' : 'maximize'} size={22} color={colors.white} /></View>
            <Text style={styles.sourceTitleDark}>{scanning ? t('add.scanning') : t('dashboard.scan')}</Text>
            <Text style={styles.sourceSubtitleDark}>{t('add.scanFeatures')}</Text>
          </Pressable>
          <Pressable onPress={() => void handleGallery()} style={({ pressed }) => [styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]} testID="gallery-source">
            <View style={[styles.sourceIcon, { backgroundColor: colors.sun }]}><Feather name="image" size={22} color={colors.navy} /></View>
            <Text style={[styles.sourceTitle, { color: colors.navy }]}>{t('add.image')}</Text>
            <Text style={[styles.sourceSubtitle, { color: colors.mutedForeground }]}>{t('add.gallery')}</Text>
          </Pressable>
          <Pressable onPress={() => void handleFile()} style={({ pressed }) => [styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]} testID="file-source">
            <View style={[styles.sourceIcon, { backgroundColor: colors.coralSoft }]}><Feather name="file-text" size={22} color={colors.coral} /></View>
            <Text style={[styles.sourceTitle, { color: colors.navy }]}>PDF</Text>
            <Text style={[styles.sourceSubtitle, { color: colors.mutedForeground }]}>{t('add.files')}</Text>
          </Pressable>
        </View>

        {scannerNotice ? (
          <View style={[styles.scannerNotice, { backgroundColor: colors.coralSoft, borderColor: colors.coral }]} testID="scanner-native-notice">
            <Feather name="smartphone" size={18} color={colors.coral} />
            <View style={styles.scannerNoticeCopy}>
              <Text style={[styles.scannerNoticeTitle, { color: colors.navy }]}>{t('add.devBuild')}</Text>
              <Text style={[styles.scannerNoticeText, { color: colors.mutedForeground }]}>{scannerNotice}</Text>
            </View>
            <Pressable onPress={() => setScannerNotice('')} accessibilityLabel={t('add.closeNotice')}>
              <Feather name="x" size={17} color={colors.coral} />
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.infoCard, { backgroundColor: colors.sage }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.card }]}><Feather name="lock" size={16} color={colors.sageDeep} /></View>
          <View style={styles.infoCopy}>
            <Text style={[styles.infoTitle, { color: colors.sageDeep }]}>{t('add.privateTitle')}</Text>
            <Text style={[styles.infoText, { color: colors.sageDeep }]}>{t('add.privateText')}</Text>
          </View>
        </View>

        <View style={[styles.futureCard, { borderColor: colors.border }]}>
          <Feather name="mail" size={17} color={colors.mutedForeground} />
          <View style={styles.futureCopy}>
            <Text style={[styles.futureTitle, { color: colors.navy }]}>{t('add.emailTitle')}</Text>
            <Text style={[styles.futureText, { color: colors.mutedForeground }]}>{t('add.emailText')}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 29 },
  kicker: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 7 },
  title: { fontSize: 29, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  intro: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter_400Regular', marginTop: 10, maxWidth: 300 },
  closeButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 13 },
  sourceGrid: { flexDirection: 'row', gap: 9, marginBottom: 18 },
  sourceCard: { flex: 1, minHeight: 143, borderRadius: 20, borderWidth: 1, padding: 13 },
  sourceIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  sourceTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  sourceSubtitle: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  sourceTitleDark: { color: '#ffffff', fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  sourceSubtitleDark: { color: 'rgba(255,255,255,0.68)', fontSize: 10, fontFamily: 'Inter_400Regular' },
  infoCard: { minHeight: 76, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  scannerNotice: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  scannerNoticeCopy: { flex: 1, marginHorizontal: 10 },
  scannerNoticeTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  scannerNoticeText: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  infoIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, marginLeft: 11 },
  infoTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  infoText: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  futureCard: { minHeight: 69, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  futureCopy: { flex: 1 },
  futureTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 5 },
  futureText: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.6 },
});