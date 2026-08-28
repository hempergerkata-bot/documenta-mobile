import type { ResponseType } from 'react-native-document-scanner-plugin';
import { MAX_SCAN_PAGES } from '@/utils/scanLimits';

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
    maxNumDocuments: MAX_SCAN_PAGES,
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