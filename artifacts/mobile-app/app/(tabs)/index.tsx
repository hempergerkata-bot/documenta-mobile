import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentRecord, useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const categories = [
  { label: 'Versicherungen', icon: 'shield', tone: 'coral' },
  { label: 'Finanzen', icon: 'credit-card', tone: 'sun' },
  { label: 'Wohnen', icon: 'home', tone: 'sage' },
  { label: 'Gesundheit', icon: 'activity', tone: 'lilac' },
] as const;

const urgentDocuments = [
  { title: 'Beitragsrechnung 2025', sender: 'Allianz Versicherung', due: 'Fällig in 6 Tagen', amount: '128,40 €' },
  { title: 'Jahresabrechnung Strom', sender: 'Stadtwerke München', due: 'Fällig in 22 Tagen', amount: '286,00 €' },
];

function DocumentRow({ document, colors }: { document: DocumentRecord; colors: ReturnType<typeof useColors> }) {
  const isDone = document.status === 'Erledigt' || document.status === 'Bezahlt';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.documentRow,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
      onPress={() => router.push({ pathname: '/document/[id]', params: { id: document.id } })}
      testID={`document-${document.id}`}
    >
      <View style={[styles.documentIcon, { backgroundColor: isDone ? colors.sage : colors.coralSoft }]}>
        <Feather name={isDone ? 'check' : 'file-text'} size={18} color={isDone ? colors.sageDeep : colors.coral} />
      </View>
      <View style={styles.documentCopy}>
        <Text style={[styles.documentTitle, { color: colors.navy }]} numberOfLines={1}>{document.title}</Text>
        <Text style={[styles.documentSender, { color: colors.mutedForeground }]} numberOfLines={1}>{document.sender}</Text>
      </View>
      <View style={styles.documentMeta}>
        {document.amount ? <Text style={[styles.amount, { color: colors.navy }]}>{document.amount}</Text> : null}
        <Text style={[styles.documentDate, { color: colors.mutedForeground }]}>{document.documentDate}</Text>
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents } = useApp();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const latest = documents.slice(0, 3);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 18, paddingBottom: Platform.OS === 'web' ? 34 : 112 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: colors.coral }]}>DOCUMENTA</Text>
            <Text style={[styles.title, { color: colors.navy }]}>Guten Morgen.</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Alles Wichtige auf einen Blick.</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.avatarButton, { backgroundColor: colors.sage }, pressed && styles.pressed]}
            onPress={() => router.push('/profile')}
            accessibilityLabel="Profil öffnen"
            testID="profile-button"
          >
            <Text style={[styles.avatarText, { color: colors.sageDeep }]}>D</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.coral }, pressed && styles.pressed]}
          onPress={() => router.push('/add')}
          testID="add-document-button"
        >
          <View style={styles.addIcon}><Feather name="plus" size={23} color={colors.coral} /></View>
          <View style={styles.addCopy}>
            <Text style={styles.addTitle}>Dokument hinzufügen</Text>
            <Text style={styles.addSubtitle}>Foto, PDF oder Datei</Text>
          </View>
          <Feather name="arrow-up-right" size={22} color={colors.white} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Dringende Angelegenheiten</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Was als Nächstes Aufmerksamkeit braucht</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.coralSoft }]}>
            <Text style={[styles.countText, { color: colors.coral }]}>{urgentDocuments.length}</Text>
          </View>
        </View>

        <View style={styles.urgentList}>
          {urgentDocuments.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [styles.urgentCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
              onPress={() => router.push('/documents')}
            >
              <View style={[styles.urgentBar, { backgroundColor: colors.coral }]} />
              <View style={styles.urgentCopy}>
                <Text style={[styles.urgentTitle, { color: colors.navy }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.urgentSender, { color: colors.mutedForeground }]}>{item.sender}</Text>
                <View style={styles.urgentBottom}>
                  <View style={[styles.duePill, { backgroundColor: colors.coralSoft }]}>
                    <Feather name="clock" size={12} color={colors.coral} />
                    <Text style={[styles.dueText, { color: colors.coral }]}>{item.due}</Text>
                  </View>
                  <Text style={[styles.urgentAmount, { color: colors.navy }]}>{item.amount}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Kategorien</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Deine Ablage, übersichtlich sortiert</Text>
          </View>
          <Pressable onPress={() => router.push('/documents')} testID="all-documents-button">
            <Text style={[styles.link, { color: colors.coral }]}>Alle</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {categories.map((category) => {
            const tone = category.tone === 'coral' ? colors.coralSoft : category.tone === 'sun' ? colors.sun : category.tone === 'sage' ? colors.sage : colors.lilac;
            return (
              <Pressable key={category.label} style={({ pressed }) => [styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]} onPress={() => router.push('/documents')}>
                <View style={[styles.categoryIcon, { backgroundColor: tone }]}><Feather name={category.icon} size={17} color={colors.navy} /></View>
                <Text style={[styles.categoryLabel, { color: colors.navy }]}>{category.label}</Text>
                <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>{category.label === 'Versicherungen' ? '8 Dokumente' : category.label === 'Finanzen' ? '5 Dokumente' : '3 Dokumente'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.sectionHeader, { marginTop: 27 }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Zuletzt hinzugefügt</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Deine neuesten Dokumente</Text>
          </View>
          <Pressable onPress={() => router.push('/documents')} testID="recent-documents-button">
            <Text style={[styles.link, { color: colors.coral }]}>Mehr</Text>
          </Pressable>
        </View>
        <View style={styles.latestList}>
          {latest.map((document) => <DocumentRow key={document.id} document={document} colors={colors} />)}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 },
  kicker: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 2, marginBottom: 6 },
  title: { fontSize: 29, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 5 },
  avatarButton: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  addButton: { minHeight: 84, borderRadius: 22, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  addIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  addCopy: { flex: 1, marginLeft: 13 },
  addTitle: { color: '#ffffff', fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  addSubtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: -0.25 },
  sectionSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  countBadge: { minWidth: 29, height: 29, paddingHorizontal: 8, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  urgentList: { gap: 9, marginBottom: 27 },
  urgentCard: { minHeight: 103, borderRadius: 19, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center' },
  urgentBar: { width: 4, height: 59, borderRadius: 3, marginRight: 12 },
  urgentCopy: { flex: 1, marginRight: 5 },
  urgentTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  urgentSender: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: 10 },
  urgentBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  duePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8 },
  dueText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  urgentAmount: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  link: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 3 },
  categoryList: { gap: 10, paddingRight: 20, marginBottom: 1 },
  categoryCard: { width: 138, minHeight: 123, borderRadius: 18, borderWidth: 1, padding: 12 },
  categoryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  categoryLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  categoryCount: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  latestList: { gap: 9 },
  documentRow: { minHeight: 72, borderRadius: 18, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center' },
  documentIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  documentCopy: { flex: 1, marginRight: 7 },
  documentTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  documentSender: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  documentMeta: { alignItems: 'flex-end' },
  amount: { fontSize: 11, fontFamily: 'Inter_700Bold', marginBottom: 5 },
  documentDate: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});