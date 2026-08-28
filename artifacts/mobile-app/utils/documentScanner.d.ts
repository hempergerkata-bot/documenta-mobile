export type NativeScanResult =
  | { status: 'success'; scannedImages: string[] }
  | { status: 'cancel'; scannedImages: string[] }
  | { status: 'unsupported'; scannedImages: [] };

export function scanDocumentPages(): Promise<NativeScanResult>;