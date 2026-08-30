import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentRecord, DocumentStatus, DOCUMENT_STATUSES, useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { documentCategoryLabel, documentFieldLabel, documentPlaceholder, documentStatusLabel, documentTypeLabel } from '@/utils/localization';
import { persistDocumentAssets } from '@/utils/documentFiles';
import { deletePersistentScannedDocument } from '@/utils/scanPdf';
import type { DocumentAnalysisField } from '@/utils/documentAnalysis';

import { GENERAL_CATEGORIES } from '@/utils/documentCore';
import { documentFingerprint, findDuplicates } from '@/utils/documentDomain';
import { analyzeDocumentIntelligence, normalizeDocumentDate } from '@/utils/documentIntelligence';
import { cloudReviewSuggestions, mergeCloudEvidence } from '@/utils/documentaCloud';
const categories = GENERAL_CATEGORIES;
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
const statusOptions: DocumentStatus[] = [...DOCUMENT_STATUSES];
const additionalFieldLabels = ['referenceNumber', 'customerNumber', 'invoiceNumber', 'contractNumber', 'insuranceNumber', 'iban', 'bic', 'taxNumber', 'patientNumber', 'schoolReference', 'recipient', 'netAmount', 'vatAmount', 'paymentTerms'] as const;

export default function DocumentDetailsScreen() {
  const colors = useColors();
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const { pendingAsset, addDocument, clearPendingAsset, profiles, activeDocuments } = useApp();
  const [title, setTitle] = useState('');
  const [sender, setSender] = useState('');
  const [category, setCategory] = useState(
    pendingAsset?.source === 'scanner' ? '' : 'Versicherung',
  );
  const [subcategory, setSubcategory] = useState('');
  const [documentType, setDocumentType] = useState(
    pendingAsset?.source === 'scanner' ? '' : 'Rechnung',
  );
  const [documentDate, setDocumentDate] = useState('');
  const [payrollPeriod, setPayrollPeriod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState(
    pendingAsset?.source === 'scanner' ? '' : 'Ich',
  );
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [status, setStatus] = useState<DocumentStatus | ''>(
    pendingAsset?.source === 'scanner' ? '' : 'Neu',
  );
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [additionalFields, setAdditionalFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savedRef = useRef(false);
  const duplicateApprovedRef = useRef(false);
  const analysisAppliedRef = useRef('');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const uncertainFields = new Set(pendingAsset?.analysis?.uncertainFields ?? []);
  const unresolvedFields = new Set(pendingAsset?.analysis?.unresolvedFields ?? []);
  const ocrPageResults = pendingAsset?.ocrPageResults ?? [];
  const completedOcrPages = ocrPageResults.filter((page) => page.status === 'complete').length;
  const totalOcrPages = ocrPageResults.length || pendingAsset?.pageUris?.length || 0;
  const ocrProgressLabel =
    totalOcrPages > 0
      ? `${completedOcrPages}/${totalOcrPages} ${
          totalOcrPages === 1 ? t('common.page') : t('common.pages')
        }`
      : '';
  const canSave =
    !!title.trim() &&
    !!category &&
    !!documentType &&
    selectedProfileIds.length > 0 &&
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
          pendingAsset.blackWhitePageUris,
        pendingAsset.cleanPageUris,
        );
      }
    };
  }, [pendingAsset]);

  useEffect(() => {
    if (!pendingAsset?.analysis) return;
    const revision = `${pendingAsset.documentId ?? pendingAsset.uri}:${pendingAsset.cloudIntelligence?.model ?? 'local'}:${pendingAsset.cloudIntelligence?.sourceText?.length ?? 0}`;
    if (analysisAppliedRef.current === revision) return;
    const firstApplication = analysisAppliedRef.current === '';
    analysisAppliedRef.current = revision;
    const fields = pendingAsset.analysis.fields;
    const cloudSuggestions = cloudReviewSuggestions(pendingAsset.cloudIntelligence, pendingAsset.cloudIntelligence?.sourceText ?? '');
    const stringValue = (field: DocumentAnalysisField) => {
      const value = fields[field]?.value;
      return typeof value === 'string' ? value : '';
    };
    const localOrCloud = (field: DocumentAnalysisField | 'sender' | 'documentDate' | 'dueDate' | 'amount') =>
      stringValue(field as DocumentAnalysisField) || cloudSuggestions[field]?.value || '';
    if (firstApplication) {
      setTitle(stringValue('title'));
      setCategory(stringValue('category'));
      setSubcategory(stringValue('subcategory'));
      setDocumentType(stringValue('documentType'));
      setPayrollPeriod(stringValue('payrollPeriod'));
    }
    setSender((current) => current || localOrCloud('sender'));
    setDocumentDate((current) => current || localOrCloud('documentDate'));
    setDueDate((current) => current || localOrCloud('dueDate'));
    setAmount((current) => current || localOrCloud('amount'));
    setPerson((current) => current || stringValue('person') || cloudSuggestions.person?.value || cloudSuggestions.recipient?.value || '');
    const suggestedStatus = stringValue('status');
    if (statusOptions.includes(suggestedStatus as DocumentStatus)) {
      setStatus(suggestedStatus as DocumentStatus);
    }
    const suggestedTags = fields.tags?.value;
    if (Array.isArray(suggestedTags)) setTags(suggestedTags.join(', '));
    const extractedAdditionalFields: Record<string, string> = {};
    for (const field of additionalFieldLabels) {
      const value = fields[field as DocumentAnalysisField]?.value || cloudSuggestions[field]?.value;
      if (typeof value === 'string' && value.trim()) {
        extractedAdditionalFields[field] = value;
      }
    }
    setAdditionalFields((current) => ({ ...extractedAdditionalFields, ...current }));
  }, [pendingAsset]);

  const analysisHint = (field: DocumentAnalysisField) =>
    uncertainFields.has(field) ? (
      <Text style={[styles.uncertainHint, { color: colors.coral }]}>
        {t('details.uncertainHint')}
      </Text>
    ) : unresolvedFields.has(field) &&
      (pendingAsset?.ocrStatus === 'complete' || pendingAsset?.ocrStatus === 'partial') ? (
      <Text style={[styles.unresolvedHint, { color: colors.mutedForeground }]}>
        {t('details.unresolvedHint')}
      </Text>
    ) : null;

  const saveDocument = async () => {
    const trimmedTitle = title.trim();
    if (!canSave || !pendingAsset || !status) return;
    const duplicateProbe: DocumentRecord = {
      id: pendingAsset.documentId ?? `candidate-${Date.now()}`,
      title: trimmedTitle,
      sender: sender.trim(),
      category,
      subcategory: subcategory.trim(),
      documentType,
      documentDate: documentDate.trim(),
      amount: amount.trim() || undefined,
      person,
      status,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    duplicateProbe.fingerprint = documentFingerprint(duplicateProbe);
    const duplicates = findDuplicates(duplicateProbe, activeDocuments);
    if (duplicates.length > 0 && !duplicateApprovedRef.current) {
      const duplicateMessage = t('details.duplicateText', { titles: duplicates.map((item) => item.title).join(', ') });
      if (Platform.OS === 'web') {
        if (window.confirm(`${t('details.duplicateTitle')}\n\n${duplicateMessage}`)) {
          duplicateApprovedRef.current = true;
          void saveDocument();
        }
        return;
      }
      Alert.alert(
        t('details.duplicateTitle'),
        duplicateMessage,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('details.saveAnyway'),
            onPress: () => {
              duplicateApprovedRef.current = true;
              void saveDocument();
            },
          },
        ],
      );
      return;
    }
    setSaving(true);
    setSaveError('');
    const id = pendingAsset.documentId ?? `document-${Date.now()}`;
    let persistentAssets: ReturnType<typeof persistDocumentAssets>;
    try {
      persistentAssets = persistDocumentAssets(pendingAsset, id);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('details.fileSaveError'));
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
      payrollPeriod: payrollPeriod.trim() || undefined,
      dueDate: normalizeDocumentDate(dueDate.trim()),
      amount: amount.trim() || undefined,
       person: profiles.find((profile) => profile.id === selectedProfileIds[0])?.name ?? person,
       profileIds: selectedProfileIds,
      status,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      note: note.trim() || undefined,
       uri: persistentAssets.uri,
      mimeType: pendingAsset.mimeType,
       pdfUri: persistentAssets.pdfUri,
       pageUris: persistentAssets.pageUris,
       originalPageUris: persistentAssets.originalPageUris,
       cleanPageUris: persistentAssets.cleanPageUris,
       blackWhitePageUris: persistentAssets.blackWhitePageUris,
      selectedVariant: pendingAsset.selectedVariant,
      reconstructionDiagnostics: pendingAsset.reconstructionDiagnostics,
      ocrText: pendingAsset.analysis?.text || undefined,
      ocrStatus: pendingAsset.ocrStatus,
      ocrPageResults: pendingAsset.ocrPageResults,
      source: pendingAsset.source,
      analysisUncertainFields: pendingAsset.analysis?.uncertainFields,
      structuredFields: additionalFields,
      analysisConfidenceByField: Object.fromEntries(
        Object.entries(pendingAsset.analysis?.fields ?? {}).map(([field, value]) => [
          field,
          value?.confidence,
        ]),
      ),
      cloudIntelligence: pendingAsset.cloudIntelligence,
      cloudState: pendingAsset.cloudState,
      cloudPipeline: pendingAsset.cloudPipeline,
      intelligence: pendingAsset.analysis
        ? mergeCloudEvidence(analyzeDocumentIntelligence({
            text: pendingAsset.analysis.text,
            structuredFields: {
              title: trimmedTitle,
              sender: sender.trim(),
              category,
              subcategory: subcategory.trim(),
              documentType,
              documentDate: documentDate.trim(),
              dueDate: dueDate.trim(),
              amount: amount.trim(),
              person,
              status,
              tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
              ...additionalFields,
            },
            relatedDocuments: activeDocuments.map((item) => ({
              id: item.id,
              text: item.ocrText,
              title: item.title,
              sender: item.sender,
              date: item.documentDate,
              references: Object.values(item.structuredFields ?? {}),
              amount: item.amount,
              dueDate: item.dueDate,
              status: item.status,
              person: item.person,
            })),
          }), pendingAsset.cloudIntelligence, pendingAsset.cloudIntelligence?.sourceText ?? '')
        : undefined,
      createdAt: new Date().toISOString(),
    };
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await addDocument(document);
      savedRef.current = true;
      clearPendingAsset();
      router.replace('/documents');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('details.fileSaveError'));
      setSaving(false);
    }
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
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]} accessibilityLabel={t('common.back')}>
            <Feather name="arrow-left" size={19} color={colors.navy} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.coral }]}>{t('details.kicker')}</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>{t('document.details')}</Text>
          </View>
          <View style={[styles.step, { backgroundColor: colors.coralSoft }]}><Text style={[styles.stepText, { color: colors.coral }]}>2/2</Text></View>
        </View>

        <View style={[styles.assetBar, { backgroundColor: colors.sage }]}>
          <View style={[styles.assetIcon, { backgroundColor: colors.card }]}><Feather name={pendingAsset?.mimeType?.includes('pdf') ? 'file' : 'image'} size={18} color={colors.sageDeep} /></View>
          <View style={styles.assetCopy}>
            <Text style={[styles.assetName, { color: colors.sageDeep }]} numberOfLines={1}>{pendingAsset?.name ?? t('details.assetSelected')}</Text>
            <Text style={[styles.assetMeta, { color: colors.sageDeep }]}>
              {pendingAsset?.source === 'scanner' ? t('details.scannedMeta',{count:pendingAsset.pageUris?.length ?? 0}) : pendingAsset ? t('details.assetReady') : t('details.noAsset')}
              {pendingAsset?.cloudState
                ? ` · ${t('security.cloud')}: ${pendingAsset.cloudState === 'cloud' ? t('common.open') : pendingAsset.cloudState === 'offline' ? t('explanation.localOnly') : t('details.analysisUnavailable')}`
                : ''}
            </Text>
          </View>
          <Feather name="check-circle" size={20} color={colors.sageDeep} />
        </View>

        {pendingAsset?.cloudPipeline ? (
          <View style={[styles.cloudPipelineCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID="cloud-pipeline-status">
            <Text style={[styles.analysisTitle, { color: colors.navy }]}>
              Cloud pipeline · {pendingAsset.cloudPipeline.finalProvider.replaceAll('_', ' ')}
            </Text>
            <Text style={[styles.analysisText, { color: colors.mutedForeground }]}>
              Local OCR: {pendingAsset.cloudPipeline.localOcr.state}
              {' · '}Document AI OCR: {pendingAsset.cloudPipeline.documentAiOcr.state}
              {' · '}Gemini: {pendingAsset.cloudPipeline.gemini.state}
              {pendingAsset.cloudPipeline.gemini.input
                ? ` (${pendingAsset.cloudPipeline.gemini.input.replaceAll('_', ' ')})`
                : ''}
              {pendingAsset.cloudPipeline.fallbackUsed ? ' · fallback used' : ''}
            </Text>
            {pendingAsset.cloudPipeline.failures.map((failure, index) => (
              <Text key={`${failure.stage}-${index}`} style={[styles.analysisText, { color: colors.coral }]} testID={`cloud-pipeline-failure-${index}`}>
                {failure.stage.replaceAll('_', ' ')} · {failure.reason.replaceAll('_', ' ')}: {failure.message}
              </Text>
            ))}
          </View>
        ) : null}

        {pendingAsset?.ocrStatus ? (
          <View
            style={[
              styles.analysisCard,
              {
                backgroundColor:
                  pendingAsset.ocrStatus === 'complete'
                    ? colors.sage
                    : pendingAsset.ocrStatus === 'partial'
                      ? colors.sun
                    : colors.coralSoft,
              },
            ]}
            testID="ocr-analysis-status"
            accessibilityLabel={
              pendingAsset.ocrStatus === 'partial'
                ? `${t('details.analysisComplete')} · ${ocrProgressLabel}`
                : pendingAsset.ocrStatus === 'complete'
                  ? t('details.analysisComplete')
                  : pendingAsset.ocrStatus === 'empty'
                    ? t('details.noText')
                    : t('details.analysisUnavailable')
            }
          >
            <Feather
              name={
                pendingAsset.ocrStatus === 'complete'
                  ? 'cpu'
                  : pendingAsset.ocrStatus === 'partial'
                    ? 'alert-triangle'
                    : 'alert-circle'
              }
              size={18}
              color={
                pendingAsset.ocrStatus === 'complete'
                  ? colors.sageDeep
                  : pendingAsset.ocrStatus === 'partial'
                    ? colors.accentForeground
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
                        : pendingAsset.ocrStatus === 'partial'
                          ? colors.accentForeground
                        : colors.navy,
                  },
                ]}
                testID={
                  pendingAsset.ocrStatus === 'partial'
                    ? 'ocr-analysis-partial'
                    : undefined
                }
              >
                {pendingAsset.ocrStatus === 'complete'
                  ? t('details.analysisComplete')
                  : pendingAsset.ocrStatus === 'partial'
                    ? `${t('details.analysisComplete')} · ${ocrProgressLabel}`
                  : pendingAsset.ocrStatus === 'empty'
                    ? t('details.noText')
                    : t('details.analysisUnavailable')}
              </Text>
              <Text
                style={[
                  styles.analysisText,
                  {
                    color:
                      pendingAsset.ocrStatus === 'complete'
                        ? colors.sageDeep
                        : pendingAsset.ocrStatus === 'partial'
                          ? colors.accentForeground
                        : colors.mutedForeground,
                  },
                ]}
              >
                {pendingAsset.ocrStatus === 'complete' ||
                pendingAsset.ocrStatus === 'partial'
                  ? t('details.analysisCompleteText')
                  : t('details.analysisManualText')}
              </Text>
            </View>
          </View>
        ) : null}
        {pendingAsset?.ocrPageResults?.length ? (
          <View style={styles.ocrPageStatuses} testID="ocr-page-statuses">
            {pendingAsset.ocrPageResults.map((page) => {
              const label =
                page.status === 'complete'
                  ? t('details.analysisComplete')
                  : page.status === 'empty'
                    ? t('details.noText')
                    : t('details.analysisUnavailable');
              return (
                <View
                  key={page.pageIndex}
                  accessibilityLabel={`${page.pageIndex + 1}/${totalOcrPages} ${label}`}
                  style={[
                    styles.ocrPageStatus,
                    {
                      backgroundColor:
                        page.status === 'complete'
                          ? colors.sage
                          : page.status === 'empty'
                            ? colors.coralSoft
                            : colors.muted,
                    },
                  ]}
                >
                  <Text style={[styles.ocrPageStatusText, { color: colors.navy }]}>
                    {page.pageIndex + 1}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('document.details')}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>{t('details.requiredHint')}</Text>

        <Text style={[styles.label, { color: colors.navy }]}>{t('document.title')}</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder={documentPlaceholder('title', language)} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} testID="details-title-input" />
        {analysisHint('title')}
        <Text style={[styles.titleHint, { color: colors.mutedForeground }]}>
          {t('details.titleHint')}
        </Text>

        <Text style={[styles.label, { color: colors.navy }]}>{t('details.senderInstitution')}</Text>
        <TextInput value={sender} onChangeText={setSender} placeholder={documentPlaceholder('sender', language)} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} testID="details-sender-input" />
        {analysisHint('sender')}

        <Text style={[styles.label, { color: colors.navy }]}>{t('document.category')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
          {categories.map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, { backgroundColor: category === item ? colors.coral : colors.card, borderColor: category === item ? colors.coral : colors.border }]}>
              <Text style={[styles.chipText, { color: category === item ? colors.white : colors.navy }]}>{documentCategoryLabel(item, language)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {analysisHint('category')}

        <Text style={[styles.label, { color: colors.navy }]}>{t('document.subcategory')}</Text>
        <TextInput value={subcategory} onChangeText={setSubcategory} placeholder={documentPlaceholder('subcategory', language)} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} />
        {analysisHint('subcategory')}

        <Text style={[styles.label, { color: colors.navy }]}>{t('document.type')}</Text>
        <View style={styles.wrap}>
          {documentTypes.map((item) => (
            <Pressable key={item} onPress={() => setDocumentType(item)} style={[styles.chip, { backgroundColor: documentType === item ? colors.navy : colors.card, borderColor: documentType === item ? colors.navy : colors.border }]}>
              <Text style={[styles.chipText, { color: documentType === item ? colors.white : colors.navy }]}>{documentTypeLabel(item, language)}</Text>
            </Pressable>
          ))}
        </View>
        {analysisHint('documentType')}

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={[styles.label, { color: colors.navy }]}>{t('details.documentDate')}</Text>
            <TextInput value={documentDate} onChangeText={setDocumentDate} placeholder={documentPlaceholder('date', language)} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} keyboardType="numbers-and-punctuation" />
            {analysisHint('documentDate')}
          </View>
          <View style={styles.column}>
            <Text style={[styles.label, { color: colors.navy }]}>{t('document.dueDate')}</Text>
            <TextInput value={dueDate} onChangeText={setDueDate} placeholder={documentPlaceholder('date', language)} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} keyboardType="numbers-and-punctuation" />
            {analysisHint('dueDate')}
          </View>
        </View>

        {documentType === 'Lohnabrechnung / Gehaltsabrechnung' ? (
          <>
            <Text style={[styles.label, { color: colors.navy }]}>{documentFieldLabel('payrollPeriod', language)}</Text>
            <TextInput
              value={payrollPeriod}
              onChangeText={setPayrollPeriod}
              placeholder={documentPlaceholder('payrollPeriod', language)}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]}
              testID="details-payroll-period-input"
            />
            {analysisHint('payrollPeriod')}
          </>
        ) : null}

        <Text style={[styles.label, { color: colors.navy }]}>{t('document.amount')} <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>({t('details.optional')})</Text></Text>
        <TextInput value={amount} onChangeText={setAmount} placeholder={documentPlaceholder('amount', language)} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} keyboardType="decimal-pad" />
        {analysisHint('amount')}

        {Object.entries(additionalFields).map(([field, value]) => (
          <View key={field}>
            <Text style={[styles.label, { color: colors.navy }]}>
              {documentFieldLabel(field, language)}
            </Text>
            <TextInput
              value={value}
              onChangeText={(nextValue) =>
                setAdditionalFields((current) => ({
                  ...current,
                  [field]: nextValue,
                }))
              }
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  color: colors.navy,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              testID={`details-${field}-input`}
            />
            {analysisHint(field as DocumentAnalysisField)}
          </View>
        ))}

        <Text style={[styles.label, { color: colors.navy }]}>{t('details.person')}</Text>
        <TextInput
          value={person}
          onChangeText={setPerson}
          placeholder={t('details.personPlaceholder')}
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
        {analysisHint('person')}
        <View style={styles.wrap}>
           {profiles.map((item) => (
             <Pressable key={item.id} onPress={() => setSelectedProfileIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} style={[styles.chip, { backgroundColor: selectedProfileIds.includes(item.id) ? colors.sageDeep : colors.card, borderColor: selectedProfileIds.includes(item.id) ? colors.sageDeep : colors.border }]}>
               <Text style={[styles.chipText, { color: selectedProfileIds.includes(item.id) ? colors.white : colors.navy }]}>{item.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.navy }]}>{t('common.status')}</Text>
        <View style={styles.wrap}>
          {statusOptions.map((item) => (
            <Pressable key={item} onPress={() => setStatus(item)} style={[styles.chip, { backgroundColor: status === item ? colors.accent : colors.card, borderColor: status === item ? colors.accent : colors.border }]}>
              <Text style={[styles.chipText, { color: status === item ? colors.accentForeground : colors.navy }]}>{documentStatusLabel(item, language)}</Text>
            </Pressable>
          ))}
        </View>
        {analysisHint('status')}

        <Text style={[styles.label, { color: colors.navy }]}>{t('document.tags')}</Text>
        <TextInput value={tags} onChangeText={setTags} placeholder={documentPlaceholder('tags', language)} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} />
        {analysisHint('tags')}

        <Text style={[styles.label, { color: colors.navy }]}>{t('document.note')}</Text>
        <TextInput value={note} onChangeText={setNote} placeholder={documentPlaceholder('note', language)} placeholderTextColor={colors.mutedForeground} multiline textAlignVertical="top" style={[styles.noteInput, { color: colors.navy, backgroundColor: colors.card, borderColor: colors.border }]} />

        {saveError ? <Text style={[styles.saveError, { color: colors.coral }]}>{saveError}</Text> : null}
        <Pressable onPress={saveDocument} disabled={!canSave} style={({ pressed }) => [styles.saveButton, { backgroundColor: canSave ? colors.coral : colors.muted }, pressed && styles.pressed]} testID="save-details-button">
          <Text style={[styles.saveText, { color: canSave ? colors.white : colors.mutedForeground }]}>{saving ? t('details.saving') : t('details.save')}</Text>
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
  cloudPipelineCard: { borderWidth: 1, borderRadius: 18, padding: 13, marginTop: -14, marginBottom: 22, gap: 5 },
  analysisCopy: { flex: 1, marginLeft: 10 },
  analysisTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  analysisText: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  ocrPageStatuses: { flexDirection: 'row', gap: 7, marginTop: -14, marginBottom: 22 },
  ocrPageStatus: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ocrPageStatusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  sectionTitle: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  sectionSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 17 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 11, marginBottom: 8 },
  input: { minHeight: 51, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, fontSize: 13, fontFamily: 'Inter_400Regular' },
  titleHint: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular', marginTop: 7 },
  uncertainHint: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_600SemiBold', marginTop: 6 },
  unresolvedHint: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular', marginTop: 6 },
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