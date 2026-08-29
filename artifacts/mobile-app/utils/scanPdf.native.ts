import { Directory, File, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib/cjs/index.js';
import { reconstructScanPage } from '@/utils/scanImageEnhancement';
import {
  selectPageVariant,
  type DocumentVariant,
  type ReconstructionDiagnostics,
} from '@/utils/documentReconstruction';
import {
  MAX_ENHANCED_IMAGE_BYTES,
  MAX_SCAN_PAGES,
} from '@/utils/scanLimits';

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
  selectedVariant: DocumentVariant = 'clean',
) {
  if (pageUris.length === 0) {
    throw new Error('Es wurde keine gescannte Seite gefunden.');
  }
  if (pageUris.length > MAX_SCAN_PAGES) {
    throw new Error(
      `Ein Dokument darf höchstens ${MAX_SCAN_PAGES} hochauflösende Seiten enthalten. Bitte teile den Scan in mehrere Dokumente auf.`,
    );
  }

  const directory = new Directory(Paths.document, 'documenta');
  directory.create({ intermediates: true, idempotent: true });
  const persistentPageUris: string[] = [];
  const persistentBlackWhitePageUris: string[] = [];
  const persistentOriginalPageUris: string[] = [];
  const persistentPageFiles: File[] = [];
  const persistentBlackWhitePageFiles: File[] = [];
  const persistentOriginalPageFiles: File[] = [];
  const temporarySourceFiles: File[] = [];
  const pdfFile = new File(directory, `${documentId}.pdf`);
  const pdf = await PDFDocument.create();
  let enhancedImageBytes = 0;
  const diagnostics: ReconstructionDiagnostics[] = [];
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
      const blackWhitePageFile = new File(directory, `${documentId}-black-white-page-${index + 1}.jpg`);
      if (originalPageFile.exists) originalPageFile.delete();
      if (pageFile.exists) pageFile.delete();
      if (blackWhitePageFile.exists) blackWhitePageFile.delete();

      const normalizedSourceUri = normalizeFileUri(pageUri);
      await copyAsync({ from: normalizedSourceUri, to: originalPageFile.uri });
      if (!originalPageFile.exists) {
        throw new Error(`Das Original der Seite ${index + 1} konnte nicht gespeichert werden.`);
      }
      persistentOriginalPageFiles.push(originalPageFile);
      persistentPageFiles.push(pageFile);
      persistentBlackWhitePageFiles.push(blackWhitePageFile);
      const reconstruction = await reconstructScanPage(
        originalPageFile.uri,
        pageFile.uri,
        blackWhitePageFile.uri,
      );
      diagnostics.push(reconstruction.diagnostics);
      if (!pageFile.exists || !blackWhitePageFile.exists) {
        throw new Error(`Die verbesserte Seite ${index + 1} konnte nicht gespeichert werden.`);
      }

      const selectedFile = selectPageVariant(
        selectedVariant,
        [originalPageFile],
        [pageFile],
        [blackWhitePageFile],
      )[0];
      const bytes = await selectedFile.bytes();
      enhancedImageBytes += bytes.length;
      if (enhancedImageBytes > MAX_ENHANCED_IMAGE_BYTES) {
        throw new Error(
          'Die optimierten Seiten sind für eine zuverlässige PDF-Erstellung zu groß. Bitte teile den Scan in mehrere Dokumente auf.',
        );
      }
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
      persistentBlackWhitePageUris.push(blackWhitePageFile.uri);
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
      pageUris: selectPageVariant(
        selectedVariant,
        persistentOriginalPageUris,
        persistentPageUris,
        persistentBlackWhitePageUris,
      ),
      originalPageUris: persistentOriginalPageUris,
      cleanPageUris: persistentPageUris,
      blackWhitePageUris: persistentBlackWhitePageUris,
      selectedVariant,
      diagnostics,
    };
  } catch (error) {
    deleteFilesBestEffort([
      ...persistentPageFiles,
      ...persistentBlackWhitePageFiles,
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
  blackWhitePageUris: string[] = [],
  cleanPageUris: string[] = [],
) {
  const uris = [...new Set([pdfUri, ...pageUris, ...originalPageUris, ...blackWhitePageUris, ...cleanPageUris])].filter(
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