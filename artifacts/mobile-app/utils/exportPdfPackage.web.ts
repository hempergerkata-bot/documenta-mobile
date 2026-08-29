import { PDFDocument, StandardFonts } from 'pdf-lib/cjs/index.js';
import { createExportPagePlan, standardFontLabel, TOC_ROWS_PER_PAGE, tocTitleForStandardFont } from './exportPdfPackageCore';
import type { ExportPdfPackageErrorCode, ExportPdfPackageOptions, ExportPdfPackageResult } from './exportPdfPackage';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
function fail(code: ExportPdfPackageErrorCode): never { const error = new Error(code) as Error & { code: ExportPdfPackageErrorCode }; error.code = code; throw error; }
function safeFilename(value?: string) { const stem = (value ?? 'documenta-export').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'documenta-export'; return `${stem.replace(/\.pdf$/i, '')}.pdf`; }

export async function exportPdfPackage(options: ExportPdfPackageOptions): Promise<ExportPdfPackageResult> {
  if (!options.documents.length) fail('NO_DOCUMENTS');
  const sources: PDFDocument[] = [];
  for (const document of options.documents) {
    try {
      const response = await fetch(document.uri);
      if (!response.ok) fail('SOURCE_FETCH_FAILED');
      sources.push(await PDFDocument.load(await response.arrayBuffer()));
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
    const canEncode = (value: string) => { try { regular.encodeText(value); return true; } catch { return false; } };
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
  for (const source of sources) (await pdf.copyPages(source, source.getPageIndices())).forEach((page) => pdf.addPage(page));
  try {
    const filename = safeFilename(options.filename);
    const outputBytes = await pdf.save();
    const url = URL.createObjectURL(new Blob([new Uint8Array(outputBytes).buffer], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.style.display = 'none';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return { filename };
  } catch { return fail('EXPORT_FAILED'); }
}