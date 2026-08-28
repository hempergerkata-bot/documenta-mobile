import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentPdfPreview } from '@/components/DocumentPdfPreview';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

function MetadataRow({
  label,
  value,
  colors,
}: {
  label: string;
  value?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.metadataRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.metadataLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.metadataValue, { color: colors.navy }]}>{value || '–'}</Text>
    </View>
  );
}

export default function SavedDocumentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { documents } = useApp();
  const [fullScreen, setFullScreen] = useState(false);
  const document = documents.find((item) => item.id === id);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const previewUri = document?.pdfUri ?? document?.uri;
  const isPdf =
    document?.mimeType?.toLowerCase().includes('pdf') ||
    previewUri?.toLowerCase().split('?')[0].endsWith('.pdf');

  if (!document) {
    return (
      <View style={[styles.missingScreen, { backgroundColor: colors.background }]}>
        <Feather name="file-minus" size={30} color={colors.coral} />
        <Text style={[styles.missingTitle, { color: colors.navy }]}>Dokument nicht gefunden</Text>
        <Pressable onPress={() => router.back()} style={[styles.primaryButton, { backgroundColor: colors.coral }]}>
          <Text style={styles.primaryButtonText}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  const preview = previewUri ? (
    isPdf ? (
      <DocumentPdfPreview uri={previewUri} />
    ) : (
      <Image source={{ uri: previewUri }} style={styles.image} resizeMode="contain" testID="document-image-preview" />
    )
  ) : (
    <View style={[styles.noOriginal, { backgroundColor: colors.sage }]}>
      <Feather name="file-text" size={30} color={colors.sageDeep} />
      <Text style={[styles.noOriginalTitle, { color: colors.sageDeep }]}>Kein Original verfügbar</Text>
      <Text style={[styles.noOriginalText, { color: colors.sageDeep }]}>
        Dieses Beispieldokument wurde ohne Bild oder PDF gespeichert.
      </Text>
    </View>
  );

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
              accessibilityLabel="Zurück"
              testID="document-detail-back"
            >
              <Feather name="arrow-left" size={19} color={colors.navy} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: colors.coral }]}>DOKUMENT</Text>
              <Text style={[styles.heading, { color: colors.navy }]} numberOfLines={2}>{document.title}</Text>
            </View>
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.previewContent}>{preview}</View>
            {previewUri ? (
              <Pressable
                onPress={() => setFullScreen(true)}
                style={({ pressed }) => [styles.fullScreenButton, { backgroundColor: colors.navy }, pressed && styles.pressed]}
                testID="open-fullscreen-preview"
              >
                <Feather name="maximize-2" size={16} color={colors.white} />
                <Text style={[styles.fullScreenText, { color: colors.white }]}>Vollbild anzeigen</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.navy }]}>Dokumentdetails</Text>
          <View style={[styles.metadataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MetadataRow label="Titel" value={document.title} colors={colors} />
            <MetadataRow label="Absender" value={document.sender} colors={colors} />
            <MetadataRow label="Kategorie" value={document.category} colors={colors} />
            <MetadataRow label="Dokumenttyp" value={document.documentType} colors={colors} />
            <MetadataRow label="Dokumentdatum" value={document.documentDate} colors={colors} />
            <MetadataRow label="Frist" value={document.dueDate} colors={colors} />
            <MetadataRow label="Betrag" value={document.amount} colors={colors} />
            <MetadataRow label="Person" value={document.person} colors={colors} />
            <MetadataRow label="Status" value={document.status} colors={colors} />
            <MetadataRow label="Tags" value={document.tags.join(', ')} colors={colors} />
            <MetadataRow label="Notiz" value={document.note} colors={colors} />
          </View>
        </View>
      </ScrollView>

      <Modal visible={fullScreen} animationType="fade" onRequestClose={() => setFullScreen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 20 : insets.top + 8 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.navy }]} numberOfLines={1}>{document.title}</Text>
            <Pressable
              onPress={() => setFullScreen(false)}
              style={[styles.closeButton, { backgroundColor: colors.navy }]}
              accessibilityLabel="Vollbild schließen"
              testID="close-fullscreen-preview"
            >
              <Feather name="x" size={20} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.modalPreview}>{preview}</View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: 12 },
  kicker: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.8, marginBottom: 4 },
  heading: { fontSize: 21, lineHeight: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  previewCard: { height: 430, borderRadius: 20, borderWidth: 1, padding: 10, marginBottom: 27, overflow: 'hidden' },
  previewContent: { flex: 1, borderRadius: 13, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  noOriginal: { flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noOriginalTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 12 },
  noOriginalText: { fontSize: 11, lineHeight: 17, textAlign: 'center', fontFamily: 'Inter_400Regular', marginTop: 6 },
  fullScreenButton: { minHeight: 47, borderRadius: 14, marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  fullScreenText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  sectionTitle: { fontSize: 19, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  metadataCard: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14 },
  metadataRow: { minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 11 },
  metadataLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginBottom: 5 },
  metadataValue: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_500Medium' },
  modal: { flex: 1, paddingHorizontal: 12, paddingBottom: 12 },
  modalHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold' },
  closeButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalPreview: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  missingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  missingTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginVertical: 16 },
  primaryButton: { borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13 },
  primaryButtonText: { color: '#ffffff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});