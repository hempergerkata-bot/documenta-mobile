import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function DocumentPdfPreview({ uri }: { uri: string }) {
  const [error, setError] = useState('');
  let Pdf: typeof import('react-native-pdf').default;
  try {
    Pdf = require('react-native-pdf').default;
  } catch {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>PDF-Vorschau nicht verfügbar</Text>
        <Text style={styles.fallbackText}>Öffne das Dokument in der installierten Documenta-App.</Text>
      </View>
    );
  }

  return (
    <View style={styles.preview} testID="document-pdf-preview">
      <Pdf
        source={{ uri, cache: false }}
        style={styles.preview}
        trustAllCerts={false}
        onError={(caught) => setError(String(caught))}
      />
      {error ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.fallbackTitle}>PDF konnte nicht angezeigt werden</Text>
          <Text style={styles.fallbackText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { flex: 1, backgroundColor: '#ffffff' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' },
  fallbackTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#13263d', textAlign: 'center' },
  fallbackText: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular', color: '#667384', textAlign: 'center', marginTop: 7 },
  errorOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' },
});