import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountryPicker } from '@/components/CountryPicker';
import { useApp, type Settings } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { countryProfile } from '@/utils/countryRegistry';
import { isExplanationLanguage, isReplyLanguage, isRtlLanguage, languageDefinition, LANGUAGE_OPTIONS } from '@/utils/localization';
import { discoverLocalVoices, speakLocalExplanation } from '@/utils/nativeIntegrations';
import { localVoicesForLocale, selectedLocalVoice, type LocalVoice } from '@/utils/ttsCapability';

export default function SettingsScreen() {
  const colors = useColors(); const inset = useSafeAreaInsets(); const { language, t, backSymbol } = useTranslation();
  const { settings, updateSettings } = useApp();
  const [voices, setVoices] = useState<LocalVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const locale = languageDefinition(settings.explanationLanguage).locale;
  const preferredVoice = settings.explanationVoiceIdentifiers?.[settings.explanationLanguage];
  const selectedVoice = selectedLocalVoice(voices, locale, preferredVoice);
  const rtl = isRtlLanguage(language);
  const refreshVoices = useCallback(async () => {
    if (Platform.OS === 'web') { setVoices([]); return; }
    setLoadingVoices(true);
    const discovered = await discoverLocalVoices();
    const available = discovered.map(({ identifier, name, language: lang, quality, localService }) => ({ identifier, name, lang, quality, localService }));
    setVoices(available);
    const selected = settings.explanationVoiceIdentifiers?.[settings.explanationLanguage];
    if (selected && !localVoicesForLocale(available, locale).some((voice) => voice.identifier === selected)) {
      updateSettings({ explanationVoiceIdentifiers: { ...settings.explanationVoiceIdentifiers, [settings.explanationLanguage]: undefined } });
    }
    setLoadingVoices(false);
  }, [locale, settings.explanationLanguage, settings.explanationVoiceIdentifiers, updateSettings]);
  useEffect(() => { refreshVoices(); }, [refreshVoices]);
  const optionGroup = <K extends keyof Settings>(label: Parameters<typeof t>[0], key: K, options: readonly [Settings[K], Parameters<typeof t>[0]][], hint?: Parameters<typeof t>[0]) => <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[styles.label, { color: colors.navy }]}>{t(label)}</Text>{hint ? <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t(hint)}</Text> : null}
    <View style={styles.options}>{options.map(([value, text]) => <Pressable key={String(value)} accessibilityRole="radio" accessibilityState={{ checked: settings[key] === value }} onPress={() => updateSettings({ [key]: value } as Partial<Settings>)} style={[styles.option, { backgroundColor: settings[key] === value ? colors.coral : colors.muted }]}><Text style={{ color: settings[key] === value ? colors.white : colors.navy }}>{t(text)}</Text></Pressable>)}</View>
  </View>;
  const languageSetting = (key: 'appLanguage' | 'explanationLanguage' | 'replyLanguage', label: Parameters<typeof t>[0], hint: Parameters<typeof t>[0]) => <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[styles.label, { color: colors.navy }]}>{t(label)}</Text><Text style={[styles.hint, { color: colors.mutedForeground }]}>{t(hint)}</Text>
    <View style={styles.options}>{LANGUAGE_OPTIONS.map(({ code, label: name }) => { const supported = key === 'appLanguage' || (key === 'explanationLanguage' ? isExplanationLanguage(code) : isReplyLanguage(code)); return <Pressable key={code} testID={`language-${key}-${code}`} accessibilityRole="radio" accessibilityState={{ checked: settings[key] === code }} onPress={() => updateSettings({ [key]: code } as Partial<Settings>)} style={[styles.option, { backgroundColor: settings[key] === code ? colors.coral : colors.muted }]}><Text numberOfLines={1} style={{ color: settings[key] === code ? colors.white : colors.navy }}>{name}</Text>{key !== 'appLanguage' ? <Text style={[styles.small, { color: settings[key] === code ? colors.white : colors.mutedForeground }]}>{t(supported ? 'settings.adapterSupported' : 'settings.adapterUnsupported')}</Text> : null}</Pressable>; })}</View>
  </View>;
  const selectedCountry = countryProfile(settings.residenceCountry);
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.page, { paddingTop: (Platform.OS === 'web' ? 67 : inset.top) + 16 }]}>
    <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')} accessibilityLabel={t('common.back')}><Text style={{ color: colors.coral, fontFamily: 'Inter_700Bold' }}>{backSymbol} {t('common.back')}</Text></Pressable>
    <Text style={[styles.title, { color: colors.navy }]}>{t('settings.title')}</Text>
    <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.navy }]}>{t('settings.region')}</Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t('settings.regionHint')}</Text>
      <Text style={{ color: colors.navy, fontFamily: 'Inter_700Bold', marginBottom: 8 }}>{selectedCountry.countryCode === 'UNKNOWN' ? t('settings.countryUnknown') : `${selectedCountry.nativeName} · ${selectedCountry.countryCode}`}</Text>
      <CountryPicker value={settings.residenceCountry} onChange={(residenceCountry) => updateSettings({ residenceCountry })} />
    </View>
    {languageSetting('appLanguage', 'settings.appLanguage', 'settings.appLanguageHint')}
    {languageSetting('explanationLanguage', 'settings.explanationLanguage', 'settings.explanationLanguageHint')}
    {languageSetting('replyLanguage', 'settings.replyLanguage', 'settings.replyLanguageHint')}
    {optionGroup('settings.translationMode', 'translationMode', [['automatic_when_needed','settings.translationAutomatic'],['ask_first','settings.translationAskFirst'],['off','settings.translationOff']] as const)}
    {optionGroup('settings.explanationMode', 'explanationMode', [['kurz','common.low'],['normal','common.medium'],['detailliert','common.high']] as const)}
    {optionGroup('settings.explanationDisplayMode', 'explanationDisplayMode', [['text','settings.explanationText'],['voice','settings.explanationVoice'],['text_and_voice','settings.explanationTextVoice']] as const, 'settings.voiceHint')}
    <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.navy, textAlign: rtl ? 'right' : 'left' }]}>{t('settings.voiceSelection')}</Text>
      <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: rtl ? 'right' : 'left' }]}>{t('settings.voiceHint')}</Text>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: !preferredVoice }} onPress={() => updateSettings({ explanationVoiceIdentifiers: { ...settings.explanationVoiceIdentifiers, [settings.explanationLanguage]: undefined } })} style={[styles.voiceOption, { borderColor: !preferredVoice ? colors.coral : colors.border, backgroundColor: colors.muted }]}>
        <Text style={{ color: colors.navy, textAlign: rtl ? 'right' : 'left' }}>{t('settings.voiceAutomatic')}</Text>
      </Pressable>
      {localVoicesForLocale(voices, locale).map((voice) => <Pressable key={voice.identifier ?? voice.name} accessibilityRole="radio" accessibilityState={{ checked: preferredVoice === voice.identifier }} onPress={() => updateSettings({ explanationVoiceIdentifiers: { ...settings.explanationVoiceIdentifiers, [settings.explanationLanguage]: voice.identifier } })} style={[styles.voiceOption, { borderColor: preferredVoice === voice.identifier ? colors.coral : colors.border, backgroundColor: colors.muted }]}>
        <Text style={{ color: colors.navy, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }}>{voice.name ?? voice.identifier}</Text>
        <Text style={[styles.small, { color: colors.mutedForeground, textAlign: rtl ? 'right' : 'left' }]}>{voice.lang} · {t('settings.voiceQuality')}: {voice.quality ?? '–'}</Text>
      </Pressable>)}
      {!loadingVoices && !localVoicesForLocale(voices, locale).length ? <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t('settings.voiceNone')}</Text> : null}
      <View style={[styles.controls, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('settings.voiceRefresh')} onPress={refreshVoices} style={[styles.option, { backgroundColor: colors.muted }]}><Text style={{ color: colors.navy }}>{loadingVoices ? t('common.loading') : t('settings.voiceRefresh')}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('settings.voicePreview')} disabled={!selectedVoice || Platform.OS === 'web'} onPress={() => speakLocalExplanation(t('settings.voicePreview'), { language: locale, voice: selectedVoice?.identifier, rate: settings.speechRate === 'langsam' ? .8 : settings.speechRate === 'schnell' ? 1.2 : 1 })} style={[styles.option, { backgroundColor: colors.muted, opacity: selectedVoice && Platform.OS !== 'web' ? 1 : .45 }]}><Text style={{ color: colors.navy }}>{t('settings.voicePreview')}</Text></Pressable>
      </View>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 24, paddingBottom: 44, gap: 12 }, title: { fontSize: 28, fontFamily: 'Inter_700Bold' }, group: { borderWidth: 1, borderRadius: 16, padding: 14 }, label: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 6 }, hint: { fontSize: 11, lineHeight: 16, marginBottom: 10 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, option: { minWidth: 110, maxWidth: '100%', paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10 }, voiceOption: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 7 }, small: { fontSize: 8, marginTop: 3 } });