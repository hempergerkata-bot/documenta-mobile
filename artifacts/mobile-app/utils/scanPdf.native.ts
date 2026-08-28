import { Directory, File, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib/cjs/index.js';
import { enhanceScanPage } from '@/utils/scanImageEnhancement';

function normalizeFileUri(uri: string) {
  if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
  return `file://${uri}`;
}

function getImageExtension(uri: string) {
  return uri.toLowerCase().split('?')[0].endsWith('.png') ? 'png' : 'jpg';
}

export async function createPersistentScannedDocument(
  pageUris: string[],
  documentId: string,
) {
  if (pageUris.length === 0) {
    throw new Error('Es wurde keine gescannte Seite gefunden.');
  }

  const directory = new Directory(Paths.document, 'documenta');
  directory.create({ intermediates: true, idempotent: true });
  const persistentPageUris: string[] = [];
  const persistentOriginalPageUris: string[] = [];
  const persistentPageFiles: File[] = [];
  const persistentOriginalPageFiles: File[] = [];
  const temporarySourceFiles: File[] = [];
  const pdfFile = new File(directory, `${documentId}.pdf`);
  const pdf = await PDFDocument.create();
  pdf.setTitle('Documenta Scan');
  pdf.setCreator('Documenta');

  try {
    for (const [index, pageUri] of pageUris.entries()) {
      const extension = getImageExtension(pageUri);
      const originalPageFile = new File(
        directory,
        `${documentId}-original-page-${index + 1}.${extension}`,
      );
      const pageFile = new File(directory, `${documentId}-page-${index + 1}.jpg`);
      if (originalPageFile.exists) originalPageFile.delete();
      if (pageFile.exists) pageFile.delete();

      const normalizedSourceUri = normalizeFileUri(pageUri);
      await copyAsync({ from: normalizedSourceUri, to: originalPageFile.uri });
      if (!originalPageFile.exists) {
        throw new Error(`Das Original der Seite ${index + 1} konnte nicht gespeichert werden.`);
      }
      persistentOriginalPageFiles.push(originalPageFile);
      persistentPageFiles.push(pageFile);
      await enhanceScanPage(originalPageFile.uri, pageFile.uri);
      if (!pageFile.exists) {
        throw new Error(`Die verbesserte Seite ${index + 1} konnte nicht gespeichert werden.`);
      }

      const bytes = await pageFile.bytes();
      const image = await pdf.embedJpg(bytes);
      const pageWidth = 595;
      const pageHeight = 842;
      const scale = Math.min(pageWidth / image.width, pageHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const page = pdf.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
      });
      persistentPageUris.push(pageFile.uri);
      persistentOriginalPageUris.push(originalPageFile.uri);
      if (normalizedSourceUri.startsWith('file://')) {
        temporarySourceFiles.push(new File(normalizedSourceUri));
      }
    }

    if (pdfFile.exists) pdfFile.delete();
    pdfFile.write(await pdf.save());
    if (!pdfFile.exists) {
      throw new Error('Die PDF-Datei konnte nicht dauerhaft gespeichert werden.');
    }

    deleteFilesBestEffort(temporarySourceFiles);
    return {
      pdfUri: pdfFile.uri,
      pageUris: persistentPageUris,
      originalPageUris: persistentOriginalPageUris,
    };
  } catch (error) {
    deleteFilesBestEffort([
      ...persistentPageFiles,
      ...persistentOriginalPageFiles,
      pdfFile,
    ]);
    throw error;
  }
}

export function deleteTemporaryScanPages(pageUris: string[]) {
  const appOwnedFiles = pageUris
    .map(normalizeFileUri)
    .filter((uri) => uri.startsWith('file://'))
    .map((uri) => new File(uri));
  deleteFilesBestEffort(appOwnedFiles);
}

export function deletePersistentScannedDocument(
  pdfUri?: string,
  pageUris: string[] = [],
  originalPageUris: string[] = [],
) {
  const uris = [pdfUri, ...pageUris, ...originalPageUris].filter(
    (uri): uri is string => !!uri && uri.startsWith(Paths.document.uri),
  );
  deleteFilesBestEffort(uris.map((uri) => new File(uri)));
}

function deleteFilesBestEffort(files: File[]) {
  for (const file of files) {
    try {
      if (file.exists) file.delete();
    } catch {
      // Cleanup must never invalidate an otherwise successful scan.
    }
  }
}