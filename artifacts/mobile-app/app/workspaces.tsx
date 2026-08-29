import { router } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
export default function Workspaces() {
  const c=useColors(); const { t, number }=useTranslation(); const {family,business}=useApp();
  return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{padding:24,paddingTop:64,gap:14}}>
    <Pressable onPress={()=>router.back()}><Text style={{color:c.coral,fontFamily:'Inter_700Bold'}}>← {t('common.back')}</Text></Pressable>
    <Text style={{color:c.navy,fontSize:28,fontFamily:'Inter_700Bold'}}>{t('workspaces.title')}</Text>
    <Text style={{color:c.mutedForeground,fontSize:12}}>{t('workspaces.hint')}</Text>
    <Text style={{color:c.navy,padding:14,borderWidth:1,borderColor:c.border,borderRadius:14}}>{t('workspaces.family',{count:number(family.members.length)})}</Text>
    <Text style={{color:c.navy,padding:14,borderWidth:1,borderColor:c.border,borderRadius:14}}>{t('workspaces.business',{count:number(business.members.length)})}</Text>
  </ScrollView>;
}