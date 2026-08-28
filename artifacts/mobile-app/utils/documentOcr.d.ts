import { DocumentAnalysisResult } from '@/utils/documentAnalysis';

export function recognizeAndAnalyzeDocument(
  pageUris: string[],
  originalPageUris?: string[],
): Promise<DocumentAnalysisResult>;