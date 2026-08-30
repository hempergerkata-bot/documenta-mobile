import { Feather } from '@expo/vector-icons';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const installOrigin = process.env.EXPO_PUBLIC_API_ORIGIN || process.env.EXPO_PUBLIC_DOMAIN;
const APK_URL = installOrigin
  ? `https://${installOrigin.replace(/^https?:\/\//i, '').replace(/\/+$/, '')}/api/install/documenta/latest`
  : '';

export default function InstallScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const openDownload = () => {
    if (APK_URL) void Linking.openURL(APK_URL);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.background }]}
      contentContainerStyle={[
        styles.page,
        { paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 24 },
      ]}
    >
      <View style={styles.brand}>
        <View style={[styles.brandMark, { backgroundColor: c.coral }]} />
        <Text style={[styles.brandName, { color: c.navy }]}>Documenta</Text>
      </View>

      <Text style={[styles.eyebrow, { color: c.coral }]}>ANDROID TESZTELEPÍTÉS</Text>
      <Text style={[styles.title, { color: c.navy }]}>Documenta Android APK</Text>
      <Text style={[styles.lede, { color: c.mutedForeground }]}>
        Ez a Documenta belső tesztverziója Samsung és más ARM64 Android készülékekre.
        A JavaScript bundle be van építve, Metro és QR-kód nélkül indul.
      </Text>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.badge, { backgroundColor: c.sage }]}>
          <Feather name="shield" size={14} color={c.sageDeep} />
          <Text style={[styles.badgeText, { color: c.sageDeep }]}>INTERNAL DISTRIBUTION</Text>
        </View>

        <Text style={[styles.cardTitle, { color: c.navy }]}>1. Töltsd le az APK-t</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Samsung APK letöltése"
          onPress={openDownload}
          style={({ pressed }) => [
            styles.download,
            { backgroundColor: c.navy, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="download" size={19} color={c.white} />
          <Text style={[styles.downloadText, { color: c.white }]}>Samsung APK letöltése</Text>
        </Pressable>
        <Text style={[styles.hint, { color: c.mutedForeground }]}>
           A gomb a Documenta ellenőrzött, időkorlátos telepítési oldalára visz. Innen töltsd le
           az APK-t, majd nyisd meg a Letöltések mappából.
        </Text>

        <View style={[styles.details, { borderTopColor: c.border }]}>
           <Detail label="Build" value="268579c5" color={c} />
          <Detail label="Méret" value="107,5 MB" color={c} />
          <Detail label="Csomag" value="com.documenta.app" color={c} />
          <Detail label="Verzió" value="1.0.0 (1)" color={c} />
        </View>

        <Text style={[styles.cardTitle, { color: c.navy, marginTop: 24 }]}>2. Telepítsd a Samsungon</Text>
        <View style={styles.steps}>
          <Step number="1" text="Nyisd meg a letöltés értesítését vagy a Saját fájlok → Letöltések mappát." color={c} />
          <Step number="2" text="Ha a Samsung blokkolja, engedélyezd a böngésző számára az ismeretlen alkalmazások telepítését." color={c} />
          <Step number="3" text="Nyisd meg az APK-t, majd erősítsd meg a telepítést." color={c} />
          <Step number="4" text="Telepítés után kapcsold vissza az ismeretlen alkalmazások engedélyét." color={c} />
        </View>
      </View>

      <View style={[styles.notice, { backgroundColor: c.coralSoft }]}>
        <Feather name="info" size={17} color={c.coral} />
        <Text style={[styles.noticeText, { color: c.navy }]}>
          Ez nem Play Store-verzió, hanem belső tesztbuild. Csak az engedélyezett tesztkészüléken használd.
        </Text>
      </View>

      <Text style={[styles.footer, { color: c.mutedForeground }]}>
         Samsung ARM64 internal build · EAS build 268579c5
      </Text>
    </ScrollView>
  );
}

function Detail({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color: color.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: color.navy }]}>{value}</Text>
    </View>
  );
}

function Step({
  number,
  text,
  color,
}: {
  number: string;
  text: string;
  color: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: color.coralSoft }]}>
        <Text style={[styles.stepNumberText, { color: color.coral }]}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: color.navy }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 48 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 44 },
  brandMark: { width: 16, height: 16, borderRadius: 5, transform: [{ rotate: '14deg' }] },
  brandName: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2, marginBottom: 10 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 38, marginBottom: 14 },
  lede: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 25, marginBottom: 28 },
  card: { borderWidth: 1, borderRadius: 22, padding: 20 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 20 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.7 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 26, marginBottom: 14 },
  download: { minHeight: 58, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  downloadText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 13 },
  details: { borderTopWidth: 1, marginTop: 22, paddingTop: 17, gap: 13 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  detailLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  detailValue: { flex: 1, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  steps: { gap: 14 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  stepNumber: { width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  stepText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 15, marginTop: 18 },
  noticeText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  footer: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 20 },
});