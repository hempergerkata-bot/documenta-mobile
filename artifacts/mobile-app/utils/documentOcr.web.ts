import {
  analyzeGermanDocumentText,
} from '@/utils/documentAnalysis';
import {
  aggregateOcrPageStatus,
  createOcrPageResult,
  formatOcrPageText,
} from '@/utils/ocrPageAggregation';
import type { DocumentOcrResult } from '@/utils/documentOcr';

export async function recognizeAndAnalyzeDocument(
  pageUris: string[] = [],
): Promise<DocumentOcrResult> {
  // Browser builds do not ship a local OCR engine. Preserve each page's
  // position and make the unavailable recognition explicit rather than
  // reporting an empty OCR result.
  const pageResults = pageUris.map((_, pageIndex) =>
    createOcrPageResult(pageIndex, '', ['failed']),
  );
  return {
    ...analyzeGermanDocumentText(formatOcrPageText(pageResults)),
    ocrStatus: aggregateOcrPageStatus(pageResults),
    pageResults,
  };
}