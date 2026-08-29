import { Pressable, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { generatedNotifications } from '@/utils/documentDomain';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';

export default function NotificationsScreen() {
  const c=useColors();
  const { t }=useTranslation();
  const {activeDocuments,activeCases,activeTasks,activeNotifications,markGeneratedNotificationRead}=useApp();
  const persisted=new Map(activeNotifications.map(x=>[x.id,x]));
  const generated=generatedNotifications(activeDocuments,activeCases,activeTasks).map(x=>persisted.has(x.id)?{...x,read:persisted.get(x.id)!.read}:x);
  const notices=[...new Map([...persisted.values(),...generated].map(item=>[item.id,item])).values()];
  return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{padding:24,paddingTop:64,gap:12}}>
    <Pressable onPress={()=>router.back()}><Text style={{color:c.coral}}>← {t('common.back')}</Text></Pressable><Text style={{color:c.navy,fontSize:28,fontFamily:'Inter_700Bold'}}>{t('notifications.title')}</Text>
    {notices.length?notices.map(n=><Pressable key={n.id} onPress={()=>markGeneratedNotificationRead(n.id)} style={{padding:14,borderRadius:14,borderWidth:1,borderColor:c.border,backgroundColor:n.read?c.card:c.sage}}><Text style={{color:c.navy,fontFamily:'Inter_700Bold'}}>{n.title}</Text><Text style={{color:c.mutedForeground,fontSize:11}}>{n.body}</Text></Pressable>):<Text style={{color:c.mutedForeground}}>{t('notifications.empty')}</Text>}
  </ScrollView>;
}