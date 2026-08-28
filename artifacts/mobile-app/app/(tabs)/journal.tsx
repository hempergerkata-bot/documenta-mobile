import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function JournalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { journalEntries, addJournalEntry, removeJournalEntry } = useApp();
  const [entry, setEntry] = useState('');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      setEntry('');
    }, []),
  );

  const saveEntry = () => {
    const trimmed = entry.trim();
    if (!trimmed) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addJournalEntry(trimmed);
    setEntry('');
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topInset + 22, paddingBottom: Platform.OS === 'web' ? 34 : 110 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: colors.coral }]}>NAPLÓ</Text>
      <Text style={[styles.title, { color: colors.navy }]}>Egy kis hely neked.</Text>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        Nem kell szépen fogalmazni. Csak írd le, ami most igaz.
      </Text>

      <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          value={entry}
          onChangeText={setEntry}
          placeholder="Most azt érzem, hogy..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
          style={[styles.input, { color: colors.navy }]}
          testID="journal-input"
        />
        <View style={styles.inputFooter}>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>
            {entry.length > 0 ? `${entry.length} karakter` : 'A naplód csak a tiéd.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bejegyzés mentése"
            testID="journal-save"
            onPress={saveEntry}
            disabled={!entry.trim()}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: entry.trim() ? colors.coral : colors.muted },
              pressed && styles.pressed,
            ]}
          >
            <Feather
              name="arrow-up"
              size={18}
              color={entry.trim() ? colors.white : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.entriesHeader}>
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>Korábbi gondolatok</Text>
        <Text style={[styles.count, { color: colors.coral }]}>{journalEntries.length}</Text>
      </View>

      {journalEntries.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.sage }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="wind" size={21} color={colors.sageDeep} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.sageDeep }]}>Még üres.</Text>
          <Text style={[styles.emptyText, { color: colors.sageDeep }]}>
            Az első bejegyzésed itt fog megjelenni.
          </Text>
        </View>
      ) : (
        <View style={styles.entries}>
          {journalEntries.map((item, index) => (
            <Pressable
              key={`${item}-${index}`}
              onLongPress={() => removeJournalEntry(item)}
              accessibilityHint="Hosszan nyomva törölhető"
              style={({ pressed }) => [
                styles.entryRow,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.entryLine, { backgroundColor: colors.coral }]} />
              <Text style={[styles.entryText, { color: colors.navy }]}>{item}</Text>
              <Feather name="more-horizontal" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  eyebrow: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2.2,
    marginBottom: 7,
  },
  title: { fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Inter_400Regular',
    maxWidth: 300,
    marginTop: 9,
    marginBottom: 25,
  },
  inputCard: {
    minHeight: 196,
    borderRadius: 23,
    borderWidth: 1,
    padding: 16,
    marginBottom: 29,
  },
  input: { flex: 1, fontSize: 16, lineHeight: 24, fontFamily: 'Inter_400Regular' },
  inputFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helper: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  saveButton: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  count: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  empty: { padding: 24, borderRadius: 22, alignItems: 'center' },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  emptyText: { fontSize: 12, fontFamily: 'Inter_400Regular', opacity: 0.78 },
  entries: { gap: 10 },
  entryRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  entryLine: { width: 3, borderRadius: 2, minHeight: 34, marginRight: 12 },
  entryText: { flex: 1, fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});