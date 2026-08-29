import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { ACTION_ENGINE_SCHEMA_VERSION, type AutomationRule } from '@/utils/actionEngine';
import { useTranslation } from '@/hooks/useTranslation';
import { automationLabel, confidenceLabel, triggerTypeLabel } from '@/utils/localization';

export default function AutomationScreen(){
  const c=useColors();
  const {t,language}=useTranslation();
  const colors={background:c.background,card:c.card,text:c.navy,muted:c.mutedForeground,tint:c.coral};
  const {reminders,followUps,replyDrafts,calendarCandidates,automationRules,addAutomationRule}=useApp();
  const createRule=()=>{
    const now=new Date().toISOString();
    const rule:AutomationRule={schemaVersion:ACTION_ENGINE_SCHEMA_VERSION,id:`rule-${Date.now()}`,name:automationLabel('defaultRuleName',language),enabled:true,triggerType:'action_due_soon',conditions:{userConfirmed:true,dueDateProximityDays:7},actions:['create_reminder','surface_in_task_center'],scope:'all',createdAt:now,updatedAt:now,userCreated:true,systemPreset:false};
    addAutomationRule(rule);
  };
  const groups=[[t('action.reminders'),'reminder',reminders],[automationLabel('followUps',language),'follow-up',followUps],[t('action.drafts'),'reply',replyDrafts],[automationLabel('calendar',language),'calendar',calendarCandidates]] as const;
  const actionStatus=(status:string|undefined)=>status==='needs_review'?t('action.statusNeedsReview'):status==='completed'?t('action.statusCompleted'):status??t('common.unknown');
  return <ScrollView style={{backgroundColor:colors.background}} contentContainerStyle={styles.content}><Stack.Screen options={{title:t('automation.title')}}/>
    <View style={[styles.hero,{backgroundColor:colors.card}]}><Text style={[styles.title,{color:colors.text}]}>{t('automation.title')}</Text><Text style={{color:colors.muted,lineHeight:20}}>{t('automation.localOnly')}</Text></View>
    <View style={[styles.section,{backgroundColor:colors.card}]}><Text style={[styles.heading,{color:colors.text}]}>{t('automation.title')}</Text>{automationRules.length===0?<Text style={{color:colors.muted}}>{t('automation.noRules')}</Text>:automationRules.map(r=><View key={r.id} style={styles.item}><Text style={{color:colors.text,fontWeight:'800'}}>{r.name}</Text><Text style={{color:colors.muted}}>{triggerTypeLabel(r.triggerType,language)} · {r.enabled?t('common.open'):t('common.close')}</Text></View>)}<Pressable accessibilityLabel={t('automation.reminderRule')} onPress={createRule} style={[styles.button,{backgroundColor:colors.tint}]}><Text style={styles.buttonText}>{t('automation.reminderRule')}</Text></Pressable></View>
    {groups.map(([title,kind,items])=><View key={title} style={[styles.section,{backgroundColor:colors.card}]}><Text style={[styles.heading,{color:colors.text}]}>{title} ({items.length})</Text>{items.length===0?<Text style={{color:colors.muted}}>{t('automation.noCandidates')}</Text>:items.slice(0,10).map((item:any)=><Pressable key={item.id} disabled={kind!=='reply'} onPress={()=>kind==='reply'&&router.push({pathname:'/reply/[id]',params:{id:item.id}} as never)} accessibilityLabel={kind==='reply'?t('reply.title'):undefined} style={styles.item}><Text style={{color:colors.text,fontWeight:'700'}}>{item.title??item.subject}</Text><Text style={{color:item.status==='needs_review'?'#C2410C':colors.muted,fontSize:12}}>{actionStatus(item.status)} · {confidenceLabel(item.confidence,language)}</Text></Pressable>)}</View>)}
  </ScrollView>
}
const styles=StyleSheet.create({content:{padding:20,paddingBottom:50,gap:14},hero:{padding:20,borderRadius:20,gap:8},title:{fontSize:25,fontWeight:'800'},section:{padding:17,borderRadius:18,gap:12},heading:{fontSize:18,fontWeight:'800'},item:{gap:3,paddingVertical:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#94A3B840'},button:{padding:13,borderRadius:12,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800'}});