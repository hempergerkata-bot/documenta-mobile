export function createPersistentScannedDocument(
  pageUris: string[],
  documentId: string,
  selectedVariant?: import('./documentReconstruction').DocumentVariant,
): Promise<{
  pdfUri: string;
  pageUris: string[];
  originalPageUris: string[];
  cleanPageUris: string[];
  blackWhitePageUris: string[];
  selectedVariant: import('./documentReconstruction').DocumentVariant;
  diagnostics: import('./documentReconstruction').ReconstructionDiagnostics[];
}>;

export function deleteTemporaryScanPages(pageUris: string[]): void;

export function deletePersistentScannedDocument(
  pdfUri?: string,
  pageUris?: string[],
  originalPageUris?: string[],
  blackWhitePageUris?: string[],
  cleanPageUris?: string[],
): void;