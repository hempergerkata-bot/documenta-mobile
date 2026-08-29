import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { type RelationshipKind } from '@/utils/documentDomain';
import { useColors } from '@/hooks/useColors';
import { caseClosureSafety, computeCaseProgress, hasConfirmedNearDeadline } from '@/utils/actionEngine';
import { useTranslation } from '@/hooks/useTranslation';
import { caseProgressExplanationLabel, caseProgressStateLabel, missingDataTypeLabel, type TranslationKey } from '@/utils/localization';
import type { TimelineEventType } from '@/utils/archive';

const check = ['vorhanden', 'fehlt', 'angefordert', 'gesendet'] as const;
const missing = ['document', 'data', 'signature', 'proof'] as const;
const caseStatus = ['offen', 'wartet_auf_antwort', 'in_bearbeitung', 'abgeschlossen'] as const;

export default function Detail() {
  const c = useColors();
  const inset = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, date, language } = useTranslation();
  const { activeCases, cases, activeDocuments: docs, profiles, tasks, activeActions, relationships, updateCase, addRelationship, caseTimeline: getCaseTimeline } = useApp();
  const item = activeCases.find((value) => value.id === id) ?? cases.find((value) => value.id === id);
  const [checkTitle, setCheckTitle] = useState('');
  const [missingTitle, setMissingTitle] = useState('');
  const [missingType, setMissingType] = useState<typeof missing[number]>('document');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState<RelationshipKind>('antwort');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'document' | 'action' | 'review' | 'deadline' | 'case' | 'reply'>('all');
  const label = (value: typeof caseStatus[number] | typeof check[number]) =>
    value === 'offen' ? t('common.open')
      : value === 'wartet_auf_antwort' ? t('action.statusWaiting')
        : value === 'in_bearbeitung' ? t('action.statusInProgress')
          : value === 'abgeschlossen' ? t('action.statusCompleted')
            : value === 'vorhanden' ? t('common.done')
              : value === 'fehlt' ? t('common.uncertain')
                : value === 'angefordert' ? t('action.statusInProgress')
                  : t('action.statusCompleted');

  if (!item) return <View style={[s.center, { backgroundColor: c.background }]}><Text style={{ color: c.navy }}>{t('error.notFound')}</Text></View>;

  const linkedDocs = docs.filter((document) => item.documentIds.includes(document.id));
  const conflicts = linkedDocs.reduce((sum, document) => sum + (document.intelligence?.deadlineConflicts.length ?? 0), 0);
  const now = new Date();
  const progress = computeCaseProgress(item.id, activeActions, conflicts, now, item.documentIds);
  const closure = caseClosureSafety(progress, hasConfirmedNearDeadline(activeActions, item.id, item.documentIds, now));
  const timelineTypeGroups: Record<typeof timelineFilter, TimelineEventType[]> = {
    all: [], document: ['document.created', 'document.received', 'document.imported', 'relationship.created'],
    action: ['action.created', 'action.completed', 'action.statusChanged'],
    review: ['review.accepted', 'review.corrected', 'review.rejected'],
    deadline: ['deadline.detected', 'appointment.detected'],
    case: ['case.opened', 'case.statusChanged', 'case.closed'],
    reply: ['reply.draft', 'reply.followUp'],
  };
  const timeline = getCaseTimeline(item.id).filter((event) => !timelineTypeGroups[timelineFilter].length || timelineTypeGroups[timelineFilter].includes(event.eventType));
  const save = (next: Partial<typeof item>, event?: string, eventKind: 'activity' | 'status' = 'activity') => updateCase({
    ...item, ...next, updatedAt: new Date().toISOString(),
    timelineEvents: event ? [...item.timelineEvents, { id: `event-${Date.now()}`, title: event, date: new Date().toISOString(), kind: eventKind }] : item.timelineEvents,
  });
  const toggle = (key: string, list: string[]) => list.includes(key) ? list.filter((value) => value !== key) : [...list, key];

  return <ScrollView style={[s.screen, { backgroundColor: c.background }]} contentContainerStyle={[s.page, { paddingTop: (Platform.OS === 'web' ? 67 : inset.top) + 16 }]}>
    <Pressable accessibilityLabel={t('common.back')} onPress={() => router.back()}><Text style={[s.back, { color: c.coral }]}>← {t('cases.title')}</Text></Pressable>
    <Text style={[s.title, { color: c.navy }]}>{item.title}</Text>
    <View style={[s.chip, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={{ color: c.navy, fontWeight: '700' }}>{progress.progressPercent}% · {caseProgressStateLabel(progress.state, language)}</Text>
      <Text style={{ color: c.mutedForeground }}>{caseProgressExplanationLabel(progress, language)}</Text>
      <Text style={{ color: closure.closable ? c.mutedForeground : c.coral }}>{closure.closable ? t('cases.closureSafe') : `${t('cases.closureBlocked')} ${closure.reasons.join(', ')}`}</Text>
    </View>
    <TextInput accessibilityLabel={t('document.title')} value={item.title} onChangeText={(title) => save({ title }, 'Titel geändert')} style={[s.input, { color: c.navy, borderColor: c.border }]} />
    <TextInput accessibilityLabel={t('common.due')} value={item.dueDate ?? ''} onChangeText={(dueDate) => save({ dueDate: dueDate || undefined }, 'Frist geändert')} placeholder={`${t('common.due')} YYYY-MM-DD`} placeholderTextColor={c.mutedForeground} style={[s.input, { color: c.navy, borderColor: c.border }]} />
    <TextInput accessibilityLabel={t('action.detail')} value={item.note ?? ''} onChangeText={(note) => save({ note }, 'Notiz geändert')} placeholder={t('action.detail')} placeholderTextColor={c.mutedForeground} style={[s.input, { color: c.navy, borderColor: c.border }]} />
    <View style={s.wrap}>{caseStatus.map((value) => <Pressable key={value} accessibilityLabel={label(value)} disabled={value === 'abgeschlossen' && !closure.closable} onPress={() => save({ status: value }, `Status: ${value}`, 'status')} style={[s.chip, { opacity: value === 'abgeschlossen' && !closure.closable ? .45 : 1, backgroundColor: item.status === value ? c.coral : c.card, borderColor: c.border }]}><Text style={{ color: item.status === value ? c.white : c.navy }}>{label(value)}</Text></Pressable>)}</View>
    <Text style={[s.heading, { color: c.navy }]}>{t('search.profile')} & {t('common.documents')}</Text>
    <View style={s.wrap}>{profiles.map((profile) => <Pressable key={profile.id} accessibilityLabel={profile.name} onPress={() => save({ profileIds: toggle(profile.id, item.profileIds) }, 'Profile aktualisiert')} style={[s.chip, { backgroundColor: item.profileIds.includes(profile.id) ? c.sageDeep : c.card, borderColor: c.border }]}><Text style={{ color: item.profileIds.includes(profile.id) ? c.white : c.navy }}>{profile.name}</Text></Pressable>)}</View>
    {docs.map((document) => <Pressable key={document.id} accessibilityLabel={document.title} onPress={() => save({ documentIds: toggle(document.id, item.documentIds) }, 'Dokumente aktualisiert')} style={[s.line, { borderColor: c.border }]}><Text style={{ color: c.navy }}>{item.documentIds.includes(document.id) ? '✓ ' : ''}{document.title}</Text></Pressable>)}
    <Text style={[s.heading, { color: c.navy }]}>{t('common.review')}</Text>
    <View style={s.row}><TextInput accessibilityLabel={t('nav.add')} value={checkTitle} onChangeText={setCheckTitle} placeholder={t('action.ownTask')} placeholderTextColor={c.mutedForeground} style={[s.input, { flex: 1, color: c.navy, borderColor: c.border }]} /><Pressable accessibilityLabel={t('nav.add')} onPress={() => { if (checkTitle.trim()) { save({ checklist: [...item.checklist, { id: `check-${Date.now()}`, title: checkTitle, status: 'fehlt' }] }, 'Checkliste ergänzt'); setCheckTitle(''); } }}><Text style={{ color: c.coral }}>{t('nav.add')}</Text></Pressable></View>
    {item.checklist.map((entry) => <View key={entry.id} style={s.line}><Text style={{ color: c.navy, flex: 1 }}>{entry.title}</Text>{check.map((status) => <Pressable key={status} accessibilityLabel={label(status)} onPress={() => save({ checklist: item.checklist.map((value) => value.id === entry.id ? { ...value, status } : value) }, 'Checklistenstatus geändert')}><Text style={{ color: entry.status === status ? c.coral : c.mutedForeground, fontSize: 10 }}>{label(status)} </Text></Pressable>)}</View>)}
    <Text style={[s.heading, { color: c.navy }]}>{t('common.uncertain')}</Text>
    <View style={s.row}><TextInput accessibilityLabel={t('common.uncertain')} value={missingTitle} onChangeText={setMissingTitle} placeholder={t('common.uncertain')} placeholderTextColor={c.mutedForeground} style={[s.input, { flex: 1, color: c.navy, borderColor: c.border }]} /><Pressable accessibilityLabel={t('nav.add')} onPress={() => { if (missingTitle.trim()) { save({ missingData: [...item.missingData, { id: `missing-${Date.now()}`, title: missingTitle, type: missingType, status: 'fehlt' }] }, 'Anforderung ergänzt'); setMissingTitle(''); } }}><Text style={{ color: c.coral }}>{t('nav.add')}</Text></Pressable></View>
    <View style={s.wrap}>{missing.map((value) => <Pressable key={value} accessibilityLabel={missingDataTypeLabel(value, language)} onPress={() => setMissingType(value)} style={[s.chip, { backgroundColor: missingType === value ? c.coral : c.card, borderColor: c.border }]}><Text style={{ color: missingType === value ? c.white : c.navy }}>{missingDataTypeLabel(value, language)}</Text></Pressable>)}</View>
    {item.missingData.map((entry) => <Text key={entry.id} style={[s.line, { color: c.navy, borderColor: c.border }]}>{entry.title} · {missingDataTypeLabel(entry.type, language)} · {label(entry.status)}</Text>)}
    <Text style={[s.heading, { color: c.navy }]}>{t('document.relationship')} & {t('common.tasks')}</Text>
    <View style={s.wrap}>{docs.map((document) => <Pressable key={`from-${document.id}`} accessibilityLabel={document.title} onPress={() => setFrom(document.id)} style={[s.chip, { backgroundColor: from === document.id ? c.sageDeep : c.card, borderColor: c.border }]}><Text style={{ color: from === document.id ? c.white : c.navy }}>{document.title}</Text></Pressable>)}</View>
    <View style={s.wrap}>{docs.map((document) => <Pressable key={`to-${document.id}`} accessibilityLabel={document.title} onPress={() => setTo(document.id)} style={[s.chip, { backgroundColor: to === document.id ? c.sageDeep : c.card, borderColor: c.border }]}><Text style={{ color: to === document.id ? c.white : c.navy }}>{document.title}</Text></Pressable>)}</View>
    <Pressable accessibilityLabel={t('document.relationship')} onPress={() => { if (from && to && from !== to) addRelationship({ id: `rel-${Date.now()}`, fromDocumentId: from, toDocumentId: to, kind, createdAt: new Date().toISOString() }); }}><Text style={{ color: c.coral }}>{t('document.relationship')}</Text></Pressable>
    {tasks.map((task) => <Pressable key={task.id} accessibilityLabel={task.title} onPress={() => save({ taskIds: toggle(task.id, item.taskIds) }, 'Aufgaben aktualisiert')} style={[s.line, { borderColor: c.border }]}><Text style={{ color: c.navy }}>{item.taskIds.includes(task.id) ? '✓ ' : ''}{task.title}</Text></Pressable>)}
    <Text style={[s.heading, { color: c.navy }]}>{t('timeline.title')}</Text>
    <View style={s.wrap}>{(['all','document','action','review','deadline','case','reply'] as const).map((filter) => <Pressable key={filter} onPress={() => setTimelineFilter(filter)} style={[s.chip, { backgroundColor: timelineFilter === filter ? c.coral : c.card, borderColor: c.border }]}><Text style={{ color: timelineFilter === filter ? c.white : c.navy }}>{filter === 'all' ? t('documents.all') : filter}</Text></Pressable>)}</View>
    {timeline.map((entry) => <View key={entry.id} style={s.line}><Text style={{ color: c.navy }}>{t(entry.titleKey as TranslationKey)}{entry.metadata.title ? ` · ${entry.metadata.title}` : ''}</Text><Text style={{ color: c.mutedForeground, fontSize: 11 }}>{date(entry.timestamp)}{entry.documentId ? ` · ${docs.find((document) => document.id === entry.documentId)?.title ?? entry.documentId}` : ''}</Text></View>)}
  </ScrollView>;
}

const s = StyleSheet.create({ screen: { flex: 1 }, page: { padding: 20, paddingBottom: 45, gap: 10 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, back: { fontFamily: 'Inter_700Bold' }, title: { fontSize: 27, fontFamily: 'Inter_700Bold' }, heading: { fontSize: 17, fontFamily: 'Inter_700Bold', marginTop: 12 }, input: { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: 'Inter_400Regular' }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, chip: { borderWidth: 1, borderRadius: 9, padding: 7 }, line: { borderBottomWidth: 1, paddingVertical: 10 } });