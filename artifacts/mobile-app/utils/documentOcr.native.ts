import TextRecognition, {
  TextRecognitionScript,
} from '@react-native-ml-kit/text-recognition';
import {
  analyzeGermanDocumentText,
} from '@/utils/documentAnalysis';
import { mergeComplementaryOcrText } from '@/utils/ocrTextSelection';
import {
  aggregateOcrPageStatus,
  createOcrPageResult,
  formatOcrPageText,
  type OcrPageStatus,
} from '@/utils/ocrPageAggregation';
import type {
  DocumentOcrResult,
} from '@/utils/documentOcr';

async function recognizePage(pageUri?: string): Promise<{
  text: string;
  status: OcrPageStatus;
}> {
  if (!pageUri) return { text: '', status: 'empty' };
  try {
    const result = await TextRecognition.recognize(
      pageUri,
      TextRecognitionScript.LATIN,
    );
    const text = result.text.trim();
    return { text, status: text ? 'complete' : 'empty' };
  } catch {
    return { text: '', status: 'failed' };
  }
}

export async function recognizeAndAnalyzeDocument(
  pageUris: string[],
  originalPageUris: string[] = [],
): Promise<DocumentOcrResult> {
  const pageResults = [];
  for (const [pageIndex, pageUri] of pageUris.entries()) {
    const optimized = await recognizePage(pageUri);
    const original = originalPageUris[pageIndex]
      ? await recognizePage(originalPageUris[pageIndex])
      : undefined;
    const selectedText = mergeComplementaryOcrText(
      optimized.text,
      original?.text ?? '',
    );
    pageResults.push(
      createOcrPageResult(pageIndex, selectedText, [
        optimized.status,
        ...(original ? [original.status] : []),
      ]),
    );
  }
  return {
    ...analyzeGermanDocumentText(formatOcrPageText(pageResults)),
    ocrStatus: aggregateOcrPageStatus(pageResults),
    pageResults,
  };
}