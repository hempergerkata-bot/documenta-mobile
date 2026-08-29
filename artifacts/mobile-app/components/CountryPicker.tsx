import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { searchCountries } from '@/utils/countryRegistry';

export function CountryPicker({ value, onChange, allowUnknown = true }: { value: string; onChange: (countryCode: string) => void; allowUnknown?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const countries = useMemo(() => searchCountries(query), [query]);
  return <View style={styles.container}>
    <TextInput value={query} onChangeText={setQuery} placeholder={t('settings.countrySearch')} placeholderTextColor={colors.mutedForeground} accessibilityLabel={t('settings.countrySearch')} style={[styles.input, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.background }]} />
    <ScrollView nestedScrollEnabled style={styles.list} contentContainerStyle={styles.listContent}>
      {allowUnknown ? <Pressable testID="country-UNKNOWN" accessibilityRole="radio" accessibilityState={{ checked: value === 'UNKNOWN' }} onPress={() => onChange('UNKNOWN')} style={[styles.row, { backgroundColor: value === 'UNKNOWN' ? colors.coralSoft : colors.card, borderColor: colors.border }]}>
        <Text style={[styles.name, { color: colors.navy }]}>{t('settings.countryUnknown')}</Text><Text style={{ color: colors.mutedForeground }}>—</Text>
      </Pressable> : null}
      {countries.map((country) => <Pressable key={country.countryCode} testID={`country-${country.countryCode}`} accessibilityRole="radio" accessibilityLabel={`${country.nativeName}, ${country.englishName}`} accessibilityState={{ checked: value === country.countryCode }} onPress={() => onChange(country.countryCode)} style={[styles.row, { backgroundColor: value === country.countryCode ? colors.coralSoft : colors.card, borderColor: colors.border }]}>
        <Text numberOfLines={2} style={[styles.name, { color: colors.navy }]}>{country.nativeName}<Text style={{ color: colors.mutedForeground }}> · {country.englishName}</Text></Text>
        <Text style={[styles.code, { color: value === country.countryCode ? colors.coral : colors.mutedForeground }]}>{country.countryCode}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ container: { gap: 8 }, input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 }, list: { maxHeight: 330 }, listContent: { gap: 7, paddingBottom: 4 }, row: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 }, name: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Inter_600SemiBold' }, code: { fontSize: 10, fontFamily: 'Inter_700Bold' } });