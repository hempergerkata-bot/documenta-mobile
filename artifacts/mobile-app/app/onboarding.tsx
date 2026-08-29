import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CountryPicker } from '@/components/CountryPicker';
import { useApp, type Settings } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { LANGUAGE_OPTIONS, type AppLanguage } from '@/utils/localization';
import type { TranslationMode } from '@/utils/explanationExperience';

const steps = ['onboarding.country', 'onboarding.appLanguage', 'onboarding.explanations', 'onboarding.translationMode', 'onboarding.reply', 'onboarding.privacy'] as const;
export default function OnboardingScreen() {
  const c = useColors(); const { t } = useTranslation();
  const { settings, updateSettings, updateSecurity, completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(settings.residenceCountry);
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(settings.appLanguage);
  const [explanationLanguage, setExplanationLanguage] = useState<AppLanguage>(settings.explanationLanguage);
  const [replyLanguage, setReplyLanguage] = useState<AppLanguage>(settings.replyLanguage);
  const [translationMode, setTranslationMode] = useState<TranslationMode>(settings.translationMode);
  const languagePicker = (value: AppLanguage, onChange: (language: AppLanguage) => void) => <View style={styles.wrap}>{LANGUAGE_OPTIONS.map((item) => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: value === item.code }} onPress={() => onChange(item.code)} style={[styles.option, { backgroundColor: value === item.code ? c.coral : c.card }]}><Text numberOfLines={1} style={{ color: value === item.code ? c.white : c.navy }}>{item.label}</Text></Pressable>)}</View>;
  const modePicker = <View style={styles.wrap}>{([
    ['automatic_when_needed', 'settings.translationAutomatic'], ['ask_first', 'settings.translationAskFirst'], ['off', 'settings.translationOff'],
  ] as const).map(([value, key]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: translationMode === value }} onPress={() => setTranslationMode(value)} style={[styles.option, { backgroundColor: translationMode === value ? c.coral : c.card }]}><Text style={{ color: translationMode === value ? c.white : c.navy }}>{t(key)}</Text></Pressable>)}</View>;
  const finish = () => {
    updateSettings({ residenceCountry: country, appLanguage, explanationLanguage, replyLanguage, translationMode });
    updateSecurity({ localOnly: true, analyticsEnabled: false, aiProcessingEnabled: false });
    completeOnboarding({ completed: true, language: appLanguage === 'en' ? 'English' : 'Deutsch', privacyAccepted: true });
    router.replace('/');
  };
  return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.page}>
    <Text style={{ color: c.coral, fontFamily: 'Inter_700Bold' }}>{t('onboarding.step', { current: step + 1, total: steps.length })}</Text>
    <Text style={[styles.title, { color: c.navy }]}>{t(steps[step])}</Text>
    {step === 0 ? <><Text style={{ color: c.mutedForeground }}>{t('onboarding.countryPrompt')}</Text><CountryPicker value={country} onChange={setCountry} /></> : null}
    {step === 1 ? <><Text style={{ color: c.mutedForeground }}>{t('onboarding.languagePrompt')}</Text>{languagePicker(appLanguage, (value) => { setAppLanguage(value); setExplanationLanguage(value); updateSettings({ appLanguage: value }); })}</> : null}
    {step === 2 ? <><Text style={{ color: c.mutedForeground }}>{t('onboarding.explanationPrompt')}</Text>{languagePicker(explanationLanguage, setExplanationLanguage)}<Text style={{ color: c.mutedForeground }}>{t('onboarding.explanationIndependent')}</Text></> : null}
    {step === 3 ? <><Text style={{ color: c.mutedForeground }}>{t('onboarding.translationPrompt')}</Text>{modePicker}<Text style={{ color: c.mutedForeground }}>{t('onboarding.noUselessTranslation')}</Text></> : null}
    {step === 4 ? <><Text style={{ color: c.mutedForeground }}>{t('onboarding.replyPrompt')}</Text>{languagePicker(replyLanguage, setReplyLanguage)}</> : null}
    {step === 5 ? <Text style={{ color: c.mutedForeground }}>{t('onboarding.privacyText')}</Text> : null}
    <Pressable onPress={() => step === steps.length - 1 ? finish() : setStep((current) => current + 1)} style={[styles.next, { backgroundColor: c.coral }]} accessibilityLabel={step === steps.length - 1 ? t('onboarding.finish') : t('onboarding.next')}><Text style={{ color: c.white, fontFamily: 'Inter_700Bold' }}>{step === steps.length - 1 ? t('onboarding.finish') : t('onboarding.next')}</Text></Pressable>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 24, paddingTop: 72, paddingBottom: 44, gap: 16 }, title: { fontSize: 29, fontFamily: 'Inter_700Bold' }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, option: { minWidth: 104, maxWidth: '100%', padding: 12, borderRadius: 10 }, next: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } });