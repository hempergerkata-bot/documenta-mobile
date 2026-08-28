import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentRecord, useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const filters = ['Alle', 'Offen', 'Später', 'Erledigt'];

function DocumentCard({ document, colors }: { document: DocumentRecord; colors: ReturnType<typeof useColors> }) {
  const isComplete = document.status === 'Erledigt' || document.status === 'Bezahlt';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/document/[id]', params: { id: document.id } })}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
      testID={`document-card-${document.id}`}
    >
      <View style={[styles.fileIcon, { backgroundColor: isComplete ? colors.sage : colors.coralSoft }]}>
        <Feather name={isComplete ? 'check' : 'file-text'} size={19} color={isComplete ? colors.sageDeep : colors.coral} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.navy }]} numberOfLines={1}>{document.title}</Text>
        <Text style={[styles.sender, { color: colors.mutedForeground }]} numberOfLines={1}>{document.sender}</Text>
        <View style={styles.bottom}>
          <Text style={[styles.category, { color: colors.sageDeep }]}>{document.category}</Text>
          {document.dueDate ? <Text style={[styles.due, { color: colors.mutedForeground }]}>Fällig {document.dueDate}</Text> : null}
        </View>
      </View>
      <View style={styles.right}>
        {document.amount ? <Text style={[styles.amount, { color: colors.navy }]}>{document.amount}</Text> : null}
        <View style={[styles.status, { backgroundColor: isComplete ? colors.sage : document.status === 'Später' ? colors.sun : colors.coralSoft }]}>
          <Text style={[styles.statusText, { color: isComplete ? colors.sageDeep : document.status === 'Später' ? colors.accentForeground : colors.coral }]}>{document.status}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents } = useApp();
  const [filter, setFilter] = useState('Alle');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const filtered = documents.filter((doc) => filter === 'Alle' || doc.status === filter);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: topInset + 18, paddingBottom: Platform.OS === 'web' ? 34 : 112 }} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.coral }]}>ABLAGE</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>Dokumente</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{documents.length} Dokumente an einem Ort</Text>
          </View>
          <Pressable onPress={() => router.push('/add')} style={({ pressed }) => [styles.add, { backgroundColor: colors.coral }, pressed && styles.pressed]} testID="documents-add-button">
            <Feather name="plus" size={20} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {filters.map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, { backgroundColor: filter === item ? colors.navy : colors.card, borderColor: filter === item ? colors.navy : colors.border }]}>
              <Text style={[styles.filterText, { color: filter === item ? colors.white : colors.navy }]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.list}>
          {filtered.map((document) => <DocumentCard key={document.id} document={document} colors={colors} />)}
        </View>
        {filtered.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.sage }]}>
            <Feather name="inbox" size={21} color={colors.sageDeep} />
            <Text style={[styles.emptyTitle, { color: colors.sageDeep }]}>Keine Dokumente hier</Text>
            <Text style={[styles.emptyText, { color: colors.sageDeep }]}>Ändere den Filter oder füge ein neues Dokument hinzu.</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  kicker: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 7 },
  heading: { fontSize: 30, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 5 },
  add: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 17 },
  filter: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9 },
  filterText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  list: { gap: 10 },
  card: { minHeight: 104, borderRadius: 19, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center' },
  fileIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  copy: { flex: 1, marginRight: 8 },
  title: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  sender: { fontSize: 10, fontFamily: 'Inter_400Regular', marginBottom: 9 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  category: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  due: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  right: { alignItems: 'flex-end', minWidth: 68 },
  amount: { fontSize: 11, fontFamily: 'Inter_700Bold', marginBottom: 9 },
  status: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  empty: { borderRadius: 20, padding: 26, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 17 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});