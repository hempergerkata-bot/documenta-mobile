import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PDFDocument, StandardFonts } from 'pdf-lib/cjs/index.js';
import { Platform } from 'react-native';
import { createExportPagePlan, standardFontLabel, TOC_ROWS_PER_PAGE, tocTitleForStandardFont } from './exportPdfPackageCore';
import type { ExportPdfPackageErrorCode, ExportPdfPackageOptions, ExportPdfPackageResult } from './exportPdfPackage';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

function fail(code: ExportPdfPackageErrorCode): never {
  const error = new Error(code) as Error & { code: ExportPdfPackageErrorCode };
  error.code = code;
  throw error;
}

function safeFilename(value?: string) {
  const stem = (value ?? 'documenta-export').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'documenta-export';
  return `${stem.replace(/\.pdf$/i, '')}.pdf`;
}

export async function exportPdfPackage(options: ExportPdfPackageOptions): Promise<ExportPdfPackageResult> {
  if (!options.documents.length) fail('NO_DOCUMENTS');
  if (Platform.OS !== 'android' && !(await Sharing.isAvailableAsync())) fail('SHARING_UNAVAILABLE');

  const sources: PDFDocument[] = [];
  for (const document of options.documents) {
    try {
      const file = new File(document.uri);
      if (!file.exists) fail('SOURCE_UNAVAILABLE');
      sources.push(await PDFDocument.load(await file.bytes()));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) throw error;
      fail('SOURCE_INVALID');
    }
  }

  const plan = createExportPagePlan(sources.map((source) => source.getPageCount()), options.includeToc);
  const pdf = await PDFDocument.create();
  pdf.setTitle('Documenta Export');
  pdf.setCreator('Documenta');
  if (options.includeToc) {
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const canEncode = (value: string) => {
      try { regular.encodeText(value); return true; } catch { return false; }
    };
    options.documents.forEach((document, index) => {
      if (index % TOC_ROWS_PER_PAGE === 0) {
        const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        const heading = index === 0 ? options.labels.tocTitle : options.labels.tocContinuationTitle;
        page.drawText(standardFontLabel(heading, 'Table of contents', canEncode), { x: 48, y: PAGE_HEIGHT - 60, size: 18, font: bold });
      }
      const page = pdf.getPages()[pdf.getPageCount() - 1];
      const row = index % TOC_ROWS_PER_PAGE;
      const label = tocTitleForStandardFont(document.title, index, options.labels.documentLabel, canEncode);
      page.drawText(`${index + 1}. ${label}`.slice(0, 76), { x: 54, y: PAGE_HEIGHT - 98 - row * 18, size: 10, font: regular });
      page.drawText(String(plan.documentStartPages[index]), { x: PAGE_WIDTH - 70, y: PAGE_HEIGHT - 98 - row * 18, size: 10, font: regular });
    });
  }
  for (const source of sources) {
    const pages = await pdf.copyPages(source, source.getPageIndices());
    pages.forEach((page) => pdf.addPage(page));
  }

  try {
    const directory = new Directory(Paths.document, 'documenta', 'exports');
    directory.create({ intermediates: true, idempotent: true });
    const destination = new File(directory, `${Date.now()}-${safeFilename(options.filename)}`);
    if (destination.exists) destination.delete();
    destination.write(await pdf.save());
    if (!destination.exists) fail('FILE_WRITE_FAILED');
    if (Platform.OS === 'android') {
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) fail('FILE_WRITE_FAILED');
      const exportedUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permission.directoryUri,
        safeFilename(options.filename),
        'application/pdf',
      );
      const base64 = await FileSystem.readAsStringAsync(destination.uri, { encoding: FileSystem.EncodingType.Base64 });
      await FileSystem.writeAsStringAsync(exportedUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      return { filename: safeFilename(options.filename), uri: exportedUri };
    }
    await Sharing.shareAsync(destination.uri, { dialogTitle: options.labels.shareDialogTitle, mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    return { filename: safeFilename(options.filename), uri: destination.uri };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) throw error;
    fail('EXPORT_FAILED');
  }
}