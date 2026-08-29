import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, type DocumentRecord } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { dueSoon } from '@/utils/documentDomain';
import { eligibleDeadlines, isMainAmountEligible } from '@/utils/documentIntelligence';

function Empty({ text, color }: { text: string; color: string }) { return <Text style={[s.empty, { color }]}>{text}</Text>; }
function Doc({ item, c }: { item: DocumentRecord; c: ReturnType<typeof useColors> }) {
  const { date, currency } = useTranslation();
  return <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => router.push({ pathname: '/document/[id]', params: { id: item.id } })} style={[s.row, { backgroundColor: c.card, borderColor: c.border }]}><View style={[s.icon, { backgroundColor: c.coralSoft }]}><Feather name="file-text" size={17} color={c.coral} /></View><View style={{ flex: 1 }}><Text style={[s.strong, { color: c.navy }]} numberOfLines={1}>{item.title}</Text><Text style={[s.small, { color: c.mutedForeground }]}>{item.sender} · {date(item.documentDate)}</Text></View>{item.amount ? <Text style={[s.small, { color: c.navy }]}>{currency(item.amount)}</Text> : null}</Pressable>;
}
export default function DashboardScreen() {
  const c = useColors(); const inset = useSafeAreaInsets(); const { t, number } = useTranslation();
  const { activeDocuments: docs, activeCases: cases, activeTasks: tasks, activeActions, demoEnabled } = useApp();
  const newDocs = docs.filter(x => x.status === 'Neu');
  const intelligenceActionable = docs.filter(x => x.intelligence?.reviewRequired || x.intelligence?.actions.length);
  const actionableCases = cases.filter(x => x.status !== 'abgeschlossen' && (x.missingData.length > 0 || x.checklist.some(i => i.status !== 'vorhanden')));
  const deadlines = [...docs.filter(x => dueSoon(x.dueDate) || (x.intelligence ? eligibleDeadlines(x.intelligence).some(d => dueSoon(d.value)) : false)), ...cases.filter(x => dueSoon(x.dueDate))];
  const payable = docs.filter(x => x.status === 'Zu bezahlen' || (x.intelligence ? isMainAmountEligible(x.intelligence) && x.intelligence.amounts.main.role === 'payable' : false));
  const unresolved = cases.filter(x => x.status !== 'abgeschlossen');
  const recent = [...docs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const sections: [string, string, (DocumentRecord | { id: string; title: string; detail: string })[]][] = [
    [t('dashboard.newDocuments'), t('dashboard.newDocumentsSubtitle'), newDocs],
    [t('dashboard.needsAction'), t('dashboard.needsActionSubtitle'), [...intelligenceActionable, ...actionableCases.map(x => ({ id: x.id, title: x.title, detail: `${number(x.missingData.length)} ${t('common.unknown')}` }))]],
    [t('dashboard.upcomingDeadlines'), t('dashboard.upcomingDeadlinesSubtitle'), deadlines.map(x => 'sender' in x ? x : ({ id: x.id, title: x.title, detail: x.dueDate ?? '' }))],
    [t('dashboard.payable'), t('dashboard.payableSubtitle'), payable],
    [t('dashboard.unresolvedCases'), t('dashboard.unresolvedCasesSubtitle'), unresolved.map(x => ({ id: x.id, title: x.title, detail: x.status.replaceAll('_', ' ') }))],
  ];
  const actions = [
    ['camera', t('dashboard.scan'), '/add'], ['upload', t('dashboard.import'), '/add'], ['check-square', t('dashboard.actions'), '/tasks'], ['cpu', t('dashboard.assistant'), '/assistant'], ['search', t('nav.search'), '/search'],
  ] as const;
  return <ScrollView style={[s.screen, { backgroundColor: c.background }]} contentContainerStyle={[s.page, { paddingTop: (Platform.OS === 'web' ? 67 : inset.top) + 18 }]}><View style={s.header}><View><Text style={[s.kicker, { color: c.coral }]}>{t('dashboard.kicker')}</Text><Text style={[s.title, { color: c.navy }]}>{t('dashboard.title')}</Text><Text style={[s.small, { color: c.mutedForeground }]}>{t('dashboard.subtitle')}</Text></View>{demoEnabled ? <Text style={[s.demo, { color: c.coral, borderColor: c.coral }]}>DEMO</Text> : null}</View>
    <View style={s.actions}>{actions.map(([icon, label, path]) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(path)} style={[s.action, { backgroundColor: c.card, borderColor: c.border }]}><Feather name={icon as never} size={17} color={c.coral} /><Text style={[s.small, { color: c.navy }]}>{label}</Text></Pressable>)}</View>
    {sections.map(([title, hint, items]) => <View key={title}><Text style={[s.section, { color: c.navy }]}>{title}</Text><Text style={[s.small, { color: c.mutedForeground, marginBottom: 8 }]}>{hint}</Text>{items.length ? items.slice(0, 3).map(item => 'sender' in item ? <Doc key={item.id} item={item} c={c} /> : <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => router.push({ pathname: '/cases/[id]', params: { id: item.id } })} style={[s.row, { backgroundColor: c.card, borderColor: c.border }]}><Text style={[s.strong, { color: c.navy, flex: 1 }]}>{item.title}</Text><Text style={[s.small, { color: c.mutedForeground }]}>{item.detail}</Text></Pressable>) : <Empty text={t('dashboard.noItems')} color={c.mutedForeground} />}</View>)}
    <View><Text style={[s.section, { color: c.navy }]}>{t('dashboard.newDocuments')}</Text>{recent.length ? recent.map(item => <Doc key={item.id} item={item} c={c} />) : <Empty text={t('documents.emptyTitle')} color={c.mutedForeground} />}</View>
    {activeActions.filter(x => !['completed', 'cancelled', 'rejected'].includes(x.status)).length ? <Pressable accessibilityRole="button" accessibilityLabel={t('dashboard.actions')} onPress={() => router.push('/tasks')}><Text style={[s.small, { color: c.coral }]}>{number(activeActions.filter(x => !['completed', 'cancelled', 'rejected'].includes(x.status)).length)} {t('action.open')} · {number(activeActions.filter(x => x.status === 'needs_review').length)} {t('action.toReview')}</Text></Pressable> : tasks.filter(x => !x.completed).length ? <Text style={[s.small, { color: c.mutedForeground }]}>{number(tasks.filter(x => !x.completed).length)} {t('common.tasks')}</Text> : null}
  </ScrollView>;
}
const s = StyleSheet.create({ screen: { flex: 1 }, page: { padding: 20, paddingBottom: 110, gap: 22 }, header: { flexDirection: 'row', justifyContent: 'space-between' }, kicker: { fontFamily: 'Inter_700Bold', letterSpacing: 2, fontSize: 11 }, title: { fontFamily: 'Inter_700Bold', fontSize: 29 }, small: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 }, strong: { fontFamily: 'Inter_700Bold', fontSize: 13 }, demo: { borderWidth: 1, borderRadius: 8, padding: 6, fontFamily: 'Inter_700Bold', fontSize: 10 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, action: { width: '31%', minHeight: 66, borderWidth: 1, borderRadius: 14, padding: 10, gap: 6 }, section: { fontFamily: 'Inter_700Bold', fontSize: 18, marginBottom: 2 }, row: { borderWidth: 1, borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 }, icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, empty: { fontFamily: 'Inter_400Regular', fontSize: 12, paddingVertical: 12 } });