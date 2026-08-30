import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentPdfPreview } from '@/components/DocumentPdfPreview';
import { DocumentIntelligencePanel } from '@/components/DocumentIntelligencePanel';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  exportDocumentPdf,
  printDocumentPdf,
  shareDocumentPdf,
} from '@/utils/documentActions';
import { DOCUMENT_STATUSES, GENERAL_CATEGORIES, type DocumentStatus } from '@/utils/documentCore';
import {
  analyzeDocumentIntelligence,
  applyReviewDecision,
  applyReviewDecisions,
  isCurrentDocumentIntelligence,
  normalizeDocumentDate,
  type ReviewDecision,
} from '@/utils/documentIntelligence';
import { documentStatusLabel } from '@/utils/localization';
import { applyArchiveReview } from '@/utils/archive';
import type { TranslationKey } from '@/utils/localization';

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
  const { t, date, currency, language } = useTranslation();
  const relationshipLabel = (kind: typeof relationshipKind) => ({
    vorheriges: t('document.relationshipPrevious'), antwort: t('document.relationshipReply'),
    erinnerung: t('document.relationshipReminder'), zahlung: t('document.relationshipPayment'),
    abschluss: t('document.relationshipCompletion'),
  }[kind]);
  const structuredFieldLabel = (field: string) => ({
    referenceNumber: t('document.referenceNumber'), customerNumber: t('document.customerNumber'),
    invoiceNumber: t('document.invoiceNumber'), contractNumber: t('document.contractNumber'),
    insuranceNumber: t('document.insuranceNumber'), iban: 'IBAN', taxNumber: t('document.taxNumber'),
    patientNumber: t('document.patientNumber'), schoolReference: t('document.schoolReference'),
  }[field] ?? field);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
    const { documents, updateDocument, profiles, relationships, cases, archiveDocument, trashDocument, addRelationship, updateCase, documentTimeline } = useApp();
  const [fullScreen, setFullScreen] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [originalPageIndex, setOriginalPageIndex] = useState(0);
  const [showOcr, setShowOcr] = useState(false);
  const [editing, setEditing] = useState(false);
   const [relationshipTarget, setRelationshipTarget] = useState('');
   const [relationshipKind, setRelationshipKind] = useState<'vorheriges' | 'antwort' | 'erinnerung' | 'zahlung' | 'abschluss'>('antwort');
  const [edit, setEdit] = useState({ title: '', sender: '', documentType: '', documentDate: '', receivedDate: '', relevantPeriodStart: '', relevantPeriodEnd: '', archiveYear: '', dueDate: '', amount: '', tags: '', note: '', category: '', status: 'Neu' as DocumentStatus, profileIds: [] as string[] });
  const document = documents.find((item) => item.id === id);
  const intelligence =
    (isCurrentDocumentIntelligence(document?.intelligence) ? document.intelligence : undefined) ??
    (document?.ocrText
      ? analyzeDocumentIntelligence({
          text: document.ocrText,
          structuredFields: {
            ...document.structuredFields,
            sender: document.sender,
            documentDate: document.documentDate,
          },
        })
      : undefined);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const originalPages = document?.originalPageUris ?? [];
  const previewUri =
    showOriginal && originalPages.length > 0
      ? originalPages[originalPageIndex]
      : document?.pdfUri ?? document?.uri;
  const isPdf =
    !showOriginal &&
    (document?.mimeType?.toLowerCase().includes('pdf') ||
      previewUri?.toLowerCase().split('?')[0].endsWith('.pdf'));
  const pdfUri = document?.pdfUri ?? (isPdf ? previewUri : undefined);
  const openEdit = () => { if (!document) return; setEdit({ title: document.title, sender: document.sender, documentType: document.documentType, documentDate: document.documentDate, receivedDate: document.receivedDate ?? '', relevantPeriodStart: document.relevantPeriodStart ?? '', relevantPeriodEnd: document.relevantPeriodEnd ?? '', archiveYear: document.archiveYear?.toString() ?? '', dueDate: document.dueDate ?? '', amount: document.amount ?? '', tags: document.tags.join(', '), note: document.note ?? '', category: document.category, status: document.status, profileIds: document.profileIds ?? [] }); setEditing(true); };
  const saveEdit = () => {
    if (!document || !edit.title.trim() || !edit.profileIds.length) return;
    const { archiveYear: archiveYearInput, ...editFields } = edit;
    const selectedArchiveYear = Number(archiveYearInput);
    updateDocument({
      id: document.id,
      update: (current) => {
        const intelligenceReviewDecisions = Object.fromEntries(
          Object.entries(current.intelligenceReviewDecisions ?? {}).map(([field, decision]) => [field, decision === 'edit' ? 'accept' : decision]),
        ) as Record<string, ReviewDecision>;
        const correctedBase = { ...current, ...editFields, title: edit.title.trim(), sender: edit.sender.trim(), receivedDate: normalizeDocumentDate(edit.receivedDate.trim()), relevantPeriodStart: normalizeDocumentDate(edit.relevantPeriodStart.trim()), relevantPeriodEnd: normalizeDocumentDate(edit.relevantPeriodEnd.trim()), tags: edit.tags.split(',').map((tag) => tag.trim()).filter(Boolean), dueDate: normalizeDocumentDate(edit.dueDate.trim()), amount: edit.amount.trim() || undefined, note: edit.note.trim() || undefined, person: profiles.find((profile) => profile.id === edit.profileIds[0])?.name ?? current.person, intelligenceReviewDecisions };
        const corrected = selectedArchiveYear >= 1900 && selectedArchiveYear <= new Date().getUTCFullYear() + 1
          ? applyArchiveReview(correctedBase, { archiveYear: selectedArchiveYear, reviewStatus: 'corrected', at: new Date().toISOString(), reason: 'corrected' })
          : correctedBase;
        const recalculated = current.ocrText ? analyzeDocumentIntelligence({ text: current.ocrText, structuredFields: { ...current.structuredFields, sender: corrected.sender, documentDate: corrected.documentDate, dueDate: corrected.dueDate, amount: corrected.amount, status: corrected.status } }) : undefined;
        return { ...corrected, intelligence: recalculated ? applyReviewDecisions(recalculated, intelligenceReviewDecisions) : current.intelligence };
      },
    });
    setEditing(false);
  };
  const setReviewDecision = (field: string, decision: ReviewDecision) => {
    if (!document || !intelligence) return;
    updateDocument({
      id: document.id,
      update: (current) => ({
        ...current,
        intelligenceReviewDecisions: { ...current.intelligenceReviewDecisions, [field]: decision },
        intelligence: current.intelligence ? applyReviewDecision(current.intelligence, field, decision) : current.intelligence,
      }),
    });
  };
  const confirmLifecycleAction = (title: string, message: string, confirmLabel: string, destructive: boolean, action: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) action();
      return;
    }
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: action },
    ]);
  };

  const runDocumentAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      Alert.alert(
        t('document.actionUnavailable'),
        error instanceof Error ? error.message : t('document.tryAgain'),
      );
    }
  };

  if (!document) {
    return (
      <View style={[styles.missingScreen, { backgroundColor: colors.background }]}>
        <Feather name="file-minus" size={30} color={colors.coral} />
        <Text style={[styles.missingTitle, { color: colors.navy }]}>{t('document.noDocument')}</Text>
        <Pressable onPress={() => router.back()} style={[styles.primaryButton, { backgroundColor: colors.coral }]}>
          <Text style={styles.primaryButtonText}>{t('common.back')}</Text>
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
       <Text style={[styles.noOriginalTitle, { color: colors.sageDeep }]}>{t('document.noOriginal')}</Text>
      <Text style={[styles.noOriginalText, { color: colors.sageDeep }]}>
        {t('document.sampleNoOriginal')}
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
              accessibilityLabel={t('common.back')}
              testID="document-detail-back"
            >
              <Feather name="arrow-left" size={19} color={colors.navy} />
            </Pressable>
            <Pressable onPress={openEdit} style={[styles.backButton, { backgroundColor: colors.coralSoft, borderColor: colors.border }]} accessibilityLabel={t('common.edit')}>
              <Feather name="edit-2" size={18} color={colors.coral} />
            </Pressable>
            <Pressable onPress={() => updateDocument({ id: document.id, update: (current) => ({ ...current, status: current.status === 'Abgeschlossen' ? 'Gelesen' : 'Abgeschlossen' }) })} style={[styles.backButton, { backgroundColor: colors.sage, borderColor: colors.border }]} accessibilityLabel={t('common.status')}>
              <Feather name="check" size={19} color={colors.sageDeep} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: colors.coral }]}>{t('document.title').toUpperCase()}</Text>
              <Text style={[styles.heading, { color: colors.navy }]} numberOfLines={2}>{document.title}</Text>
            </View>
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {originalPages.length > 0 ? (
              <View style={[styles.modeSwitch, { backgroundColor: colors.background }]}>
                <Pressable
                  onPress={() => setShowOriginal(false)}
                  style={[
                    styles.modeButton,
                    !showOriginal && { backgroundColor: colors.navy },
                  ]}
                  testID="show-enhanced-document"
                >
                  <Text
                    style={[
                      styles.modeText,
                      { color: !showOriginal ? colors.white : colors.navy },
                    ]}
                  >
                    {t('documents.optimizedPdf')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowOriginal(true)}
                  style={[
                    styles.modeButton,
                    showOriginal && { backgroundColor: colors.navy },
                  ]}
                  testID="show-original-document"
                >
                  <Text
                    style={[
                      styles.modeText,
                      { color: showOriginal ? colors.white : colors.navy },
                    ]}
                  >
                    {t('documents.original')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.previewContent}>{preview}</View>
            {showOriginal && originalPages.length > 1 ? (
              <View style={styles.originalNavigation}>
                <Pressable
                  disabled={originalPageIndex === 0}
                  onPress={() =>
                    setOriginalPageIndex((current) => Math.max(0, current - 1))
                  }
                  style={[
                    styles.pageNavigationButton,
                    { borderColor: colors.border },
                    originalPageIndex === 0 && styles.disabled,
                  ]}
                >
                  <Feather name="chevron-left" size={16} color={colors.navy} />
                </Pressable>
                <Text style={[styles.pageIndicator, { color: colors.navy }]}>
                  {t('documents.original')} {originalPageIndex + 1}/{originalPages.length}
                </Text>
                <Pressable
                  disabled={originalPageIndex === originalPages.length - 1}
                  onPress={() =>
                    setOriginalPageIndex((current) =>
                      Math.min(originalPages.length - 1, current + 1),
                    )
                  }
                  style={[
                    styles.pageNavigationButton,
                    { borderColor: colors.border },
                    originalPageIndex === originalPages.length - 1 &&
                      styles.disabled,
                  ]}
                >
                  <Feather name="chevron-right" size={16} color={colors.navy} />
                </Pressable>
              </View>
            ) : null}
            {previewUri ? (
              <Pressable
                onPress={() => setFullScreen(true)}
                style={({ pressed }) => [styles.fullScreenButton, { backgroundColor: colors.navy }, pressed && styles.pressed]}
                testID="open-fullscreen-preview"
              >
                <Feather name="maximize-2" size={16} color={colors.white} />
                <Text style={[styles.fullScreenText, { color: colors.white }]}>{t('common.open')}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.documentActions}>
               <Pressable onPress={() => confirmLifecycleAction(t('document.archive'), t('document.restore'), t('document.archive'), false, () => { archiveDocument(document.id); router.replace('/documents'); })} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="archive" size={17} color={colors.navy} /><Text style={[styles.actionText, { color: colors.navy }]}>{t('document.archive')}</Text></Pressable>
               <Pressable onPress={() => confirmLifecycleAction(t('document.trash'), t('document.restore'), t('document.trash'), true, () => { trashDocument(document.id); router.replace('/documents'); })} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="trash-2" size={17} color={colors.coral} /><Text style={[styles.actionText, { color: colors.navy }]}>{t('document.trash')}</Text></Pressable>
            <Pressable onPress={() => router.push({ pathname: '/tasks', params: { documentId: document.id } })} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="check-square" size={17} color={colors.navy} /><Text style={[styles.actionText, { color: colors.navy }]}>{t('document.task')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/ai-explanation', params: { id: document.id } })} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Feather name="cpu" size={17} color={colors.navy} /><Text style={[styles.actionText, { color: colors.navy }]}>{t('document.explain')}</Text>
            </Pressable>
             <Pressable accessibilityRole="button" accessibilityLabel={t('assistant.title')} onPress={() => router.push({ pathname: '/assistant', params: { documentId: document.id } })} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Feather name="message-circle" size={17} color={colors.navy} /><Text style={[styles.actionText, { color: colors.navy }]}>{t('assistant.title')}</Text>
             </Pressable>
            <Pressable
              disabled={!previewUri}
              onPress={() => setFullScreen(true)}
              style={[styles.actionButton, { backgroundColor: colors.navy }, !previewUri && styles.disabled]}
              testID="document-action-open"
            >
              <Feather name="maximize-2" size={17} color={colors.white} />
               <Text style={[styles.actionText, { color: colors.white }]}>{t('common.open')}</Text>
            </Pressable>
            <Pressable
              disabled={!pdfUri}
              onPress={() => void runDocumentAction(() => shareDocumentPdf(pdfUri))}
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }, !pdfUri && styles.disabled]}
              testID="document-action-share"
            >
              <Feather name="share-2" size={17} color={colors.navy} />
              <Text style={[styles.actionText, { color: colors.navy }]}>{t('document.share')}</Text>
            </Pressable>
            <Pressable
              disabled={!pdfUri}
              onPress={() => void runDocumentAction(() => printDocumentPdf(pdfUri))}
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }, !pdfUri && styles.disabled]}
              testID="document-action-print"
            >
              <Feather name="printer" size={17} color={colors.navy} />
              <Text style={[styles.actionText, { color: colors.navy }]}>{t('document.print')}</Text>
            </Pressable>
            <Pressable
              disabled={!pdfUri}
              onPress={() => void runDocumentAction(() => exportDocumentPdf(pdfUri))}
              style={[styles.actionButton, { backgroundColor: colors.coral }, !pdfUri && styles.disabled]}
              testID="document-action-export"
            >
              <Feather name="download" size={17} color={colors.white} />
              <Text style={[styles.actionText, { color: colors.white }]}>PDF</Text>
            </Pressable>
          </View>
          {intelligence ? (
            <View style={styles.intelligenceSection}>
              <DocumentIntelligencePanel
                result={intelligence}
                onReview={openEdit}
                onReviewDecision={setReviewDecision}
              />
            </View>
          ) : null}
           <Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('document.relationships')}</Text>
            <View style={[styles.metadataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MetadataRow label={t('document.relatedCases')} value={cases.filter((item) => item.documentIds.includes(document.id)).map((item) => item.title).join(', ')} colors={colors} />
              <MetadataRow label={t('document.documentRelationships')} value={relationships.filter((item) => item.fromDocumentId === document.id || item.toDocumentId === document.id).map((item) => relationshipLabel(item.kind)).join(', ')} colors={colors} />
               <Text style={[styles.metadataLabel, { color: colors.navy }]}>{t('document.linkToCase')}</Text>
              <View style={styles.editChips}>{cases.map((item) => <Pressable key={item.id} onPress={() => updateCase({ ...item, documentIds: item.documentIds.includes(document.id) ? item.documentIds.filter((itemId) => itemId !== document.id) : [...item.documentIds, document.id], updatedAt: new Date().toISOString() })} style={[styles.editChip, { backgroundColor: item.documentIds.includes(document.id) ? colors.sageDeep : colors.card }]}><Text style={{ color: item.documentIds.includes(document.id) ? colors.white : colors.navy, fontSize: 10 }}>{item.title}</Text></Pressable>)}</View>
               <Text style={[styles.metadataLabel, { color: colors.navy }]}>{t('document.createRelationship')}</Text>
              <View style={styles.editChips}>{documents.filter((item) => item.id !== document.id && (item.lifecycle === 'aktiv' || !item.lifecycle)).map((item) => <Pressable key={item.id} onPress={() => setRelationshipTarget(item.id)} style={[styles.editChip, { backgroundColor: relationshipTarget === item.id ? colors.sageDeep : colors.card }]}><Text style={{ color: relationshipTarget === item.id ? colors.white : colors.navy, fontSize: 10 }}>{item.title}</Text></Pressable>)}</View>
               <View style={styles.editChips}>{(['vorheriges', 'antwort', 'erinnerung', 'zahlung', 'abschluss'] as const).map((kind) => <Pressable key={kind} onPress={() => setRelationshipKind(kind)} style={[styles.editChip, { backgroundColor: relationshipKind === kind ? colors.coral : colors.card }]}><Text style={{ color: relationshipKind === kind ? colors.white : colors.navy, fontSize: 10 }}>{relationshipLabel(kind)}</Text></Pressable>)}</View>
               <Pressable disabled={!relationshipTarget} onPress={() => { if (relationshipTarget) { addRelationship({ id: `relationship-${Date.now()}`, fromDocumentId: document.id, toDocumentId: relationshipTarget, kind: relationshipKind, createdAt: new Date().toISOString() }); setRelationshipTarget(''); } }} style={[styles.fullScreenButton, { backgroundColor: colors.navy, marginBottom: 12 }, !relationshipTarget && styles.disabled]}><Text style={[styles.fullScreenText, { color: colors.white }]}>{t('document.saveRelationship')}</Text></Pressable>
           </View>

          <Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('document.details')}</Text>
          <View style={[styles.metadataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MetadataRow label={t('document.title')} value={document.title} colors={colors} />
            <MetadataRow label={t('document.sender')} value={document.sender} colors={colors} />
            <MetadataRow label={t('document.category')} value={document.category} colors={colors} />
            <MetadataRow label={t('document.subcategory')} value={document.subcategory} colors={colors} />
            <MetadataRow label={t('document.type')} value={document.documentType} colors={colors} />
            <MetadataRow label={t('document.date')} value={date(document.documentDate)} colors={colors} />
            <MetadataRow label={t('archive.archiveYear')} value={`${document.archiveYear ?? t('archive.unknownYear')} · ${document.archiveYearSource === 'manual' ? t('archive.manual') : t('archive.automatic')} · ${document.archiveYearConfidence ?? 'unknown'}`} colors={colors} />
            <MetadataRow label={t('archive.receivedDate')} value={document.receivedDate ? date(document.receivedDate) : undefined} colors={colors} />
            <MetadataRow label={t('archive.importedAt')} value={document.importedAt ? date(document.importedAt) : undefined} colors={colors} />
            <MetadataRow label={t('archive.relevantPeriod')} value={[document.relevantPeriodStart ? date(document.relevantPeriodStart) : undefined, document.relevantPeriodEnd ? date(document.relevantPeriodEnd) : undefined].filter(Boolean).join(' – ')} colors={colors} />
            <MetadataRow label={t('document.payrollPeriod')} value={document.payrollPeriod} colors={colors} />
            <MetadataRow label={t('document.deadline')} value={date(document.dueDate)} colors={colors} />
            <MetadataRow label={t('document.amount')} value={currency(document.amount)} colors={colors} />
            <MetadataRow label={t('document.person')} value={document.person} colors={colors} />
            <MetadataRow label={t('document.profiles')} value={document.profileIds?.map((id) => profiles.find((profile) => profile.id === id)?.name ?? id).join(', ')} colors={colors} />
            <MetadataRow label={t('common.status')} value={documentStatusLabel(document.status, language)} colors={colors} />
            <MetadataRow label={t('document.tags')} value={document.tags.join(', ')} colors={colors} />
            <MetadataRow label={t('document.note')} value={document.note} colors={colors} />
            {Object.entries(document.structuredFields ?? {}).map(([field, value]) => (
              <MetadataRow
                key={field}
                label={structuredFieldLabel(field)}
                value={value}
                colors={colors}
              />
            ))}
            <MetadataRow
              label={t('document.localOcr')}
              value={
                document.ocrText
                  ? `${t('document.ocrRecognized', { count: document.ocrText.length })}${
                      document.analysisUncertainFields?.length
                         ? ` · ${t('document.uncertainFieldsReviewed', { count: document.analysisUncertainFields.length })}`
                        : ''
                    }`
                  : undefined
              }
              colors={colors}
            />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.navy, marginTop: 24 }]}>{t('timeline.title')}</Text>
          <View style={[styles.metadataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {documentTimeline(document.id).map((event) => <View key={event.id} style={[styles.metadataRow, { borderBottomColor: colors.border }]}><Text style={[styles.metadataValue, { color: colors.navy }]}>{t(event.titleKey as TranslationKey)}</Text><Text style={[styles.metadataLabel, { color: colors.mutedForeground }]}>{date(event.timestamp)}{event.confidence ? ` · ${event.confidence}` : ''}</Text></View>)}
          </View>
           {document.ocrText ? <View style={[styles.metadataCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}><Pressable onPress={() => setShowOcr(!showOcr)} style={styles.metadataRow}><Text style={[styles.metadataValue, { color: colors.navy }]}>{t('document.ocrText')} · {showOcr ? t('common.close') : t('common.open')}</Text></Pressable>{showOcr ? <Text style={[styles.metadataValue, { color: colors.navy, paddingBottom: 14 }]}>{document.ocrText}</Text> : null}</View> : null}
        </View>
      </ScrollView>

      <Modal visible={fullScreen} animationType="fade" onRequestClose={() => setFullScreen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 20 : insets.top + 8 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.navy }]} numberOfLines={1}>{document.title}</Text>
            <Pressable
              onPress={() => setFullScreen(false)}
              style={[styles.closeButton, { backgroundColor: colors.navy }]}
              accessibilityLabel={t('common.close')}
              testID="close-fullscreen-preview"
            >
              <Feather name="x" size={20} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.modalPreview}>{preview}</View>
        </View>
      </Modal>
      <Modal visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}>
        <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? 24 : insets.top + 14, paddingBottom: 36 }}>
          <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.navy }]}>{t('document.edit')}</Text><Pressable onPress={() => setEditing(false)} style={[styles.closeButton, { backgroundColor: colors.navy }]}><Feather name="x" size={20} color={colors.white}/></Pressable></View>
          {([['title',t('document.title')],['sender',t('document.sender')],['documentType',t('document.type')],['documentDate',t('document.date')],['receivedDate',t('archive.receivedDate')],['relevantPeriodStart',`${t('archive.relevantPeriod')} –`],['relevantPeriodEnd',`${t('archive.relevantPeriod')} +`],['archiveYear',t('archive.archiveYear')],['dueDate',t('document.dueDate')],['amount',t('document.amount')],['tags',t('document.tagsHint')],['note',t('document.note')]] as const).map(([key,label]) => <View key={key}><Text style={[styles.metadataLabel,{color:colors.navy}]}>{label}</Text><TextInput value={edit[key]} onChangeText={(value) => setEdit((current) => ({ ...current, [key]: value }))} style={[styles.editInput,{color:colors.navy,backgroundColor:colors.card,borderColor:colors.border}]} /></View>)}
          <Text style={[styles.metadataLabel,{color:colors.navy}]}>{t('document.category')}</Text><View style={styles.editChips}>{GENERAL_CATEGORIES.map((category) => <Pressable key={category} onPress={() => setEdit((current) => ({...current,category}))} style={[styles.editChip,{backgroundColor:edit.category===category?colors.coral:colors.card}]}><Text style={{color:edit.category===category?colors.white:colors.navy,fontSize:10}}>{category}</Text></Pressable>)}</View>
          <Text style={[styles.metadataLabel,{color:colors.navy}]}>{t('common.status')}</Text><View style={styles.editChips}>{DOCUMENT_STATUSES.map((status) => <Pressable key={status} onPress={() => setEdit((current) => ({...current,status}))} style={[styles.editChip,{backgroundColor:edit.status===status?colors.navy:colors.card}]}><Text style={{color:edit.status===status?colors.white:colors.navy,fontSize:10}}>{documentStatusLabel(status, language)}</Text></Pressable>)}</View>
          <Text style={[styles.metadataLabel,{color:colors.navy}]}>{t('document.assignedProfiles')}</Text><View style={styles.editChips}>{profiles.map((profile) => <Pressable key={profile.id} onPress={() => setEdit((current) => ({...current,profileIds:current.profileIds.includes(profile.id)?current.profileIds.filter((id)=>id!==profile.id):[...current.profileIds,profile.id]}))} style={[styles.editChip,{backgroundColor:edit.profileIds.includes(profile.id)?colors.sageDeep:colors.card}]}><Text style={{color:edit.profileIds.includes(profile.id)?colors.white:colors.navy,fontSize:10}}>{profile.name}</Text></Pressable>)}</View>
          <Pressable onPress={saveEdit} style={[styles.fullScreenButton,{backgroundColor:colors.coral}]}><Text style={[styles.fullScreenText,{color:colors.white}]}>{t('document.saveChanges')}</Text></Pressable>
        </ScrollView>
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
  previewCard: { height: 490, borderRadius: 20, borderWidth: 1, padding: 10, marginBottom: 27, overflow: 'hidden' },
  modeSwitch: { borderRadius: 12, padding: 3, flexDirection: 'row', marginBottom: 8 },
  modeButton: { flex: 1, minHeight: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  previewContent: { flex: 1, borderRadius: 13, overflow: 'hidden' },
  originalNavigation: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 8 },
  pageNavigationButton: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageIndicator: { minWidth: 92, textAlign: 'center', fontSize: 10, fontFamily: 'Inter_700Bold' },
  image: { width: '100%', height: '100%' },
  noOriginal: { flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noOriginalTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 12 },
  noOriginalText: { fontSize: 11, lineHeight: 17, textAlign: 'center', fontFamily: 'Inter_400Regular', marginTop: 6 },
  fullScreenButton: { minHeight: 47, borderRadius: 14, marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  fullScreenText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  documentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 25 },
  intelligenceSection: { marginBottom: 25 },
  actionButton: { flexGrow: 1, minWidth: '46%', minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
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
  disabled: { opacity: 0.35 },
  editInput: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, marginBottom: 10, fontSize: 12, fontFamily: 'Inter_400Regular' },
  editChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  editChip: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
});