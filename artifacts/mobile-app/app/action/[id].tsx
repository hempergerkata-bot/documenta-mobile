import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import type { ActionPriority } from '@/utils/actionEngine';
import { useTranslation } from '@/hooks/useTranslation';
import { actionTypeLabel, confidenceLabel, priorityLabel as localizedPriorityLabel } from '@/utils/localization';

export default function ActionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const { t, date, language } = useTranslation();
  const colors = { background: c.background, card: c.card, text: c.navy, muted: c.mutedForeground, border: c.border, tint: c.coral };
  const { actions, editAction, confirmAction, completeAction, reopenAction, cancelAction, rejectAction, archiveAction } = useApp();
  const action = actions.find((item) => item.id === id);
  const [title, setTitle] = useState(action?.title ?? '');
  const [description, setDescription] = useState(action?.description ?? '');
  const [dueDate, setDueDate] = useState(action?.dueDate ?? '');
  const [priority, setPriority] = useState<ActionPriority>(action?.priority ?? 'normal');
  useEffect(() => { if (action) { setTitle(action.title); setDescription(action.description); setDueDate(action.dueDate ?? ''); setPriority(action.priority); } }, [action?.id]);
  const actionStatus = (status: NonNullable<typeof action>['status']) => t(({ suggested: 'action.statusSuggested', needs_review: 'action.statusNeedsReview', confirmed: 'action.statusConfirmed', in_progress: 'action.statusInProgress', waiting: 'action.statusWaiting', completed: 'action.statusCompleted', cancelled: 'action.statusCancelled', rejected: 'action.statusRejected', archived: 'action.statusArchived' } as const)[status]);
  const priorityLabel = (value: ActionPriority) => localizedPriorityLabel(value, language);
  if (!action) return <View style={[styles.center,{backgroundColor:colors.background}]}><Text style={{color:colors.text}}>{t('error.notFound')}</Text></View>;
  const save = () => editAction(action.id, { title, description, dueDate, priority });
  return <ScrollView style={{backgroundColor:colors.background}} contentContainerStyle={styles.content}>
    <Stack.Screen options={{ title: t('action.detail'), headerBackTitle: t('common.back') }} />
    <View style={[styles.hero,{backgroundColor:colors.card}]}><Text style={[styles.status,{color:action.status==='needs_review'?'#C2410C':colors.tint}]}>{actionStatus(action.status)}</Text><Text style={[styles.title,{color:colors.text}]}>{action.title}</Text><Text style={{color:colors.muted}}>{actionTypeLabel(action.type, language)} · {confidenceLabel(action.confidence, language)}</Text></View>
    {action.status==='needs_review' && <View style={[styles.warning,{backgroundColor:'#FFF7ED'}]}><Text style={styles.warningTitle}>{t('review.needsReview')}</Text><Text style={styles.warningText}>{t('action.completeBlocked')}</Text></View>}
    <View style={[styles.section,{backgroundColor:colors.card}]}><Text style={[styles.heading,{color:colors.text}]}>{t('common.edit')}</Text>
      <TextInput accessibilityLabel={t('document.title')} value={title} onChangeText={setTitle} style={[styles.input,{borderColor:colors.border,color:colors.text}]} />
      <TextInput accessibilityLabel={t('action.detail')} value={description} onChangeText={setDescription} multiline style={[styles.input,styles.multiline,{borderColor:colors.border,color:colors.text}]} />
      <TextInput accessibilityLabel={t('common.due')} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={[styles.input,{borderColor:colors.border,color:colors.text}]} />
      <View style={styles.row}>{(['low','normal','high','urgent'] as ActionPriority[]).map((p)=><Pressable key={p} accessibilityLabel={priorityLabel(p)} onPress={()=>setPriority(p)} style={[styles.choice,{borderColor:priority===p?colors.tint:colors.border}]}><Text style={{color:colors.text,fontWeight:'700'}}>{priorityLabel(p)}</Text></Pressable>)}</View>
      <Pressable accessibilityLabel={t('common.save')} onPress={save} style={[styles.primary,{backgroundColor:colors.tint}]}><Text style={styles.primaryText}>{t('common.save')}</Text></Pressable>
    </View>
    <View style={[styles.section,{backgroundColor:colors.card}]}><Text style={[styles.heading,{color:colors.text}]}>{t('action.source')} & {t('action.evidence')}</Text><Text style={{color:colors.muted}}>{action.sourceReference ?? action.source}</Text>{action.evidence.map((e,i)=><Text key={`${e.text}-${i}`} style={[styles.quote,{color:colors.text}]}>„{e.text}“ · {confidenceLabel(e.confidence, language)}</Text>)}</View>
    <View style={[styles.section,{backgroundColor:colors.card}]}><Text style={[styles.heading,{color:colors.text}]}>{t('action.history')}</Text>{[...action.history].reverse().map((h)=><View key={h.id} style={styles.history}><Text style={{color:colors.text,fontWeight:'700'}}>{h.event.replaceAll('_',' ')}</Text><Text style={{color:colors.muted,fontSize:12}}>{date(h.at)}</Text></View>)}</View>
    <View style={styles.row}>{!action.userConfirmed&&!['rejected','cancelled','archived'].includes(action.status)&&<Pressable accessibilityLabel={t('action.confirm')} onPress={()=>confirmAction(action.id)} style={[styles.primary,{backgroundColor:colors.tint}]}><Text style={styles.primaryText}>{t('action.confirm')}</Text></Pressable>}{!['completed','rejected','cancelled','archived'].includes(action.status)&&action.userConfirmed?<Pressable accessibilityLabel={t('common.complete')} onPress={()=>completeAction(action.id)} style={[styles.primary,{backgroundColor:'#15803D'}]}><Text style={styles.primaryText}>{t('common.complete')}</Text></Pressable>:action.status==='completed'?<Pressable accessibilityLabel={t('action.reopen')} onPress={()=>reopenAction(action.id)} style={[styles.secondary,{borderColor:colors.border}]}><Text style={{color:colors.text}}>{t('action.reopen')}</Text></Pressable>:null}</View>
    <View style={styles.row}>{!['rejected','cancelled','archived'].includes(action.status)&&<Pressable accessibilityLabel={t('common.cancel')} onPress={()=>cancelAction(action.id)}><Text style={{color:colors.muted}}>{t('common.cancel')}</Text></Pressable>}{['suggested','needs_review'].includes(action.status)&&<Pressable accessibilityLabel={t('common.reject')} onPress={()=>rejectAction(action.id)}><Text style={{color:'#B91C1C'}}>{t('common.reject')}</Text></Pressable>}{action.status!=='archived'&&<Pressable accessibilityLabel={t('action.archive')} onPress={()=>{archiveAction(action.id);router.back();}}><Text style={{color:colors.muted}}>{t('action.archive')}</Text></Pressable>}</View>
  </ScrollView>;
}
const styles=StyleSheet.create({content:{padding:20,paddingBottom:50,gap:14},center:{flex:1,alignItems:'center',justifyContent:'center'},hero:{padding:20,borderRadius:20,gap:7},status:{fontSize:12,fontWeight:'900',textTransform:'uppercase'},title:{fontSize:24,fontWeight:'800'},warning:{padding:16,borderRadius:16},warningTitle:{color:'#9A3412',fontWeight:'800'},warningText:{color:'#9A3412',marginTop:5,lineHeight:19},section:{padding:17,borderRadius:18,gap:11},heading:{fontSize:17,fontWeight:'800'},input:{borderWidth:1,borderRadius:12,padding:12},multiline:{minHeight:84,textAlignVertical:'top'},row:{flexDirection:'row',gap:10,flexWrap:'wrap',alignItems:'center'},choice:{borderWidth:2,borderRadius:10,paddingHorizontal:10,paddingVertical:8},primary:{paddingHorizontal:16,paddingVertical:12,borderRadius:12},primaryText:{color:'#fff',fontWeight:'800'},secondary:{paddingHorizontal:16,paddingVertical:11,borderRadius:12,borderWidth:1},quote:{fontStyle:'italic',lineHeight:20},history:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:5}});