import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents } = useApp();
  const [query, setQuery] = useState('');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return documents;
    return documents.filter((document) =>
      [document.title, document.sender, document.category, document.person, ...document.tags]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [documents, query]);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: topInset + 18, paddingBottom: Platform.OS === 'web' ? 34 : 112 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={[styles.kicker, { color: colors.coral }]}>FINDEN</Text>
        <Text style={[styles.heading, { color: colors.navy }]}>Suche</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Titel, Absender, Kategorie oder Person</Text>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={19} color={colors.mutedForeground} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Wonach suchst du?" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.navy }]} autoCapitalize="none" testID="search-input" />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityLabel="Suche löschen"><Feather name="x-circle" size={18} color={colors.mutedForeground} /></Pressable> : null}
        </View>
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>{results.length} {results.length === 1 ? 'Dokument' : 'Dokumente'}</Text>
        <View style={styles.results}>
          {results.map((document) => (
            <Pressable key={document.id} onPress={() => router.push({ pathname: '/document/[id]', params: { id: document.id } })} style={({ pressed }) => [styles.resultRow, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}>
              <View style={[styles.resultIcon, { backgroundColor: colors.coralSoft }]}><Feather name="file-text" size={17} color={colors.coral} /></View>
              <View style={styles.resultCopy}>
                <Text style={[styles.resultTitle, { color: colors.navy }]} numberOfLines={1}>{document.title}</Text>
                <Text style={[styles.resultSender, { color: colors.mutedForeground }]} numberOfLines={1}>{document.sender} · {document.person}</Text>
              </View>
              <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
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
  searchBox: { minHeight: 55, borderWidth: 1, borderRadius: 17, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  resultCount: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 17, marginBottom: 10 },
  results: { gap: 9 },
  resultRow: { minHeight: 69, borderWidth: 1, borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center' },
  resultIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1, marginHorizontal: 11 },
  resultTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  resultSender: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});