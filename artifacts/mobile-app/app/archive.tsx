import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, type DocumentRecord } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { applyArchiveReview, filterArchiveDocuments, isBulkAcceptable, sortArchiveDocuments } from '@/utils/archive';
import { documentCategoryLabel, documentStatusLabel, documentTypeLabel } from '@/utils/localization';

type YearFilter = number | 'all' | 'last3' | 'unknown';

export default function Archive() {
  const c = useColors();
  const inset = useSafeAreaInsets();
  const { t, number, date, language, backSymbol, direction } = useTranslation();
  const { documents, archiveIndex, profiles, activeCases, activeActions, archiveDocument, restoreDocument, trashDocument, permanentlyDeleteDocument, updateDocument, security } = useApp();
  const [year, setYear] = useState<YearFilter>('all');
  const [month, setMonth] = useState<number>();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [profileId, setProfileId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [status, setStatus] = useState('');
  const [actionState, setActionState] = useState('');
  const [reviewState, setReviewState] = useState<'' | 'needs_review' | 'reviewed'>('');
  const [deadlineYear, setDeadlineYear] = useState<number>();
  const [yearEdits, setYearEdits] = useState<Record<string, string>>({});
  const archiveDocuments = documents.filter((document) => document.lifecycle !== 'papierkorb');
  const trash = documents.filter((document) => document.lifecycle === 'papierkorb');
  const categories = [...new Set(archiveDocuments.map((document) => document.category).filter(Boolean))].sort();
  const types = [...new Set(archiveDocuments.map((document) => document.documentType).filter(Boolean))].sort();
  const statuses = [...new Set(archiveDocuments.map((document) => document.status))].sort();
  const deadlineYears = [...new Set([...archiveDocuments.map((document) => document.dueDate?.slice(0, 4)), ...activeActions.map((action) => action.dueDate?.slice(0, 4))].filter((value): value is string => !!value && /^\d{4}$/.test(value)).map(Number))].sort((a, b) => b - a);
  const baseYear = year === 'last3' ? 'all' : year;
  const filtered = useMemo(() => {
    const result = filterArchiveDocuments(archiveDocuments, { year: baseYear, month, category: category || undefined, documentType: documentType || undefined, profileId: profileId || undefined, caseId: caseId || undefined, status: status || undefined, actionState: actionState || undefined, reviewState: reviewState || undefined, deadlineYear, query }, activeCases, activeActions);
    const selected = year === 'last3' ? result.filter((document) => document.archiveYear && archiveIndex.lastThreeYears.includes(document.archiveYear)) : result;
    return sortArchiveDocuments(selected);
  }, [archiveDocuments, baseYear, month, category, documentType, profileId, caseId, status, actionState, reviewState, deadlineYear, query, activeCases, activeActions, year, archiveIndex.lastThreeYears]);
  const reviewQueue = archiveDocuments.filter((document) => !isBulkAcceptable(document) && document.archiveReviewStatus !== 'later');
  const safeBulk = archiveDocuments.filter(isBulkAcceptable).filter((document) => document.archiveReviewStatus !== 'accepted');
  const chooseYear = (value: YearFilter) => { setYear(value); setMonth(undefined); };
  const markReview = (document: DocumentRecord, reviewStatus: DocumentRecord['archiveReviewStatus'], archiveYear?: number) => {
    updateDocument(applyArchiveReview(document, { archiveYear, reviewStatus, at: new Date().toISOString(), reason: archiveYear ? 'corrected' : 'accepted' }));
  };
  const duplicateChoice = (document: DocumentRecord, duplicateDecision: DocumentRecord['duplicateDecision']) => {
    updateDocument(applyArchiveReview(document, { duplicateDecision, reviewStatus: duplicateDecision === 'unknown' ? 'unknown' : 'corrected', at: new Date().toISOString() }));
  };
  const acceptAndArchive = (document: DocumentRecord) => {
    if (!document.archiveYear) return;
    markReview(document, 'accepted', document.archiveYear);
    archiveDocument(document.id);
  };
  const actionLabel = (value: string) => ({
    suggested: t('action.statusSuggested'), needs_review: t('action.statusNeedsReview'), confirmed: t('action.statusConfirmed'),
    in_progress: t('action.statusInProgress'), waiting: t('action.statusWaiting'), completed: t('action.statusCompleted'),
    cancelled: t('action.statusCancelled'), rejected: t('action.statusRejected'), archived: t('action.statusArchived'),
  }[value] ?? value);
  const confirmTrash = (document: DocumentRecord) => Alert.alert(t('archive.moveTitle'), t('archive.moveText'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('archive.move'), style: 'destructive', onPress: () => trashDocument(document.id) }]);
  const confirmDelete = (document: DocumentRecord) => Alert.alert(t('archive.deleteTitle'), t('archive.deleteText'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('archive.deleteForever'), style: 'destructive', onPress: () => permanentlyDeleteDocument(document.id) }]);
  const chip = (key: string, label: string, selected: boolean, onPress: () => void) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} style={[s.chip, { backgroundColor: selected ? c.coral : c.card, borderColor: selected ? c.coral : c.border }]}><Text style={[s.chipText, { color: selected ? c.white : c.navy }]}>{label}</Text></Pressable>;
  const archiveRow = (document: DocumentRecord) => <Pressable key={document.id} accessibilityRole="button" accessibilityLabel={document.title} onPress={() => router.push({ pathname: '/document/[id]', params: { id: document.id } })} style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
    <View style={s.space}><View style={{ flex: 1 }}><Text style={[s.name, { color: c.navy }]}>{document.title}</Text><Text style={[s.hint, { color: c.mutedForeground }]}>{document.sender} · {document.archiveYear ?? t('archive.unknownYear')} · {document.documentDate ? date(document.documentDate) : t('common.unknown')}</Text></View><View style={[s.badge, { backgroundColor: document.archiveDateStatus === 'confirmed' ? c.sage : c.coralSoft }]}><Text style={[s.badgeText, { color: document.archiveDateStatus === 'confirmed' ? c.sageDeep : c.coral }]}>{document.archiveYearConfidence ?? 'unknown'}</Text></View></View>
    <View style={s.actions}><Pressable onPress={(event) => { event.stopPropagation(); document.lifecycle === 'archiviert' ? restoreDocument(document.id) : archiveDocument(document.id); }}><Text style={{ color: c.coral }}>{document.lifecycle === 'archiviert' ? t('document.restore') : t('document.archive')}</Text></Pressable><Pressable onPress={(event) => { event.stopPropagation(); confirmTrash(document); }}><Text style={{ color: c.mutedForeground }}>{t('archive.moveToTrash')}</Text></Pressable></View>
  </Pressable>;

  return <ScrollView style={[s.screen, { backgroundColor: c.background, direction }]} contentContainerStyle={[s.page, { paddingTop: (Platform.OS === 'web' ? 67 : inset.top) + 16 }]}>
    <Pressable accessibilityLabel={t('common.back')} onPress={() => router.back()}><Text style={[s.back, { color: c.coral }]}>{backSymbol} {t('common.back')}</Text></Pressable>
    <Text style={[s.title, { color: c.navy }]}>{t('archive.title')}</Text>
    <Text style={[s.hint, { color: c.mutedForeground }]}>{t('archive.subtitle')}</Text>
    <View style={[s.summary, { backgroundColor: c.navy }]}><View><Text style={s.summaryKicker}>{t('archive.yearOverview').toUpperCase()}</Text><Text style={s.summaryNumber}>{number(archiveIndex.total)}</Text><Text style={s.summaryText}>{t('common.documents')}</Text></View><View><Text style={s.summaryYear}>{archiveIndex.currentYear}</Text><Text style={s.summaryText}>{t('archive.currentYear')}</Text></View></View>
    <View style={s.wrap}>
      {chip('all', t('archive.allYears'), year === 'all', () => chooseYear('all'))}
      {chip('current', t('archive.currentYear'), year === archiveIndex.currentYear, () => chooseYear(archiveIndex.currentYear))}
      {chip('previous', t('archive.previousYear'), year === archiveIndex.previousYear, () => chooseYear(archiveIndex.previousYear))}
      {chip('last3', t('archive.lastThreeYears'), year === 'last3', () => chooseYear('last3'))}
      {chip('unknown', `${t('archive.unknownYear')} (${number(archiveIndex.unknown)})`, year === 'unknown', () => chooseYear('unknown'))}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.yearCards}>{archiveIndex.years.map((item) => <Pressable key={item.year} onPress={() => chooseYear(item.year)} style={[s.yearCard, { backgroundColor: year === item.year ? c.sage : c.card, borderColor: c.border }]}><Text style={[s.yearNumber, { color: c.navy }]}>{item.year}</Text><Text style={[s.hint, { color: c.mutedForeground }]}>{t('archive.documentsCount', { count: number(item.count) })}</Text></Pressable>)}</ScrollView>
    {typeof year === 'number' ? <View style={s.wrap}>{archiveIndex.years.find((item) => item.year === year)?.months.map((item) => chip(`month-${item.month}`, `${t('archive.month', { month: number(item.month) })} (${number(item.count)})`, month === item.month, () => setMonth((current) => current === item.month ? undefined : item.month)))}</View> : null}
    <TextInput accessibilityLabel={t('archive.searchPlaceholder')} value={query} onChangeText={setQuery} placeholder={t('archive.searchPlaceholder')} placeholderTextColor={c.mutedForeground} style={[s.input, { color: c.navy, backgroundColor: c.card, borderColor: c.border }]} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrap}>{chip('category-all', t('search.category'), !category, () => setCategory(''))}{categories.map((item) => chip(`category-${item}`, documentCategoryLabel(item, language), category === item, () => setCategory(category === item ? '' : item)))}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrap}>{chip('type-all', t('search.type'), !documentType, () => setDocumentType(''))}{types.map((item) => chip(`type-${item}`, documentTypeLabel(item, language), documentType === item, () => setDocumentType(documentType === item ? '' : item)))}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrap}>{chip('profile-all', t('search.profile'), !profileId, () => setProfileId(''))}{profiles.map((item) => chip(`profile-${item.id}`, item.name, profileId === item.id, () => setProfileId(profileId === item.id ? '' : item.id)))}</ScrollView>
    {activeCases.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrap}>{chip('case-all', t('common.cases'), !caseId, () => setCaseId(''))}{activeCases.map((item) => chip(`case-${item.id}`, item.title, caseId === item.id, () => setCaseId(caseId === item.id ? '' : item.id)))}</ScrollView> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrap}>{chip('status-all', t('common.status'), !status, () => setStatus(''))}{statuses.map((item) => chip(`status-${item}`, documentStatusLabel(item, language), status === item, () => setStatus(status === item ? '' : item)))}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrap}>{chip('action-all', t('dashboard.actions'), !actionState, () => setActionState(''))}{[...new Set(activeActions.map((action) => action.status))].map((item) => chip(`action-${item}`, actionLabel(item), actionState === item, () => setActionState(actionState === item ? '' : item)))}</ScrollView>
    <View style={s.wrap}>{chip('review-all', t('common.review'), !reviewState, () => setReviewState(''))}{chip('review-needed', t('review.needsReview'), reviewState === 'needs_review', () => setReviewState(reviewState === 'needs_review' ? '' : 'needs_review'))}{chip('reviewed', t('review.accepted'), reviewState === 'reviewed', () => setReviewState(reviewState === 'reviewed' ? '' : 'reviewed'))}</View>
    {deadlineYears.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrap}>{chip('deadline-all', t('document.deadline'), !deadlineYear, () => setDeadlineYear(undefined))}{deadlineYears.map((item) => chip(`deadline-${item}`, String(item), deadlineYear === item, () => setDeadlineYear(deadlineYear === item ? undefined : item)))}</ScrollView> : null}
    <Text style={[s.heading, { color: c.navy }]}>{t('common.documents')} · {number(filtered.length)}</Text>
    {filtered.length ? filtered.map(archiveRow) : <Text style={[s.hint, { color: c.mutedForeground }]}>{t('archive.noResults')}</Text>}

    <View style={[s.reviewSection, { borderColor: c.border }]}>
      <Text style={[s.heading, { color: c.navy }]}>{t('archive.reviewQueue')} · {number(reviewQueue.length)}</Text>
      <Text style={[s.hint, { color: c.mutedForeground }]}>{t('archive.reviewHint')}</Text>
      <Pressable disabled={!safeBulk.length} onPress={() => safeBulk.forEach(acceptAndArchive)} style={[s.primary, { backgroundColor: c.coral, opacity: safeBulk.length ? 1 : .45 }]}><Text style={s.primaryText}>{t('archive.bulkAccept')} ({number(safeBulk.length)})</Text></Pressable>
      {!safeBulk.length ? <Text style={[s.hint, { color: c.mutedForeground }]}>{t('archive.bulkBlocked')}</Text> : null}
      {reviewQueue.map((document) => <View key={`review-${document.id}`} style={[s.reviewCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[s.name, { color: c.navy }]}>{document.title}</Text>
        <Text style={[s.hint, { color: c.mutedForeground }]}>{documentTypeLabel(document.documentType, language)} · {document.sender || t('common.unknown')} · {document.person || profiles.find((profile) => document.profileIds?.includes(profile.id))?.name || t('common.unknown')}</Text>
        <Text style={[s.reviewValue, { color: c.navy }]}>{t('document.date')}: {document.documentDate || t('common.unknown')} · {t('archive.archiveYear')}: {document.archiveYear ?? t('common.unknown')}</Text>
        <Text style={[s.hint, { color: c.mutedForeground }]}>{t('search.category')}: {documentCategoryLabel(document.category, language)} · {t('common.cases')}: {activeCases.filter((item) => item.documentIds.includes(document.id)).map((item) => item.title).join(', ') || t('common.none')}</Text>
        <Text style={[s.hint, { color: c.mutedForeground }]}>{t('common.priority')}: {document.archiveYearConfidence ?? 'unknown'} · {document.archiveYearSource === 'manual' ? t('archive.manual') : t('archive.automatic')}</Text>
        {document.duplicateCandidateStatus === 'warning' || document.duplicateCandidateStatus === 'confirmed' ? <><Text style={[s.warning, { color: c.coral }]}>{t('archive.duplicateWarning')}</Text><View style={s.wrap}>{chip(`same-${document.id}`, t('archive.sameDocument'), document.duplicateDecision === 'same', () => duplicateChoice(document, 'same'))}{chip(`separate-${document.id}`, t('archive.separateDocument'), document.duplicateDecision === 'separate', () => duplicateChoice(document, 'separate'))}{chip(`unknown-${document.id}`, t('archive.dontKnow'), document.duplicateDecision === 'unknown', () => duplicateChoice(document, 'unknown'))}</View></> : null}
        <View style={s.row}><TextInput value={yearEdits[document.id] ?? String(document.archiveYear ?? '')} onChangeText={(value) => setYearEdits((current) => ({ ...current, [document.id]: value }))} keyboardType="number-pad" placeholder="YYYY" placeholderTextColor={c.mutedForeground} style={[s.yearInput, { color: c.navy, borderColor: c.border }]} />{document.archiveYear ? <Pressable onPress={() => acceptAndArchive(document)}><Text style={{ color: c.sageDeep }}>{t('common.accept')}</Text></Pressable> : null}<Pressable onPress={() => { const correctedYear = Number(yearEdits[document.id] ?? document.archiveYear); if (correctedYear >= 1900 && correctedYear <= archiveIndex.currentYear + 1) markReview(document, 'corrected', correctedYear); }}><Text style={{ color: c.coral }}>{t('common.edit')}</Text></Pressable><Pressable onPress={() => markReview(document, 'unknown')}><Text style={{ color: c.mutedForeground }}>{t('archive.dontKnow')}</Text></Pressable><Pressable onPress={() => markReview(document, 'later')}><Text style={{ color: c.mutedForeground }}>{t('archive.later')}</Text></Pressable></View>
      </View>)}
    </View>

    <Text style={[s.heading, { color: c.navy }]}>{t('document.trash')}</Text>
    {trash.length ? trash.map((document) => <View key={document.id} style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}><Text style={[s.name, { color: c.navy }]}>{document.title}</Text><View style={s.actions}><Pressable onPress={() => restoreDocument(document.id)}><Text style={{ color: c.coral }}>{t('document.restore')}</Text></Pressable><Pressable onPress={() => confirmDelete(document)}><Text style={{ color: c.coral }}>{t('archive.deleteForever')}</Text></Pressable></View></View>) : <Text style={[s.hint, { color: c.mutedForeground }]}>{t('archive.trashEmpty')}</Text>}
    <Text style={[s.hint, { color: c.mutedForeground }]}>{t('archive.retention', { policy: security.retentionPolicy, days: number(security.retentionDays) })}</Text>
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, page: { padding: 20, paddingBottom: 50, gap: 12 }, back: { fontFamily: 'Inter_700Bold' }, title: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 9 }, hint: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  summary: { borderRadius: 20, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, summaryKicker: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 }, summaryNumber: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 34 }, summaryYear: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 22, textAlign: 'right' }, summaryText: { color: '#ffffff', opacity: .75, fontFamily: 'Inter_400Regular', fontSize: 11 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }, chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  yearCards: { gap: 9 }, yearCard: { minWidth: 118, borderWidth: 1, borderRadius: 16, padding: 13 }, yearNumber: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  input: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, minHeight: 46, fontFamily: 'Inter_400Regular' }, card: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 10 },
  name: { fontFamily: 'Inter_700Bold' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, space: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, badge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 }, badgeText: { fontFamily: 'Inter_700Bold', fontSize: 9 },
  reviewSection: { borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 10 }, primary: { minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, primaryText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  reviewCard: { borderWidth: 1, borderRadius: 15, padding: 13, gap: 8 }, reviewValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12 }, warning: { fontFamily: 'Inter_700Bold', fontSize: 11 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, yearInput: { width: 84, minHeight: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontFamily: 'Inter_600SemiBold' },
});