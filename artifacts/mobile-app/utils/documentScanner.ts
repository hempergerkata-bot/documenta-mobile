import type { ResponseType } from 'react-native-document-scanner-plugin';

export type NativeScanResult =
  | { status: 'success'; scannedImages: string[] }
  | { status: 'cancel'; scannedImages: string[] }
  | { status: 'unsupported'; scannedImages: [] };

export async function scanDocumentPages(): Promise<NativeScanResult> {
  const { default: DocumentScanner } = await import(
    'react-native-document-scanner-plugin'
  );
  const result = await DocumentScanner.scanDocument({
    croppedImageQuality: 100,
    maxNumDocuments: 50,
    responseType: 'imageFilePath' as ResponseType,
  });

  const scannedImages = result.scannedImages ?? [];
  return {
    status:
      result.status === 'success'
        ? 'success'
        : 'cancel',
    scannedImages,
  };
}