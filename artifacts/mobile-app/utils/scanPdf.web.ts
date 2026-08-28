export async function createPersistentScannedDocument(): Promise<never> {
  throw new Error('Der native Dokumentenscanner ist im Web nicht verfügbar.');
}

export function deleteTemporaryScanPages() {}

export function deletePersistentScannedDocument() {}