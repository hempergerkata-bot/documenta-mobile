import { DocumentAnalysisResult } from '@/utils/documentAnalysis';

export function recognizeAndAnalyzeDocument(
  pageUris: string[],
): Promise<DocumentAnalysisResult>;