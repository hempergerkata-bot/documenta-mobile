import { Feather } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { languageName } from '@/utils/localization';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [biometrics, setBiometrics] = useState(false);
  const [profileName, setProfileName] = useState('');
  const { profiles, addProfile, renameProfile, demoEnabled, setDemoEnabled } = useApp();
  const { t, language } = useTranslation();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const rows = [
    { icon: 'globe', title: t('common.language'), detail: languageName(language, language), type: 'link' },
    { icon: 'lock', title: t('onboarding.privacy'), detail: t('automation.localOnly'), type: 'link' },
    { icon: 'help-circle', title: t('common.review'), detail: t('settings.subtitle'), type: 'link' },
  ] as const;

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: topInset + 18, paddingBottom: Platform.OS === 'web' ? 34 : 112 }} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={[styles.kicker, { color: colors.coral }]}>DOCUMENTA</Text>
        <Text style={[styles.heading, { color: colors.navy }]}>{t('nav.profile')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('settings.subtitle')}</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.navy }]}>
          <View style={[styles.avatar, { backgroundColor: colors.coral }]}><Text style={styles.avatarText}>D</Text></View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileTitle}>{t('documents.title')}</Text>
            <Text style={styles.profileDetail}>{t('dashboard.subtitle')}</Text>
          </View>
          <Feather name="check-circle" size={22} color={colors.sun} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('search.profile')}</Text>
        <View style={[styles.settings, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {profiles.map((profile) => <View key={profile.id} style={styles.row}><View style={styles.rowCopy}><TextInput accessibilityLabel={t('nav.profile')} value={profile.name} onChangeText={(name) => renameProfile(profile.id, name)} style={[styles.rowTitle, { color: colors.navy }]} /></View><Text style={[styles.rowDetail,{color:colors.mutedForeground}]}>{t('nav.profile')}</Text></View>)}
          <View style={styles.row}><TextInput accessibilityLabel={t('documents.add')} value={profileName} onChangeText={setProfileName} placeholder={t('documents.add')} placeholderTextColor={colors.mutedForeground} style={[styles.rowCopy, styles.rowTitle, { color: colors.navy }]} /><Pressable accessibilityRole="button" accessibilityLabel={t('documents.add')} onPress={() => { addProfile(profileName); setProfileName(''); }}><Feather name="plus-circle" size={22} color={colors.coral}/></Pressable></View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.navy }]}>{t('settings.title')}</Text>
        <View style={[styles.settings, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.sage }]}><Feather name="shield" size={17} color={colors.sageDeep} /></View>
            <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.navy }]}>{t('onboarding.privacy')}</Text><Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{t('automation.localOnly')}</Text></View>
            <Switch value={biometrics} onValueChange={setBiometrics} trackColor={{ false: colors.muted, true: colors.coral }} thumbColor={colors.white} testID="biometric-switch" />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {rows.map((row) => (
            <View key={row.title}>
               <Pressable accessibilityRole="button" accessibilityLabel={row.title} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                 <View style={[styles.rowIcon, { backgroundColor: row.icon === 'globe' ? colors.sun : row.icon === 'lock' ? colors.coralSoft : colors.lilac }]}><Feather name={row.icon} size={17} color={colors.navy} /></View>
                <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.navy }]}>{row.title}</Text><Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{row.detail}</Text></View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
               {row.icon !== 'help-circle' ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            </View>
          ))}
        </View>
        <View style={[styles.note, { backgroundColor: colors.accent }]}>
          <Feather name="zap" size={16} color={colors.accentForeground} />
          <Text style={[styles.noteText, { color: colors.accentForeground }]}>{t('onboarding.modulesText')}</Text>
        </View>
        <View style={{ gap: 9, marginTop: 14 }}>{[['/cases',t('common.cases')],['/notifications',t('action.reminders')],['/archive',t('document.archive')],['/export',t('documents.optimizedPdf')],['/activity',t('action.history')],['/contracts',t('common.documents')],['/compare',t('common.review')],['/workspaces',t('search.profile')],['/security',t('onboarding.privacy')],['/modules',t('onboarding.modules')]].map(([path,label])=><Pressable accessibilityRole="button" accessibilityLabel={label} key={path} onPress={() => router.push(path as never)} style={[styles.note,{backgroundColor:colors.card}]}><Text style={[styles.noteText,{color:colors.navy}]}>{label}</Text></Pressable>)}<View style={[styles.note,{backgroundColor:colors.sage}]}><Text style={[styles.noteText,{color:colors.sageDeep}]}>DEMO</Text><Switch accessibilityLabel="DEMO" value={demoEnabled} onValueChange={setDemoEnabled}/></View></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  kicker: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 7 },
  heading: { fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 5, marginBottom: 24 },
  profileCard: { minHeight: 105, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  avatar: { width: 57, height: 57, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  profileCopy: { flex: 1, marginLeft: 13 },
  profileTitle: { color: '#ffffff', fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  profileDetail: { color: 'rgba(255,255,255,0.66)', fontSize: 11, fontFamily: 'Inter_400Regular' },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 13 },
  settings: { borderWidth: 1, borderRadius: 21, paddingHorizontal: 14, marginBottom: 17 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, marginLeft: 12 },
  rowTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 5 },
  rowDetail: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  divider: { height: 1, marginLeft: 51 },
  note: { minHeight: 59, borderRadius: 17, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  pressed: { opacity: 0.72 },
});