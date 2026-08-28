export function createPersistentScannedDocument(
  pageUris: string[],
  documentId: string,
): Promise<{ pdfUri: string; pageUris: string[] }>;

export function deleteTemporaryScanPages(pageUris: string[]): void;

export function deletePersistentScannedDocument(
  pdfUri?: string,
  pageUris?: string[],
): void;