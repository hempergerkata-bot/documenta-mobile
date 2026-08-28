import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function assertPdfUri(uri?: string) {
  if (!uri) throw new Error('Für dieses Dokument ist keine PDF-Datei verfügbar.');
  return uri;
}

export async function shareDocumentPdf(uri?: string) {
  const pdfUri = assertPdfUri(uri);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  }
  await Sharing.shareAsync(pdfUri, {
    dialogTitle: 'Dokument teilen',
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}

export async function exportDocumentPdf(uri?: string) {
  const pdfUri = assertPdfUri(uri);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('PDF-Export ist auf diesem Gerät nicht verfügbar.');
  }
  await Sharing.shareAsync(pdfUri, {
    dialogTitle: 'PDF exportieren oder speichern',
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}

export async function printDocumentPdf(uri?: string) {
  await Print.printAsync({ uri: assertPdfUri(uri) });
}