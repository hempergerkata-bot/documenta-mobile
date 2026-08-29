import { DocumentAnalysisResult } from '@/utils/documentAnalysis';
import type {
  OcrDocumentStatus,
  OcrPageResult,
  OcrPageStatus,
} from '@/utils/ocrPageAggregation';

export type { OcrDocumentStatus, OcrPageResult, OcrPageStatus };

export type DocumentOcrResult = DocumentAnalysisResult & {
  ocrStatus: OcrDocumentStatus;
  pageResults: OcrPageResult[];
};

export function recognizeAndAnalyzeDocument(
  pageUris: string[],
  originalPageUris?: string[],
): Promise<DocumentOcrResult>;