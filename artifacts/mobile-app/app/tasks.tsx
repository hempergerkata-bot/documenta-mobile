import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { createCustomAction, type ActionPriority, type ActionStatus } from '@/utils/actionEngine';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { confidenceLabel, priorityLabel as localizedPriorityLabel } from '@/utils/localization';

const priorityColors: Record<ActionPriority, string> = { low: '#64748B', normal: '#2563EB', high: '#EA580C', urgent: '#DC2626' };

export default function TaskCenterScreen() {
  const router = useRouter();
  const c = useColors();
  const { t, date, language } = useTranslation();
  const colors = { background: c.background, card: c.card, text: c.navy, muted: c.mutedForeground, border: c.border, tint: c.coral };
  const { activeActions, activeTasks, toggleTask, addAction, reminders, followUps, replyDrafts, calendarCandidates } = useApp();
  const [filter, setFilter] = useState<'all' | ActionStatus>('all');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<ActionPriority>('normal');
  const [showCreate, setShowCreate] = useState(false);
  const visible = useMemo(() => activeActions.filter((item) => filter === 'all' || item.status === filter), [activeActions, filter]);
  const reviewCount = activeActions.filter((item) => item.status === 'needs_review').length;
  const filters: Array<{ label: string; value: 'all' | ActionStatus }> = [
    { label: t('documents.all'), value: 'all' }, { label: t('action.statusSuggested'), value: 'suggested' }, { label: t('action.statusNeedsReview'), value: 'needs_review' },
    { label: t('action.statusInProgress'), value: 'in_progress' }, { label: t('action.statusWaiting'), value: 'waiting' }, { label: t('action.statusCompleted'), value: 'completed' },
  ];
  const actionStatus = (status: ActionStatus) => t(({ suggested: 'action.statusSuggested', needs_review: 'action.statusNeedsReview', confirmed: 'action.statusConfirmed', in_progress: 'action.statusInProgress', waiting: 'action.statusWaiting', completed: 'action.statusCompleted', cancelled: 'action.statusCancelled', rejected: 'action.statusRejected', archived: 'action.statusArchived' } as const)[status]);
  const priorityLabel = (value: ActionPriority) => localizedPriorityLabel(value, language);

  const create = () => {
    if (!title.trim()) return;
    addAction(createCustomAction({ title, description: '', priority, dueDate: dueDate || undefined }));
    setTitle(''); setDueDate(''); setShowCreate(false);
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View><Text style={[styles.eyebrow, { color: colors.tint }]}>{t('action.center')}</Text><Text style={[styles.title, { color: colors.text }]}>{t('action.title')}</Text></View>
        <Pressable accessibilityLabel={t('automation.title')} onPress={() => router.push('/automation')} style={[styles.iconButton, { backgroundColor: colors.card }]}><MaterialCommunityIcons name="robot-outline" size={22} color={colors.tint} /></Pressable>
      </View>
      <View style={[styles.summary, { backgroundColor: colors.card }]}>
        <View><Text style={[styles.metric, { color: colors.text }]}>{activeActions.filter((a) => !['completed','cancelled','rejected'].includes(a.status)).length}</Text><Text style={[styles.caption, { color: colors.muted }]}>{t('action.open')}</Text></View>
        <View><Text style={[styles.metric, { color: reviewCount ? '#EA580C' : colors.text }]}>{reviewCount}</Text><Text style={[styles.caption, { color: colors.muted }]}>{t('action.toReview')}</Text></View>
        <View><Text style={[styles.metric, { color: colors.text }]}>{reminders.length + followUps.length}</Text><Text style={[styles.caption, { color: colors.muted }]}>{t('action.reminders')}</Text></View>
        <View><Text style={[styles.metric, { color: colors.text }]}>{replyDrafts.length + calendarCandidates.length}</Text><Text style={[styles.caption, { color: colors.muted }]}>{t('action.drafts')}</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => <Pressable key={item.value} accessibilityLabel={item.label} onPress={() => setFilter(item.value)} style={[styles.filter, { backgroundColor: filter === item.value ? colors.tint : colors.card }]}><Text style={{ color: filter === item.value ? '#fff' : colors.text, fontWeight: '700' }}>{item.label}</Text></Pressable>)}
      </ScrollView>
      {visible.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.card }]}><MaterialCommunityIcons name="check-circle-outline" size={38} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>{t('action.emptyTitle')}</Text><Text style={[styles.caption, { color: colors.muted }]}>{t('action.emptyText')}</Text></View> :
        visible.map((action) => <Pressable key={action.id} accessibilityLabel={`${action.title}, ${actionStatus(action.status)}`} onPress={() => router.push(`/action/${action.id}`)} style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardTop}><View style={[styles.priorityDot, { backgroundColor: priorityColors[action.priority] }]} /><Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{action.title}</Text><MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} /></View>
          <View style={styles.meta}><Text style={[styles.badge, { color: action.status === 'needs_review' ? '#C2410C' : colors.tint, backgroundColor: action.status === 'needs_review' ? '#FFEDD5' : colors.tint + '15' }]}>{actionStatus(action.status)}</Text>{action.dueDate && <Text style={[styles.caption, { color: colors.muted }]}>{t('common.due')} {date(action.dueDate)}</Text>}<Text style={[styles.caption, { color: colors.muted }]}>{confidenceLabel(action.confidence, language)}</Text></View>
          {!!action.evidence.length && <Text style={[styles.evidence, { color: colors.muted }]} numberOfLines={2}>„{action.evidence[0].text}“</Text>}
        </Pressable>)}
      {showCreate ? <View style={[styles.form, { backgroundColor: colors.card }]}>
        <Text style={[styles.formTitle, { color: colors.text }]}>{t('action.ownTask')}</Text>
        <TextInput accessibilityLabel={t('document.title')} placeholder={t('document.title')} placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
        <TextInput accessibilityLabel={t('common.due')} placeholder={`${t('common.due')} (YYYY-MM-DD)`} placeholderTextColor={colors.muted} value={dueDate} onChangeText={setDueDate} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
        <View style={styles.priorityRow}>{(['low','normal','high','urgent'] as ActionPriority[]).map((p) => <Pressable key={p} accessibilityLabel={priorityLabel(p)} onPress={() => setPriority(p)} style={[styles.priorityChoice, { borderColor: priority === p ? priorityColors[p] : colors.border }]}><Text style={{ color: priorityColors[p], fontWeight: '700' }}>{priorityLabel(p)}</Text></Pressable>)}</View>
        <View style={styles.actions}><Pressable accessibilityLabel={t('common.cancel')} onPress={() => setShowCreate(false)}><Text style={{ color: colors.muted }}>{t('common.cancel')}</Text></Pressable><Pressable accessibilityLabel={t('common.save')} onPress={create} style={[styles.primary, { backgroundColor: colors.tint }]}><Text style={styles.primaryText}>{t('common.save')}</Text></Pressable></View>
      </View> : <Pressable accessibilityLabel={t('action.ownTask')} onPress={() => setShowCreate(true)} style={[styles.createButton, { backgroundColor: colors.tint }]}><MaterialCommunityIcons name="plus" size={20} color="#fff" /><Text style={styles.primaryText}>{t('action.ownTask')}</Text></Pressable>}
      {activeTasks.length > 0 && <View style={[styles.form, { backgroundColor: colors.card }]}>
        <Text style={[styles.formTitle, { color: colors.text }]}>{t('common.tasks')}</Text>
        {activeTasks.map((task) => <Pressable key={task.id} onPress={() => toggleTask(task.id)} style={[styles.legacyRow, { borderColor: colors.border }]}>
          <MaterialCommunityIcons name={task.completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={22} color={task.completed ? '#15803D' : colors.muted} />
          <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.text, textDecorationLine: task.completed ? 'line-through' : 'none' }]}>{task.title}</Text><Text style={[styles.caption, { color: colors.muted }]}>{task.dueDate ? `${t('common.due')} ${date(task.dueDate)}` : t('common.none')} · {t('common.priority')} {localizedPriorityLabel(task.priority, language)}</Text></View>
        </Pressable>)}
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:{flex:1}, content:{padding:20,paddingBottom:48,gap:14}, header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, eyebrow:{fontSize:12,fontWeight:'800',letterSpacing:1.2}, title:{fontSize:27,fontWeight:'800',marginTop:4,maxWidth:290}, iconButton:{width:46,height:46,borderRadius:16,alignItems:'center',justifyContent:'center'}, summary:{padding:16,borderRadius:20,flexDirection:'row',justifyContent:'space-between'}, metric:{fontSize:22,fontWeight:'800',textAlign:'center'}, caption:{fontSize:12,lineHeight:17}, filters:{gap:8}, filter:{paddingHorizontal:14,paddingVertical:9,borderRadius:99}, empty:{padding:28,borderRadius:20,alignItems:'center',gap:8}, emptyTitle:{fontSize:17,fontWeight:'800',textAlign:'center'}, card:{padding:16,borderRadius:18,gap:10}, cardTop:{flexDirection:'row',alignItems:'center',gap:10}, priorityDot:{width:9,height:9,borderRadius:5}, cardTitle:{fontSize:16,fontWeight:'800',flex:1}, meta:{flexDirection:'row',gap:10,alignItems:'center',flexWrap:'wrap'}, badge:{fontSize:11,fontWeight:'800',paddingHorizontal:8,paddingVertical:4,borderRadius:8,textTransform:'uppercase'}, evidence:{fontSize:12,fontStyle:'italic',lineHeight:17}, form:{padding:18,borderRadius:20,gap:12}, formTitle:{fontSize:18,fontWeight:'800'}, input:{borderWidth:1,borderRadius:12,paddingHorizontal:13,paddingVertical:11}, priorityRow:{flexDirection:'row',gap:7,flexWrap:'wrap'}, priorityChoice:{borderWidth:2,paddingHorizontal:10,paddingVertical:7,borderRadius:10}, actions:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:18}, primary:{paddingHorizontal:18,paddingVertical:11,borderRadius:12}, primaryText:{color:'#fff',fontWeight:'800'}, createButton:{padding:15,borderRadius:15,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  legacyRow:{borderTopWidth:StyleSheet.hairlineWidth,paddingVertical:11,flexDirection:'row',alignItems:'center',gap:10},
});