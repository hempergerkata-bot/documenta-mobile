export type OcrPageStatus = 'complete' | 'empty' | 'failed';
export type OcrDocumentStatus = OcrPageStatus | 'partial';

export type OcrPageResult = {
  pageIndex: number;
  status: OcrPageStatus;
  text: string;
};

export function createOcrPageResult(
  pageIndex: number,
  text: string,
  recognitionStatuses: readonly OcrPageStatus[],
): OcrPageResult {
  const normalizedText = text.trim();
  return {
    pageIndex,
    text: normalizedText,
    status: normalizedText
      ? 'complete'
      : recognitionStatuses.includes('failed')
        ? 'failed'
        : 'empty',
  };
}

export function aggregateOcrPageStatus(
  pageResults: readonly OcrPageResult[],
): OcrDocumentStatus {
  if (pageResults.length === 0) return 'empty';
  if (pageResults.every((page) => page.status === 'complete')) return 'complete';
  if (pageResults.some((page) => page.status === 'complete')) return 'partial';
  return pageResults.every((page) => page.status === 'empty') ? 'empty' : 'failed';
}

export function formatOcrPageText(pageResults: readonly OcrPageResult[]) {
  return pageResults
    .map((page) => `--- Seite ${page.pageIndex + 1} ---\n${page.text}`)
    .join('\n\n');
}